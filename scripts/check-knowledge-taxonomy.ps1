$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$taxonomyPath = Join-Path $root 'data/knowledge_taxonomy.yaml'
$learningLayoutPath = Join-Path $root 'layouts/learning/list.html'
$postCardPath = Join-Path $root 'layouts/partials/post-card.html'

if (-not (Test-Path -LiteralPath $taxonomyPath)) {
    throw 'Missing data/knowledge_taxonomy.yaml'
}

$utf8 = [System.Text.Encoding]::UTF8
$taxonomy = $utf8.GetString([System.IO.File]::ReadAllBytes($taxonomyPath))
function U([int[]]$codes) {
    return -join ($codes | ForEach-Object { [char]$_ })
}

$required = @(
    (U @(0x5176,0x4ed6,0x56fe,0x4e66)),
    (U @(0x6280,0x672f,0x6587,0x7ae0)),
    (U @(0x5de5,0x5177,0x6559,0x7a0b)),
    (U @(0x653f,0x6cbb)),
    (U @(0x7ecf,0x6d4e)),
    (U @(0x8bd7,0x8bcd)),
    (U @(0x524d,0x7aef)),
    (U @(0x540e,0x7aef)),
    'AI',
    'Agent',
    'LLM',
    'Infra',
    'Clash for Windows',
    (U @(0x5f71,0x89c6,0x98d3,0x98ce,0x8bfe,0x7a0b))
)

foreach ($item in $required) {
    if (-not $taxonomy.Contains($item)) {
        throw "Missing taxonomy item: $item"
    }
}

$learningLayout = $utf8.GetString([System.IO.File]::ReadAllBytes($learningLayoutPath))
if (-not $learningLayout.Contains('hugo.Data.knowledge_taxonomy')) {
    throw 'learning list does not render from hugo.Data.knowledge_taxonomy'
}
if (-not $learningLayout.Contains('data-path=')) {
    throw 'learning list does not expose category paths for filtering'
}

$postCard = $utf8.GetString([System.IO.File]::ReadAllBytes($postCardPath))
if (-not $postCard.Contains('post-card-category-path')) {
    throw 'post card does not display multi-level category paths'
}

$contentFiles = Get-ChildItem -Path (Join-Path $root 'content') -Recurse -Filter '*.md' |
    Where-Object { $_.FullName -match '\\content\\(post|learning)\\' -and $_.Name -ne '_index.md' }

foreach ($file in $contentFiles) {
    $text = $utf8.GetString([System.IO.File]::ReadAllBytes($file.FullName))
    if ($text -notmatch '(?m)^categories:\s*\[(.+)\]') {
        throw "Missing categories array: $($file.FullName)"
    }

    $raw = $Matches[1]
    $parts = [regex]::Matches($raw, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
    if ($parts.Count -lt 2) {
        throw "Category path must have at least two levels: $($file.FullName)"
    }
    if ($required[0..2] -notcontains $parts[0]) {
        throw "Invalid top-level category '$($parts[0])' in $($file.FullName)"
    }

    foreach ($part in $parts) {
        if (-not $taxonomy.Contains($part)) {
            throw "Category level '$part' is not declared in data/knowledge_taxonomy.yaml for $($file.FullName)"
        }
    }
}

Write-Host 'Knowledge taxonomy checks passed.'
