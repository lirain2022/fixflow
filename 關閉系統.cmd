@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-FixFlow.ps1" -Action Stop
if errorlevel 1 (
 pause
 exit /b 1
)
pause
