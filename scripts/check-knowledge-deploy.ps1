$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$workflowPath = Join-Path $root '.github/workflows/deploy.yml'
$headPath = Join-Path $root 'layouts/partials/head.html'

$workflow = Get-Content -Raw -Encoding UTF8 -LiteralPath $workflowPath
$head = Get-Content -Raw -Encoding UTF8 -LiteralPath $headPath

if (-not $head.Contains('os.Getenv "SUPABASE_URL"')) {
    throw 'Resource knowledge page does not read SUPABASE_URL at build time'
}

if (-not $workflow.Contains('SUPABASE_URL: ${{ secrets.SUPABASE_URL }}')) {
    throw 'GitHub Pages build does not pass SUPABASE_URL to Hugo'
}

if (-not $workflow.Contains('SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}')) {
    throw 'GitHub Pages build does not pass SUPABASE_ANON_KEY to Hugo'
}

Write-Host 'Knowledge deploy checks passed.'
