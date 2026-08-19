# 山海的个人空间

这是一个记录技术探索、个人项目、学习经历和生活兴趣的个人网站。首页把个人资料、作品、文章、图库、音乐和正在进行的事情放在同一个工作台中；其他页面则用于沉淀更完整的内容。

## 网站内容

### 首页

- **个人资料**：姓名、英文名、职业方向、所在地、个人简介和技术栈。
- **GitHub 活跃度**：展示近期代码提交情况，用来观察持续学习和创作节奏。
- **Navigation 导航**：进入项目库、文章、资源、聊天室和友链。
- **最近在做的事**：记录当前正在推进、计划开始或已经完成的事项。
- **个人图库**：以叠放相册的形式展示个人图片，支持翻页浏览。
- **音乐**：播放个人歌单，记录当下常听的音乐。

### 内容页面

- **文章**（`content/post/`）：技术笔记、实践记录、思考和随笔。
- **项目**（`content/projects/`）：个人项目、研究课题和工具作品。
- **学习经历**（`content/learning/`）：阶段性学习记录、里程碑和成长轨迹。
- **关于与友链**（`content/about/`）：个人介绍及其他网站链接。
- **聊天室**：用于实时交流的独立页面。

## 日常更新指南

### 更新个人资料和技术栈

编辑 `config/_default/params.toml` 中的 `[hero]` 部分，可以更新首页顶部的姓名、身份、简介、所在地、工作状态和技术栈。

技术栈使用多个 `[[hero.techStack]]` 条目，每项填写名称和对应图标。例如：

```toml
[[hero.techStack]]
    name = "Python"
    mark = "Py"
    icon = "python"
```

### 更新“最近在做的事”

仍在 `config/_default/params.toml` 中编辑 `[[hero.now]]` 条目：

```toml
[[hero.now]]
    title = "个人图库重构"
    desc = "调整相册叠放布局与图片浏览交互"
    status = "doing"
```

`status` 可填写：`doing`（进行中）、`plan`（计划中）或 `done`（已完成）。条目的显示顺序就是首页中的排列顺序。

### 更新个人图库

图库图片放在 `static/img/gallery/`。新增图片后，在 `layouts/index.html` 的图库区域补充图片路径，并按照当前相册顺序调整主图和叠放图。建议使用主体明确的横向照片；主图负责表达当前页内容，后方图片只露出局部，用来形成相册叠放效果。

### 更新音乐

编辑 `config/_default/params.toml` 中的 `[[hero.playlist]]` 条目：

```toml
[[hero.playlist]]
    title = "歌曲名称"
    artist = "艺术家"
    cover = "/img/avatar-sakuragi.jpg"
    src = "/audio/song.mp3"
```

音频文件放在 `static/audio/`，封面放在 `static/img/`。歌单条目的顺序就是播放器中的顺序。

### 写一篇文章

文章放在 `content/post/` 下，每篇文章使用一个独立目录和 `index.md` 文件。正文使用 Markdown 编写，建议包含标题、日期、分类、标签和摘要：

```yaml
---
title: "文章标题"
date: 2026-08-19T10:00:00+08:00
categories: [技术]
tags: [AI, Hugo]
summary: "用一句话说明文章解决了什么问题。"
toc: true
---
```

### 更新项目

项目放在 `content/projects/项目名称/index.md`。项目页重点记录项目目标、当前状态、技术栈、成果和相关链接。首页是否展示精选项目，由项目页中的 `featured` 字段决定。常用状态包括 `live`（进行中）、`planned`（规划中）和 `done`（已完成）。

### 更新学习经历

学习记录放在 `content/learning/`。每个阶段可以记录起止时间、学习主题、阶段目标和里程碑，适合整理长期学习过程。

## 内容维护建议

- 首页适合放“正在发生的事情”，详细过程写入文章、项目或学习记录。
- 标题尽量简短，描述说明具体行动或结果，避免只写抽象名词。
- 状态和日期要及时更新，让首页反映当前阶段。
- 图片和音频文件使用有意义的文件名，并放入对应的 `static/` 子目录。
- 文章、项目和学习记录尽量保持一个主题一个页面，方便长期查找和回顾。

## 常用目录

```text
content/post/                文章与技术笔记
content/projects/            个人项目
content/learning/            学习经历与里程碑
content/about/               关于页面与友链
config/_default/params.toml  首页个人资料、事项和音乐数据
layouts/index.html           首页模块结构
static/img/gallery/          个人图库图片
static/audio/                音乐文件
```
