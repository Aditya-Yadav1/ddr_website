param([string]$Address = '10.184.63.213', [int]$Port = 4175)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (!$nodeCommand) {
  $runtime = Get-AppxPackage 'OpenAI.CodexPrimaryRuntime*' | Sort-Object Version -Descending | Select-Object -First 1
  $nodeDirectory = if ($runtime) { Join-Path $runtime.InstallLocation 'dependencies/node/bin' } else { '' }
  if (!$nodeDirectory -or !(Test-Path -LiteralPath (Join-Path $nodeDirectory 'node.exe'))) { throw 'Install Node.js 24 or run this script in the Codex terminal.' }
  $env:PATH = "$nodeDirectory;$env:PATH"
}
node (Join-Path $repo 'scripts/start-pilot.js') $Address "$Port"
exit $LASTEXITCODE
