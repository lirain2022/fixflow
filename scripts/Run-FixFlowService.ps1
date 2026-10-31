param([Parameter(Mandatory=$true)][string]$ProjectRoot,[ValidateSet('backend','frontend')][string]$Service)
$ErrorActionPreference='Continue'
if($Service -eq 'backend'){
 Set-Location -LiteralPath $ProjectRoot
 $env:MAVEN_OPTS=$env:MAVEN_OPTS+' -Duser.home="'+$env:USERPROFILE+'"'
 $maven=Get-Command mvn.cmd -ErrorAction SilentlyContinue
 if($maven){& $maven.Source spring-boot:run '-Dspring-boot.run.profiles=complete'}else{& (Join-Path $ProjectRoot 'mvnw.cmd') spring-boot:run '-Dspring-boot.run.profiles=complete'}
}else{
 Set-Location -LiteralPath (Join-Path $ProjectRoot 'frontend')
 & node.exe node_modules/vite/bin/vite.js --config vite.system.config.js
}
exit $LASTEXITCODE
