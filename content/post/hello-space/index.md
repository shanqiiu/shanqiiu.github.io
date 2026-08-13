---
title: "你好，我的个人空间"
date: 2026-08-06T10:00:00+08:00
categories: ["工具教程", "环境搭建", "Hugo"]
tags: ["开始", "Hugo", "知识库"]
summary: "第一篇示例文章，介绍这个空间的定位、内容分类与写作方式。"
toc: true
---

欢迎来到我的个人技术空间！这里计划记录三类内容：

- **知识博客**（`post`）：技术笔记、踩坑记录、读书思考与随笔；
- **个人项目**（`projects`）：正在做和想做的小项目，以及它们的进展与状态；
- **学习历程**（`learning`）：学习目标、阶段计划与里程碑。

## 怎么写一篇文章

在 `content/post/` 下新建一个文件夹（文件夹名就是链接里的 slug），里面放一个 `index.md` 即可：

````markdown
---
title: "文章标题"
date: 2026-08-06T10:00:00+08:00
categories: ["工具教程", "环境搭建", "Hugo"]
tags: ["Hugo", "写作规范"]
summary: "一句话摘要"
toc: true
---

正文使用 Markdown 书写。
````

也可以用脚本快速创建：

```powershell
.\scripts\new-post.ps1 -Title "我的新文章"
```

## 支持的功能

- Markdown 写作，代码高亮，支持 LaTeX 公式（`$$...$$`）；
- 分类 / 标签 / 归档自动生成；
- 自动生成 RSS 订阅；
- 深浅色主题切换；
- 评论功能预留了 [Waline](https://waline.js.org/) 接口，接入方式见 README。

这个空间用 [Hugo](https://gohugo.io) 构建、托管在 GitHub Pages 上，一切内容都是普通的 Markdown 文件，随时可以迁移。
