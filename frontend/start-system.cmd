@echo off
setlocal
cd /d "%~dp0"
set "FIXFLOW_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "FIXFLOW_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "node_modules\vite\bin\vite.js" (
 echo Run npm ci in the frontend folder first.
 pause
 exit /b 1
)
echo RE:FIX home: http://127.0.0.1:5175/
echo RE:FIX member: http://127.0.0.1:5175/member.html
echo FixFlow admin: http://127.0.0.1:5175/system.html?portal=admin
echo Start the backend with start-backend.cmd from the project root.
"%FIXFLOW_NODE%" node_modules\vite\bin\vite.js --config vite.system.config.js
if errorlevel 1 pause
