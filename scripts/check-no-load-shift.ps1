$css = Get-Content -Raw assets/css/_learning.css

$checks = @(
    @{
        Name = 'reveal animation does not move content vertically';
        Ok = $css -notmatch '(?s)\.reveal\s*\{[^}]*transform:\s*translateY\('
    },
    @{
        Name = 'main page fade does not move content vertically';
        Ok = $css -notmatch '(?s)@keyframes\s+page-fade-in\s*\{.*?transform:\s*translateY\('
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
