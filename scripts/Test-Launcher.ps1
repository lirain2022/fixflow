$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'FixFlow.Launcher.ps1')
function Assert($condition,$message){if(!$condition){throw $message}}
$root=Split-Path $PSScriptRoot
Assert ((Resolve-FixFlowRoot $root) -eq [IO.Path]::GetFullPath($root)) 'Root resolution failed'
$failed=$false;try{Resolve-FixFlowRoot $env:TEMP}catch{$failed=$true};Assert $failed 'Must reject a directory without project files'
$script:stopped=@()
function taskkill.exe { $script:stopped+=@($args);$global:LASTEXITCODE=0 }
$entry=[pscustomobject]@{Pid=$PID;StartedAt='2000-01-01T00:00:00Z'}
Assert (!(Test-FixFlowWorker $entry)) 'A reused process ID must not count as our worker'
Stop-FixFlowWorker $entry;Assert ($script:stopped.Count -eq 0) 'Must not stop a reused PID'
$entry.StartedAt=(Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')
Assert (Test-FixFlowWorker $entry) 'Matching worker identity must be recognized'
Stop-FixFlowWorker $entry;Assert (($script:stopped -join ' ') -eq "/PID $PID /T /F") 'Must stop only the recorded worker tree'
# Ensure port collision fails before tools, install, worker launch or state changes.
function Test-FixFlowPort($port){return $true}
function Get-FixFlowTools{throw 'Tools must not be checked before occupied-port rejection'}
$failed=$false;try{Assert-FixFlowPortsFree}catch{$failed=$_.Exception.Message -match '8080|5175'};Assert $failed 'Occupied ports must be rejected'
Write-Host 'Launcher behavior checks passed (root, descendant scope, PID reuse, port conflict).'

$fixture=Join-Path $root ('.fixflow/test-'+[guid]::NewGuid().ToString('N'))
foreach($directory in @('scripts','frontend','.fixflow')){New-Item -ItemType Directory -Path (Join-Path $fixture $directory) -Force | Out-Null}
foreach($file in @('pom.xml','mvnw.cmd','frontend/package-lock.json','scripts/Run-FixFlowService.ps1')){Set-Content -LiteralPath (Join-Path $fixture $file) -Value ''}
$script:stopped=@()
@{Root=$root;Backend=$entry;Frontend=$null} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $fixture '.fixflow/processes.json')
Invoke-FixFlowLauncher $fixture 'Stop'
Assert ($script:stopped.Count -eq 0) 'A copied project must not stop the original workers'

$script:shortcut=[pscustomobject]@{TargetPath='';Arguments='';WorkingDirectory='';Description=''}
$script:shortcut | Add-Member ScriptMethod Save {}
$script:shell=[pscustomobject]@{}
$script:shell | Add-Member ScriptMethod CreateShortcut {param($path);return $script:shortcut}
function New-Object {param($ComObject);return $script:shell}
function Test-Path {param($LiteralPath);return $false}
New-FixFlowShortcut $root
Assert ($script:shortcut.Arguments -match '-PauseOnError') 'Shortcut must keep errors visible'
Write-Host 'Copied-project ownership and shortcut error visibility checks passed.'
