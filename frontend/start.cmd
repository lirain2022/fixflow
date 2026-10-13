@echo off
setlocal
cd /d "%~dp0"
set "FIXFLOW_NODE=node"
where node >nul 2>nul
if errorlevel 1 (
  set "FIXFLOW_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencies are missing. Install Node.js 24 LTS, then run npm ci in this folder.
  pause
  exit /b 1
)
echo Starting FixFlow. Open the Local URL printed below.
echo Keep this window open. Press Ctrl+C to stop.
"%FIXFLOW_NODE%" node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173 --strictPort
if errorlevel 1 (
  echo Could not start. Check Node.js 24.15+ and whether port 5173 is in use.
  pause
)
