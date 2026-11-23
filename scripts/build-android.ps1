param([string]$ApiUrl, [switch]$Pilot, [switch]$Usb, [switch]$Offline,
  [string]$BuildRoot='C:/hhapk', [string]$OutputDirectory=(Join-Path $env:USERPROFILE 'Downloads'))
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$mobile=Join-Path $repo 'mobile'
$target=Join-Path $BuildRoot 'app'
if ($Offline -and ($Pilot -or $Usb -or $ApiUrl)) { throw 'The offline demo does not accept a network mode or API URL.' }
if (!$Offline -and !$ApiUrl) { throw 'Supply an API URL or use -Offline.' }
if (!(Test-Path -LiteralPath (Join-Path $target 'node_modules/expo/bin/cli'))) {
  throw 'Prepare the short Android build directory and install mobile dependencies first. See mobile/README.md.'
}
$env:EXPO_PUBLIC_HANDYHIVE_API_URL=$ApiUrl
$env:EXPO_PUBLIC_HANDYHIVE_OFFLINE_DEMO=if ($Offline) { '1' } else { '' }
$env:EXPO_PUBLIC_HANDYHIVE_PILOT=if ($Usb) { 'usb' } elseif ($Pilot) { '1' } else { '' }
$env:HANDYHIVE_BUILD_CHANNEL=if ($Offline) { 'offline' } elseif ($Pilot -or $Usb) { 'pilot' } else { 'production' }
$env:HANDYHIVE_ANDROID_CMAKE_DIR=Join-Path $BuildRoot 'cxx/app'
$env:JAVA_HOME=Join-Path $BuildRoot 'jdk'
$env:ANDROID_HOME=Join-Path $BuildRoot 'sdk'
$env:GRADLE_USER_HOME=Join-Path $BuildRoot 'gradle-cache'
Push-Location $repo
try {
  if (!$Offline) {
    node -e 'const mode = process.env.EXPO_PUBLIC_HANDYHIVE_PILOT; require("./mobile/api-endpoint").resolveEndpoint(process.env.EXPO_PUBLIC_HANDYHIVE_API_URL,"android",false,mode === "usb" ? mode : mode === "1")'
    if ($LASTEXITCODE -ne 0) { throw 'Invalid API URL.' }
  }
  if (!$Pilot -and !$Usb -and !$Offline) {
    node scripts/check-api.js
    if ($LASTEXITCODE -ne 0) { throw 'Production API preflight failed.' }
    throw 'Use the production EAS profile for protected production signing. This local builder creates pilot APKs only.'
  }
  foreach($folder in @('src','app','plugins','assets','shared','demo')) { Copy-Item -LiteralPath (Join-Path $mobile $folder) -Destination $target -Recurse -Force }
  foreach($file in @('api-endpoint.js','api-endpoint.d.ts','app.config.js','app.json','eas.json','package.json')) { Copy-Item -LiteralPath (Join-Path $mobile $file) -Destination $target -Force }
  Set-Location $target
  node node_modules/expo/bin/cli prebuild --platform android --no-install --no-clean
  if ($LASTEXITCODE -ne 0) { throw 'Android configuration failed.' }
  Set-Location (Join-Path $target 'android')
  & (Join-Path $BuildRoot 'gradle-9.4.1/bin/gradle.bat') assembleRelease '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a' --console=plain
  if ($LASTEXITCODE -ne 0) { throw 'APK build failed.' }
  $apk=Join-Path $target 'android/app/build/outputs/apk/release/app-release.apk'
  & (Join-Path $PSScriptRoot 'verify-apk.ps1') -Apk $apk -ApiUrl $ApiUrl -Offline:$Offline -BuildTools (Join-Path $BuildRoot 'sdk/build-tools/37.0.0') -Java $env:JAVA_HOME
  if (!(Test-Path -LiteralPath $OutputDirectory)) { New-Item -ItemType Directory -Path $OutputDirectory | Out-Null }
  $fileName=if ($Offline) { 'HandyHive-0.3.0-offline-demo.apk' } elseif ($Usb) { 'HandyHive-0.2.0-usb-pilot.apk' } else { 'HandyHive-0.2.0-local-pilot.apk' }
  $output=Join-Path $OutputDirectory $fileName
  Copy-Item -LiteralPath $apk -Destination $output -Force
  Write-Host "Installer: $output"
} finally { Pop-Location }
