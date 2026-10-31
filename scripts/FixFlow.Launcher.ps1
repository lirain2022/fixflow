function Resolve-FixFlowRoot([string]$Root){
 $resolved=[IO.Path]::GetFullPath($Root).TrimEnd('\')
 foreach($file in @('pom.xml','mvnw.cmd','frontend/package-lock.json','scripts/Run-FixFlowService.ps1')){if(!(Test-Path -LiteralPath (Join-Path $resolved $file))){throw "Project file missing: $file. Extract the complete GitHub ZIP first."}}
 return $resolved
}
function Test-FixFlowPort([int]$Port){
 $client=[Net.Sockets.TcpClient]::new()
 try{$client.Connect('127.0.0.1',$Port);return $true}catch{return $false}finally{$client.Dispose()}
}
function Assert-FixFlowPortsFree {
 foreach($port in @(8080,5175)){if(Test-FixFlowPort $port){throw "Port $port is already in use. Close the existing system before opening this copy. No existing process was stopped."}}
}
function Test-FixFlowWorker($Entry){
 if(!$Entry){return $false}
 try{$process=Get-Process -Id ([int]$Entry.Pid) -ErrorAction Stop;return $process.StartTime.ToUniversalTime().ToString('o') -eq [string]$Entry.StartedAt}catch{return $false}
}
function Stop-FixFlowWorker($Entry){
 if(Test-FixFlowWorker $Entry){
  # PID plus creation time prevents stopping an unrelated process that reused the PID.
  & taskkill.exe /PID ([int]$Entry.Pid) /T /F | Out-Null
  if($LASTEXITCODE -ne 0 -and (Test-FixFlowWorker $Entry)){throw "Could not stop the managed process $($Entry.Pid)."}
 }
}
function Get-FixFlowTools {
 $javaHomes=@($env:JAVA_HOME)
 $javac=Get-Command javac.exe -ErrorAction SilentlyContinue
 if($javac){$javaHomes+=Split-Path (Split-Path $javac.Source)}
 $adoptium=Join-Path $env:ProgramFiles 'Eclipse Adoptium'
 if(Test-Path -LiteralPath $adoptium){$javaHomes+=@(Get-ChildItem -LiteralPath $adoptium -Directory | Where-Object Name -like 'jdk-21*' | ForEach-Object FullName)}
 $jdk=$null
 foreach($candidate in $javaHomes){if(!$candidate){continue};$compiler=Join-Path $candidate 'bin/javac.exe';if(!(Test-Path -LiteralPath $compiler)){continue};$oldPreference=$ErrorActionPreference;$ErrorActionPreference='Continue';$version=(& $compiler -version 2>&1 | Out-String);$ErrorActionPreference=$oldPreference;if($version -match 'javac 21[.\s]'){$jdk=$candidate;break}}
 if(!$jdk){throw 'Install Java JDK 21 (including javac), then open this launcher again.'}
 $node=Get-Command node.exe -ErrorAction SilentlyContinue
 if(!$node){throw 'Install Node.js 24.15 or newer, including npm, then open this launcher again.'}
 $nodeVersion=[version](& $node.Source -p 'process.versions.node')
 if($LASTEXITCODE -ne 0 -or $nodeVersion -lt [version]'24.15.0'){throw "Node.js 24.15 or newer is required. Found: $nodeVersion"}
 $npm=Join-Path (Split-Path $node.Source) 'npm.cmd'
 if(!(Test-Path -LiteralPath $npm)){throw 'npm.cmd is missing. Reinstall Node.js with npm.'}
 return @{JavaHome=$jdk;Node=$node.Source;Npm=$npm;NodeVersion=$nodeVersion.ToString()}
}
function Install-FixFlowDependencies([string]$Root,$Tools){
 $frontend=Join-Path $Root 'frontend';$stamp=Join-Path $Root '.fixflow/dependencies.sha256'
 $hash=(Get-FileHash -LiteralPath (Join-Path $frontend 'package-lock.json')).Hash
 $saved=if(Test-Path -LiteralPath $stamp){(Get-Content -LiteralPath $stamp -Raw).Trim()}else{''}
 if($hash -eq $saved -and (Test-Path -LiteralPath (Join-Path $frontend 'node_modules/vite/bin/vite.js'))){return}
 Write-Host 'Installing frontend dependencies (internet required on first launch)...'
 Push-Location -LiteralPath $frontend
 try{& $Tools.Npm ci;if($LASTEXITCODE -ne 0){throw 'npm ci failed. Check the connection and the error above; no services were started.'}}finally{Pop-Location}
 [IO.File]::WriteAllText($stamp,$hash)
}
function Start-FixFlowWorker([string]$Root,[string]$Service,[string]$Logs){
 $worker=Join-Path $Root 'scripts/Run-FixFlowService.ps1'
 $arguments='-NoProfile -ExecutionPolicy Bypass -File "'+$worker+'" -ProjectRoot "'+$Root+'" -Service '+$Service
 $process=Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList $arguments -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $Logs "$Service.log") -RedirectStandardError (Join-Path $Logs "$Service-error.log") -PassThru
 return [pscustomobject]@{Pid=$process.Id;StartedAt=$process.StartTime.ToUniversalTime().ToString('o')}
}
function Test-FixFlowReady {
 try{$backend=Invoke-WebRequest 'http://127.0.0.1:8080/hello' -UseBasicParsing -TimeoutSec 3;$frontend=Invoke-WebRequest 'http://127.0.0.1:5175/member.html' -UseBasicParsing -TimeoutSec 3;return $backend.StatusCode -eq 200 -and $backend.Content.Trim() -eq 'Hello TaskFlow!' -and $frontend.StatusCode -eq 200 -and $frontend.Content.Contains('/src/member/main.jsx')}catch{return $false}
}
function New-FixFlowShortcut([string]$Root){
 $desktop=[Environment]::GetFolderPath('Desktop');$path=Join-Path $desktop 'FixFlow.lnk'
 $shell=New-Object -ComObject WScript.Shell;$shortcut=$shell.CreateShortcut($path)
 $script=Join-Path $Root 'scripts/Start-FixFlow.ps1'
 $arguments='-NoProfile -ExecutionPolicy Bypass -File "'+$script+'" -PauseOnError'
 if((Test-Path -LiteralPath $path) -and $shortcut.Arguments -ne $arguments){throw 'A different FixFlow desktop shortcut already exists. Rename it before creating this shortcut.'}
 $shortcut.TargetPath=Join-Path $PSHOME 'powershell.exe';$shortcut.Arguments=$arguments;$shortcut.WorkingDirectory=$Root;$shortcut.Description='Open the FixFlow homepage';$shortcut.Save()
 Write-Host "Desktop shortcut created: $path"
}
function Invoke-FixFlowLauncher([string]$Root,[string]$Action='Start',[int]$TimeoutSeconds=300,[switch]$NoBrowser){
 $Root=Resolve-FixFlowRoot $Root
 if($Action -eq 'Shortcut'){New-FixFlowShortcut $Root;return}
 if($Action -eq 'Check'){$tools=Get-FixFlowTools;Write-Host "READY: Java 21, Node $($tools.NodeVersion). Project: $Root";return}
 $runtime=Join-Path $Root '.fixflow';New-Item -ItemType Directory -Force -Path $runtime | Out-Null
 $statePath=Join-Path $runtime 'processes.json';$guard=$null;$state=$null;$starting=$false
 try{
  try{$guard=[IO.File]::Open((Join-Path $runtime 'launcher.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)}catch{throw 'Another launcher is already running. Please wait for it to finish.'}
  if(Test-Path -LiteralPath $statePath){
   $state=Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
   if([string]$state.Root -ne $Root){Write-Host 'Ignoring process records from a different project location.';$state=$null}
  }
  if($Action -eq 'Stop'){Stop-FixFlowWorker $state.Backend;Stop-FixFlowWorker $state.Frontend;if(Test-Path -LiteralPath $statePath){Remove-Item -LiteralPath $statePath};Write-Host 'FixFlow stopped. Your data is preserved.';return}
  if((Test-FixFlowWorker $state.Backend) -and (Test-FixFlowWorker $state.Frontend) -and (Test-FixFlowReady)){if(!$NoBrowser){Start-Process 'http://127.0.0.1:5175/'};Write-Host 'FixFlow is already running.';return}
  Stop-FixFlowWorker $state.Backend;Stop-FixFlowWorker $state.Frontend
  Assert-FixFlowPortsFree
  $tools=Get-FixFlowTools;$env:JAVA_HOME=$tools.JavaHome;$env:Path=(Join-Path $tools.JavaHome 'bin')+';'+(Split-Path $tools.Node)+';'+$env:Path
  Install-FixFlowDependencies $Root $tools
  $logs=Join-Path $runtime ('logs/'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'));New-Item -ItemType Directory -Force -Path $logs | Out-Null
  $state=[pscustomobject]@{Root=$Root;Backend=$null;Frontend=$null};$starting=$true
  $state.Backend=Start-FixFlowWorker $Root 'backend' $logs;$state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
  $state.Frontend=Start-FixFlowWorker $Root 'frontend' $logs;$state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
  Write-Host 'Starting FixFlow. First startup may download Maven dependencies. Please wait...'
  Write-Host "Logs: $logs"
  $deadline=(Get-Date).AddSeconds($TimeoutSeconds)
  do{
   if(!(Test-FixFlowWorker $state.Backend) -or !(Test-FixFlowWorker $state.Frontend)){throw "A service stopped. See logs: $logs"}
   if(Test-FixFlowReady){$starting=$false;if(!$NoBrowser){Start-Process 'http://127.0.0.1:5175/'};Write-Host 'READY: http://127.0.0.1:5175/' -ForegroundColor Green;return}
   Start-Sleep -Seconds 2
  }while((Get-Date) -lt $deadline)
  throw "Startup timed out. Check the logs and internet connection: $logs"
 }catch{
  if($starting){Stop-FixFlowWorker $state.Backend;Stop-FixFlowWorker $state.Frontend}
  throw
 }finally{if($guard){$guard.Dispose()}}
}
