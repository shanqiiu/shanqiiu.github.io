# 具身智能探索方向实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在个人网站首页和项目库中呈现具身智能与机械臂学习探索方向。

**Architecture:** 使用现有 Hugo 内容模型实现，不增加组件。首页事项由 `config/_default/params.toml` 提供，项目库页面由 Markdown front matter 和正文生成，精选状态由 `featured: true` 控制。

**Tech Stack:** Hugo Extended 0.164.0, TOML, Markdown.

---

### Task 1: 增加精选项目页

**Files:**
- Create: `content/projects/embodied-ai-robot-arm/index.md`

**Step 1: 编写项目元数据和正文**

使用现有 `status: live`、`featured: true`、`emoji`、`tags` 字段。正文覆盖项目目标、当前能力、实验结果、下一步和外部链接，并标明未完成的 Pi0 与真机方向。

**Step 2: 构建 Hugo 站点**

Run: `hugo --minify`
Expected: 构建成功，输出包含 `/projects/embodied-ai-robot-arm/`。

### Task 2: 更新首页当前事项

**Files:**
- Modify: `config/_default/params.toml`

**Step 1: 增加首页事项**

追加 `hero.now` 项，标题为“具身智能与机械臂学习”，描述聚焦 LeRobot、MuJoCo、Isaac Lab 和策略训练，状态设为 `doing`。

**Step 2: 重建并检查生成页面**

Run: `hugo --minify`
Expected: 构建成功，首页生成具身智能事项；项目列表生成精选项目卡片。

### Task 3: 检查最终差异

**Files:**
- Check: `config/_default/params.toml`
- Check: `content/projects/embodied-ai-robot-arm/index.md`

**Step 1: 检查空白和状态**

Run: `git diff --check`
Expected: 无空白错误；新增项目状态和描述与进度看板一致。
