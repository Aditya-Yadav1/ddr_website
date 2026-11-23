@echo off
setlocal
set "HANDYHIVE_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined HANDYHIVE_NODE set "HANDYHIVE_NODE=%%N"
if not defined HANDYHIVE_NODE for /f "delims=" %%N in ('powershell.exe -NoLogo -NoProfile -Command "foreach ($runtime in @(Get-AppxPackage 'OpenAI.CodexPrimaryRuntime*')) { $node = Join-Path $runtime.InstallLocation 'dependencies/node/bin/node.exe'; if (Test-Path -LiteralPath $node) { $node; break } }"') do set "HANDYHIVE_NODE=%%N"
if not exist "%HANDYHIVE_NODE%" (
  echo Install Node.js 24, then reopen this launcher.
  pause
  exit /b 1
)
if "%~1"=="--check" (
  "%HANDYHIVE_NODE%" "%~dp0scripts\start-pilot.js" --check
  exit /b
)
if "%~1"=="--usb" (
  "%HANDYHIVE_NODE%" "%~dp0scripts\start-pilot.js" --usb
  if errorlevel 1 pause
  exit /b
)
"%HANDYHIVE_NODE%" "%~dp0scripts\start-pilot.js"
if errorlevel 1 pause
