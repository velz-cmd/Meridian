# Sync CMC_API_KEY + CMC_MCP_API_KEY from .env.local to Vercel (production, preview, development)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$envFile = Join-Path $root ".env.local"
if (-not (Test-Path $envFile)) { throw ".env.local not found" }

$vars = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $i = $line.IndexOf("=")
  if ($i -gt 0) {
    $vars[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
  }
}

$names = @("CMC_API_KEY", "CMC_MCP_API_KEY")
foreach ($name in $names) {
  if (-not $vars[$name]) { throw "$name not found in .env.local" }
}

if (-not (Test-Path (Join-Path $root ".vercel\project.json"))) {
  Write-Host "Linking project to Vercel..."
  npx vercel link --yes
  if ($LASTEXITCODE -ne 0) { throw "vercel link failed" }
}

foreach ($name in $names) {
  Write-Host "Pushing $name to Vercel..."
  $value = $vars[$name]
  foreach ($target in @("production", "preview", "development")) {
    npx vercel env add $name $target --value $value --yes --force --sensitive --non-interactive 2>&1 | Out-Null
    Write-Host "  $name ($target)"
  }
}

Write-Host "CMC keys synced to Vercel."
