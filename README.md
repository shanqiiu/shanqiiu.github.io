# 个人技术空间

一个用于记录**知识博客**、**个人项目**和**学习历程**的个人网站模板。技术栈与 [鬼哥的空间](https://luoli523.github.io/) 相同：

- [Hugo](https://gohugo.io)（静态站点生成器）
- [GitHub Pages](https://pages.github.com)（免费托管）
- GitHub Actions（推送后自动构建部署）

## 目录结构

```text
.
├── config/_default/     # 站点配置（hugo.toml / 菜单 / 参数 / Markdown）
├── content/
│   ├── post/            # 知识博客（文章）
│   ├── projects/        # 个人项目
│   ├── learning/        # 学习历程
│   ├── about/           # 关于我
│   └── archives/        # 归档（自动汇总）
├── layouts/             # 页面模板（自包含，不依赖第三方主题）
├── assets/css/          # 主题样式（深/浅色）
├── static/              # 静态资源（头像、JS）
├── scripts/             # 建文脚本
└── .github/workflows/   # 自动部署流水线
```

## 快速开始

### 1. 本地预览

下载 [Hugo Extended](https://github.com/gohugoio/hugo/releases)（版本与流水线一致，当前 0.158.0），解压后把 `hugo.exe` 加入 PATH，然后：

```powershell
hugo server -D
```

浏览器打开 <http://localhost:1313/> 即可预览，修改文件会自动刷新。

### 2. 发布到 GitHub Pages

1. 在 GitHub 新建一个**公开仓库**，命名为 `<你的用户名>.github.io`（这是 GitHub Pages 用户站的固定命名规则）；
2. 把本地目录推上去（默认分支 `master`）：

   ```powershell
   git init
   git add .
   git commit -m "init: 个人技术空间"
   git branch -M master
   git remote add origin https://github.com/<你的用户名>/<你的用户名>.github.io.git
   git push -u origin master
   ```

3. 进入仓库 **Settings → Pages**，把 Source 选为 **GitHub Actions**；
4. 推送 `master` 分支后，Actions 会自动构建部署，稍等一两分钟访问 `https://<你的用户名>.github.io/`。

### 3. 个性化配置

打开 `config/_default/` 修改：

| 文件 | 改什么 |
| --- | --- |
| `hugo.toml` | `baseURL`（必须改成你的域名）、`title` |
| `menu.toml` | 导航菜单、GitHub 等社交链接 |
| `params.toml` | 昵称、签名、头像文案、首页展示数量、页脚版权 |
| `static/img/avatar.svg` | 替换成你自己的头像 |

> `baseURL` 没改之前，RSS 里的链接会指向 example.org，部署前务必修改。

## 写内容

### 博客文章

```powershell
.\scripts\new-post.ps1 -Title "我的第一篇文章"
```

也可以在 `content/post/` 下手动创建 `文章名/index.md`，front matter 支持：

```yaml
title: 标题
date: 2026-08-06T10:00:00+08:00
categories: [技术]
tags: [Hugo]
summary: 摘要
toc: true   # 显示目录
```

文章支持 Markdown、代码高亮、LaTeX 公式（`$$...$$`）和图片（把图片放进文章同目录引用即可）。

### 个人项目

创建 `content/projects/项目名/index.md`，字段说明：

```yaml
title: 项目名
description: 一句话描述
status: live      # live=进行中 / planned=规划中 / done=已完成
featured: true    # true 会出现在首页「精选项目」
link: https://... # 外链，填了卡片直接跳外链
emoji: 🚀
tags: [标签]
```

### 学习历程

创建 `content/learning/阶段名/index.md`，支持 `period`（阶段时间）、`status`、`milestones`（里程碑清单），首页和时间线会按时间倒序展示。

## 可选增强

- **评论**：`params.toml` 已预留 Waline 接口，去 [waline.js.org](https://waline.js.org/) 部署一个评论服务后，把 `enabled` 改为 `true` 并填上 `serverURL` 即可；
- **换主题**：本模板完全自包含（layouts 在站点根目录），也可以随时替换成 [hugo-theme-stack](https://github.com/CaiJimmy/hugo-theme-stack) 等主题，内容不受影响；
- **自定义域名**：在仓库 Settings → Pages 里配置 Custom domain 并添加 CNAME 记录即可。

## 许可证

模板代码可自由使用；你发布的内容默认采用 CC BY-NC-SA 4.0（可在 `params.toml` 中修改）。

## 头像来源

`static/img/avatar-lebron.jpg` 来自 Flickr 摄影师 lukeharold 的「LeBron James mural」作品（CC0 公有领域，可自由使用）。想换头像时直接替换该文件、保持同名即可。
