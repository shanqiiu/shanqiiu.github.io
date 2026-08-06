<#
.SYNOPSIS
快速创建一篇新内容（文章 / 学习记录 / 项目），生成带 front matter 的 index.md。

.EXAMPLE
.\scripts\new-post.ps1 -Title "我的第一篇文章"
.\scripts\new-post.ps1 -Title "学习 Go 语言" -Section learning
.\scripts\new-post.ps1 -Title "开源了一个小工具" -Section projects -Status live
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Title,

    [ValidateSet("post", "learning", "projects")]
    [string]$Section = "post",

    [string]$Slug = "",

    [ValidateSet("live", "planned", "done", "")]
    [string]$Status = ""
)

$root = Split-Path -Parent $PSScriptRoot
$contentRoot = Join-Path $root "content\$Section"

if (-not $Slug) {
    $Slug = ($Title.Trim() -replace "\s+", "-")
}

$dir = Join-Path $contentRoot $Slug
if (Test-Path $dir) {
    Write-Error "目录已存在：$dir"
    exit 1
}
New-Item -ItemType Directory -Path $dir -Force | Out-Null

$date = Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"
$dateOnly = Get-Date -Format "yyyy-MM-dd"

$extra = ""
if ($Section -eq "learning") {
    $period = Get-Date -Format "yyyy-MM"
    $extra = @"
period: "$period"
status: "in-progress"
summary: "一句话概括这个阶段的目标。"
milestones:
  - "第一个里程碑"
"@
}
elseif ($Section -eq "projects") {
    $statusValue = if ($Status) { $Status } else { "planned" }
    $extra = @"
description: "一句话描述这个项目。"
status: "$statusValue"
featured: false
emoji: "📦"
tags: ["标签"]
"@
}

$body = @"
---
title: "$Title"
date: $date
$extra
---

开始写作吧！
"@

$file = Join-Path $dir "index.md"
Set-Content -Path $file -Value $body -Encoding UTF8

Write-Host "已创建：$file"
Write-Host "本地预览：hugo server -D，然后打开 http://localhost:1313/"
