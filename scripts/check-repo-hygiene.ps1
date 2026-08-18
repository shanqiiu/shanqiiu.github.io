# Repo hygiene guard: no build output is tracked, and main.js has a single source.
# Usage: powershell -File scripts/check-repo-hygiene.ps1   (run from repo root)
# NOTE: ASCII-only on purpose -- Windows PowerShell reads .ps1 as ANSI, so
# non-ASCII comments corrupt tokenization (same convention as the other checks).
# We rely on the inherited cwd for git rather than passing the repo path as an
# argument, because a non-ASCII repo path gets mangled when handed to git.exe.
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath '.git')) {
    Write-Error 'Must run from repository root (no .git in current directory).'
    exit 1
}
$tracked = git ls-files
if ($LASTEXITCODE -ne 0) { Write-Error 'git ls-files failed'; exit 1 }

# Build / verify output prefixes that must never be tracked.
$buildPrefixes = @('public/', '.hugo_', '.vb_', 'd/', 'resources/_gen/')
$trackedBuild = $tracked | Where-Object {
    $f = $_
    $buildPrefixes | Where-Object { $f -like "$_*" }
}

# main.js source files (excluding built output under public/) -- expect exactly one.
$mainSources = @($tracked | Where-Object { $_ -match '(^|/)main\.js$' -and $_ -notlike 'public/*' })

$checks = @(
    @{ Name = 'no tracked build output'; Ok = -not $trackedBuild },
    @{ Name = 'single main.js source';   Ok = $mainSources.Count -eq 1 }
)

$failed = $checks | Where-Object { -not $_.Ok }
if ($failed) {
    if ($trackedBuild) {
        Write-Error "Tracked build output detected: $($trackedBuild -join ', ')"
    }
    if ($mainSources.Count -ne 1) {
        Write-Error "Expected exactly one main.js source, found: $($mainSources -join ', ')"
    }
    exit 1
}

Write-Host 'Repo hygiene checks passed.'
