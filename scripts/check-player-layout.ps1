$header = Get-Content -Raw -Encoding UTF8 layouts/partials/header.html
$components = Get-Content -Raw assets/css/_components.css

$siteHeaderMatch = [regex]::Match($header, '(?s)<header class="site-header"[^>]*>.*?</header>')
$siteHeaderBody = if ($siteHeaderMatch.Success) { $siteHeaderMatch.Value } else { '' }
$headerMusicNested = $siteHeaderBody -match '<div class="music-player"'
$playerRule = [regex]::Match($components, '(?s)\.music-player\s*\{(?<body>.*?)\}')
$playerBody = if ($playerRule.Success) { $playerRule.Groups['body'].Value } else { '' }

$checks = @(
    @{
        Name = 'music player is not nested in fixed site header';
        Ok = -not $headerMusicNested
    },
    @{
        Name = 'music player has explicit fixed bottom placement';
        Ok = $playerBody -match 'position:\s*fixed' -and
             $playerBody -match 'bottom:\s*' -and
             $playerBody -match 'top:\s*auto'
    }
)

$failed = $checks | Where-Object { -not $_.Ok }
foreach ($check in $checks) {
    if ($check.Ok) {
        Write-Host "[OK] $($check.Name)"
    } else {
        Write-Host "[FAIL] $($check.Name)"
    }
}

if ($failed) {
    exit 1
}
