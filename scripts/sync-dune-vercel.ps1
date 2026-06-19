# Push Dune query IDs + dashboard URL to Vercel (production, preview, development)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$gen = Join-Path $PSScriptRoot "dune-env.generated.json"
if (-not (Test-Path $gen)) {
  Write-Host "Run: node scripts/dune-create-queries.mjs first"
  exit 1
}

$config = Get-Content $gen | ConvertFrom-Json
$keys = @(
  "DUNE_BNB_STATS_QUERY_ID",
  "DUNE_BNB_TX_QUERY_ID",
  "DUNE_PRISM_QUERY_ID",
  "NEXT_PUBLIC_DUNE_DASHBOARD_URL",
  "DUNE_DASHBOARD_URL"
)

if (-not (Test-Path (Join-Path $root ".vercel\project.json"))) {
  Write-Host "Linking Vercel project…"
  npx vercel link --yes
}

foreach ($k in $keys) {
  $v = $config.$k
  if (-not $v) { continue }
  Write-Host "Setting $k on Vercel…"
  $v | npx vercel env add $k production --force 2>$null
  $v | npx vercel env add $k preview --force 2>$null
  $v | npx vercel env add $k development --force 2>$null
}

Write-Host "Done. Redeploy: npx vercel --prod"
