# Full Vercel deploy: link project, sync .env.local -> Vercel, production deploy
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$envFile = Join-Path $root ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Host "Copy .env.example to .env.local and fill keys first."
  exit 1
}

Write-Host "==> Vercel account"
npx vercel whoami

if (-not (Test-Path (Join-Path $root ".vercel\project.json"))) {
  Write-Host "==> Linking to Vercel (trader-arc)"
  npx vercel link --project trader-arc --yes
}

Write-Host "==> Syncing .env.local to Vercel (production, preview, development)"
$vars = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $idx = $line.IndexOf("=")
  if ($idx -lt 1) { return }
  $name = $line.Substring(0, $idx).Trim()
  $val = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
  if ($val -ne "" -and $val -notmatch "YOUR_PROJECT") { $vars[$name] = $val }
}

foreach ($name in ($vars.Keys | Sort-Object)) {
  Write-Host "  env: $name"
  foreach ($target in @("production", "preview", "development")) {
    npx vercel env add $name $target --value $vars[$name] --yes --force 2>&1 | Out-Null
  }
}

Write-Host "==> Production deploy (trader-arc)"
npx vercel --prod --yes
if ($LASTEXITCODE -eq 0) {
  Write-Host "==> Deploy OK. Test: /api/status and /nexus"
} else {
  Write-Host "==> Deploy failed - check output above"
  exit 1
}
