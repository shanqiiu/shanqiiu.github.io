# 个人技术空间

一个用于记录**知识博客**、**个人项目**和**学习历程**的个人网站。站点使用 Hugo 自包含模板渲染，聊天室可选接入 Supabase 实现跨设备实时同步。

- [Hugo](https://gohugo.io)（静态站点生成器）
- [GitHub Pages](https://pages.github.com) 或 [Vercel](https://vercel.com)（均可自动部署）
- GitHub Actions（推送后自动构建部署）

## 目录结构

```text
.
├── api/                 # Vercel Serverless API（今日访客统计）
├── assets/              # Hugo 管线处理的 CSS、JS 和第三方资源
├── config/_default/     # 站点配置（hugo.toml / 菜单 / 参数 / Markdown）
├── content/
│   ├── post/            # 知识博客（文章）
│   ├── projects/        # 个人项目
│   ├── learning/        # 学习历程
│   ├── about/           # 关于我
│   └── archives/        # 归档（自动汇总）
├── data/                # 引用数据和知识分类配置
├── layouts/             # 页面模板（自包含，不依赖第三方主题）
├── scripts/             # 新建文章和项目检查脚本
├── specs/               # 已实现功能与仓库维护记录
├── static/              # 不经 Hugo 管线处理的图片、音频、SVG 等资源
├── supabase/            # 数据库结构和知识库种子 SQL
└── .github/workflows/   # 自动部署流水线
```

本地构建输出不属于源码：`public/`、`resources/_gen/`、`.hugo_*`、`.vb_*` 和 `d/` 均已加入 `.gitignore`，不要提交到仓库。

## 快速开始

### 1. 本地预览

下载 [Hugo Extended](https://github.com/gohugoio/hugo/releases)（版本与流水线一致，当前 0.164.0），解压后把 `hugo.exe` 加入 PATH，然后：

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

### 2b. 部署到 Vercel（推荐，零后端）

Vercel 原生支持 Hugo，且本项目已内置 `vercel.json`（指定 `framework=hugo`、`buildCommand=hugo --minify`、输出目录 `public`、Hugo 版本 `0.164.0`）。两种方式任选其一：

**方式 A：Dashboard 一键导入（最省事）**
1. 登录 [vercel.com](https://vercel.com)，点击 **Add New → Project**；
2. Import 你的 GitHub 仓库（即本仓库）；
3. Framework 会自动识别为 **Hugo**，构建命令 `hugo --minify`、输出目录 `public` 已预填；
4. 点 **Deploy**，一两分钟后拿到 `https://<project>.vercel.app`。

**方式 B：CLI 部署**
```powershell
npm i -g vercel
vercel login        # 浏览器授权
vercel              # 首次关联并部署
vercel --prod       # 部署到生产
```

**自定义域名**：在 Vercel 项目 **Settings → Domains** 添加域名，按提示加 DNS 记录即可。因为 `baseURL` 已设为 `/`，相对链接在 Vercel 的预览 / 生产 / 自定义域名下都能正常工作，无需改配置。

**与 GitHub Pages 共存**：`.github/workflows/deploy.yml` 仍会把站点同步部署到 `github.io`；两套互不影响，可保留做备份，或删掉该 workflow 只走 Vercel。

### 2c. 聊天室实时后端（可选，Supabase）

聊天室默认是「纯本地模式」（消息存浏览器 `localStorage`，靠 `BroadcastChannel` 在同一浏览器的多个标签页间同步），换设备 / 换人互相看不到、昵称也不跨设备。

接上 Supabase 后升级为「云端实时模式」：消息存 Postgres、Realtime 订阅实现**真·跨设备 / 跨用户实时**、Presence 统计**在线人数**。无需自建服务器。

**步骤**

1. **建 Supabase 项目**：登录 [supabase.com](https://supabase.com) → New Project；
2. **建表**：SQL Editor 中执行仓库里的 `supabase/schema.sql`（建 `rooms` / `messages` 表 + 公开读写 RLS 策略 + 预填 3 个房间）；
3. **拿凭证**：Project Settings → API，复制 **Project URL** 和 **anon public key**；
4. **配 Vercel 环境变量**（关键）：Vercel 项目 **Settings → Environment Variables** 添加两条，作用域勾 **Production**（和 `HUGO_VERSION` 同理，必须勾 Production）：
   - `SUPABASE_URL` = 你的 Project URL
   - `SUPABASE_ANON_KEY` = 你的 anon public key
5. **重新部署**：Deployments → 最新构建 → `⋯` → **Redeploy**（或往 `master` 推一个空提交 `git commit --allow-empty`）。

Hugo 构建时会把这两个变量注入到 `/chat/` 页面的 `window.SUPABASE_CONFIG`，`chat.js` 自动切到云端实时模式；**未配置时自动回退本地模式，网站照常可用**。

> 跨设备免重输昵称：聊天室侧边栏有「分享」按钮，点一下复制带身份的链接，在新设备打开即自动填充昵称（无需 Supabase 账号）。

### 3. 个性化配置

打开 `config/_default/` 修改：

| 文件 | 改什么 |
| --- | --- |
| `hugo.toml` | `baseURL`（已设为 `/` 以兼容多平台；要绝对链接可改成你的域名）、`title` |
| `menu.toml` | 导航菜单、GitHub 等社交链接 |
| `params.toml` | 昵称、签名、头像文案、首页展示数量、页脚版权 |
| `static/img/avatar.svg` | 替换成你自己的头像 |

> 本项目 `baseURL` 已设为 `/`，生成相对链接，GitHub Pages / Vercel / 自定义域名通用。若需要 RSS、sitemap 输出绝对地址，可把它改成你的正式域名（如 `https://example.com`）。

## 本地检查

项目提供了一组 PowerShell 检查脚本，用于验证构建产物、播放器界面、知识库页面和仓库卫生。先生成一次本地构建，再按需执行：

```powershell
hugo --minify
.\scripts\check-repo-hygiene.ps1
.\scripts\check-knowledge-deploy.ps1
.\scripts\check-knowledge-dynamic.ps1
.\scripts\check-knowledge-taxonomy.ps1
```

播放器相关检查脚本为 `check-player-ui.ps1`、`check-player-layout.ps1` 和 `check-no-load-shift.ps1`。这些脚本只读取源码或本地构建结果，不会修改内容。

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
