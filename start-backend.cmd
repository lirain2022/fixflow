@echo off
setlocal
cd /d "%~dp0"
set "MAVEN_OPTS=%MAVEN_OPTS% -Duser.home=%USERPROFILE%"
where mvn >nul 2>nul
if errorlevel 1 (
 call mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=complete"
) else (
 call mvn spring-boot:run "-Dspring-boot.run.profiles=complete"
)
if errorlevel 1 pause
