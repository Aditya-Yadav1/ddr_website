param([Parameter(Mandatory=$true)][string]$Apk, [string]$ApiUrl, [switch]$Offline,
  [string]$BuildTools='C:/hhapk/sdk/build-tools/37.0.0', [string]$Java='C:/hhapk/jdk')
$ErrorActionPreference='Stop'
if (!$Offline -and !$ApiUrl) { throw 'The expected API URL is required for a network build.' }
$env:JAVA_HOME=$Java
& "$BuildTools/apksigner.bat" verify --verbose $Apk
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
& "$BuildTools/aapt2.exe" dump badging $Apk | Select-String '^package:|^sdkVersion:|^targetSdkVersion:|^application-label:|^native-code:'
if ($LASTEXITCODE -ne 0) { throw 'APK metadata is invalid.' }
if ($Offline) {
  $permissions = & "$BuildTools/aapt2.exe" dump permissions $Apk
  if ($LASTEXITCODE -ne 0 -or $permissions -match 'android\.permission\.INTERNET') {
    throw 'The offline APK must exclude the Android Internet permission.'
  }
  if (!($permissions -match 'com\.handyhive\.app\.demo')) { throw 'The offline app ID was not found.' }
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Apk))
try {
  $entry=$archive.GetEntry('assets/index.android.bundle')
  if (!$entry) { throw 'APK has no embedded JavaScript bundle.' }
  $stream=$entry.Open()
  $memory=[IO.MemoryStream]::new()
  try {
    $stream.CopyTo($memory)
    $bundle=[Text.Encoding]::UTF8.GetString($memory.ToArray())
    if ($Offline -and !$bundle.Contains('handyhive-offline-demo-v1')) { throw 'The APK is missing the offline engine.' }
    if (!$Offline -and !$bundle.Contains($ApiUrl)) { throw 'Configured API URL is missing from the APK bundle.' }
  } finally { $memory.Dispose(); $stream.Dispose() }
  foreach($arch in @('arm64-v8a','armeabi-v7a')) {
    if (!$archive.GetEntry("lib/$arch/libreactnative.so")) { throw "Native runtime missing: $arch" }
  }
} finally { $archive.Dispose() }
Get-FileHash -LiteralPath $Apk -Algorithm SHA256
