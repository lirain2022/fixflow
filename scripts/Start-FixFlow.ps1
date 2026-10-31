param([ValidateSet('Start','Stop','Shortcut','Check')][string]$Action='Start',[ValidateRange(10,1800)][int]$TimeoutSeconds=300,[switch]$PauseOnError,[switch]$NoBrowser)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'FixFlow.Launcher.ps1')
try{Invoke-FixFlowLauncher -Root (Split-Path $PSScriptRoot) -Action $Action -TimeoutSeconds $TimeoutSeconds -NoBrowser:$NoBrowser}catch{Write-Host $_.Exception.Message -ForegroundColor Red;if($PauseOnError){Read-Host 'Press Enter to close'};exit 1}
