$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$schemaPath = Join-Path $root 'supabase/schema.sql'
$headPath = Join-Path $root 'layouts/partials/head.html'
$layoutPath = Join-Path $root 'layouts/learning/list.html'
$jsPath = Join-Path $root 'assets/js/main.js'
$cssPath = Join-Path $root 'assets/css/main.css'

$utf8 = [System.Text.Encoding]::UTF8
function ReadText($path) {
    return $utf8.GetString([System.IO.File]::ReadAllBytes($path))
}

$schema = ReadText $schemaPath
$head = ReadText $headPath
$layout = ReadText $layoutPath
$js = ReadText $jsPath
$css = ReadText $cssPath

$checks = @(
    @{ Name = 'knowledge_items table'; Ok = $schema.Contains('create table if not exists public.knowledge_items') },
    @{ Name = 'knowledge_admins table'; Ok = $schema.Contains('create table if not exists public.knowledge_admins') },
    @{ Name = 'published public select policy'; Ok = $schema.Contains('knowledge_items_select_published') },
    @{ Name = 'admin write policy'; Ok = $schema.Contains('knowledge_items_admin_insert') -and $schema.Contains('knowledge_items_admin_update') },
    @{ Name = 'learning supabase injection'; Ok = $head.Contains('eq .Section "learning"') -and $head.Contains('SUPABASE_CONFIG') },
    @{ Name = 'knowledge manager markup'; Ok = $layout.Contains('id="knowledge-drawer"') -and $layout.Contains('id="knowledge-form"') },
    @{ Name = 'taxonomy json payload'; Ok = $layout.Contains('knowledge-taxonomy-data') },
    @{ Name = 'dynamic stat hooks'; Ok = $layout.Contains('knowledge-total-count') -and $layout.Contains('knowledge-visible-count') },
    @{ Name = 'dynamic knowledge initializer'; Ok = $js.Contains('function initKnowledgeBase()') },
    @{ Name = 'supabase insert support'; Ok = $js.Contains(".from('knowledge_items').insert") },
    @{ Name = 'supabase update support'; Ok = $js.Contains(".from('knowledge_items').update") },
    @{ Name = 'edit button support'; Ok = $js.Contains('data-edit-id') -and $css.Contains('.knowledge-edit-btn') },
    @{ Name = 'auth otp support'; Ok = $js.Contains('signInWithOtp') },
    @{ Name = 'drawer css'; Ok = $css.Contains('.knowledge-drawer') -and $css.Contains('.resource-sidebar.is-collapsed') }
)

$failed = $checks | Where-Object { -not $_.Ok }
if ($failed) {
    $failed | ForEach-Object { Write-Error "Missing dynamic knowledge check: $($_.Name)" }
    exit 1
}

Write-Host 'Dynamic knowledge checks passed.'
