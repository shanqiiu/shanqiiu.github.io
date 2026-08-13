$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$headerPath = Join-Path $root 'layouts/partials/header.html'
$cssPath = Join-Path $root 'assets/css/main.css'
$jsPath = Join-Path $root 'assets/js/main.js'

$header = Get-Content -Raw -Encoding UTF8 -LiteralPath $headerPath
$css = Get-Content -Raw -Encoding UTF8 -LiteralPath $cssPath
$js = Get-Content -Raw -Encoding UTF8 -LiteralPath $jsPath

$checks = @(
    @{ Name = 'compact cover markup'; Ok = $header.Contains('class="music-cover-small"') },
    @{ Name = 'primary control row'; Ok = $header.Contains('class="music-primary-row"') },
    @{ Name = 'secondary control row'; Ok = $header.Contains('class="music-secondary-row"') },
    @{ Name = 'expanded toggle aria state'; Ok = $header.Contains('aria-expanded="true"') },
    @{ Name = 'compact player width'; Ok = $css.Contains('width: min(360px, calc(100vw - 32px));') },
    @{ Name = 'collapsed compact transform'; Ok = $css.Contains('.music-player.is-collapsed .music-body') -and $css.Contains('translateX(calc(100% + 16px))') },
    @{ Name = 'small cover styling'; Ok = $css.Contains('.music-cover-small') },
    @{ Name = 'toggle aria sync'; Ok = $js.Contains("toggle.setAttribute('aria-expanded'") },
    @{ Name = 'play aria sync'; Ok = $js.Contains("playBtn.setAttribute('aria-label'") },
    @{ Name = 'mute aria sync'; Ok = $js.Contains("muteBtn.setAttribute('aria-label'") }
)

$failed = $checks | Where-Object { -not $_.Ok }
if ($failed) {
    $failed | ForEach-Object { Write-Error "Missing player UI check: $($_.Name)" }
    exit 1
}

Write-Host 'Player UI checks passed.'
