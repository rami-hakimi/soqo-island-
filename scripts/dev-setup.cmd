@echo off
rem Development only (source checkout): creates the desktop icon + start-with-Windows entry
rem for this checkout and starts Soqo Island. Installed copies use the installer instead.
cd /d "%~dp0.."
if not exist "node_modules\electron\dist\electron.exe" (
  echo electron.exe not found. Run "npm install" in this folder first.
  pause
  exit /b 1
)
start "" "node_modules\electron\dist\electron.exe" "%cd%" --setup
echo Soqo Island is starting. The result is written to setup-log.txt
timeout /t 4 >nul
