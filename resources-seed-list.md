# 知识库种子资源补录清单（共 12 条）

> 方案 A 后，原 `data/knowledge_taxonomy.yaml` 的 `resources` 静态卡片已移除，网格统一由 Supabase 动态卡片驱动。
> 下方 12 条为原静态卡片数据，需登录后点「新增资源」表单逐条补录（或导入 Supabase `knowledge_items`）。
>
> **表单填写提示**：`item_type` 选 `external`（均为外链）；`status` 选 `published`（公开可见）；`content_markdown` 可留空；三级分类对应 `category_1/2/3`。

## 一、总览表

| # | 标题 | 一级分类 | 二级分类 | 三级分类 | 链接 |
|---|------|---------|---------|---------|------|
| 1 | Vue3 响应式更新 | 技术文章 | 前端 | Vue | https://vuejs.org/api/reactivity-core |
| 2 | TypeScript 类型体操 | 技术文章 | 前端 | TypeScript | https://www.typescriptlang.org/docs/handbook/utility-types.html |
| 3 | Electron 任务栏闪烁 | 技术文章 | 前端 | Electron | https://www.electronjs.org/docs/api/browser-window#winflashframeflag |
| 4 | Nest 配置 | 技术文章 | 后端 | API设计 | https://docs.nestjs.com/fundamentals/modules |
| 5 | Vercel 部署 | 技术文章 | 后端 | 服务部署 | https://vercel.com/docs/deployments |
| 6 | Agent 工具调用机制整理 | 技术文章 | AI | Agent | https://platform.openai.com/docs/guides/tools |
| 7 | LLM 基础概念 | 技术文章 | AI | LLM | https://platform.openai.com/docs |
| 8 | AI Infra 笔记 | 技术文章 | AI | Infra | https://github.com/openai/evals |
| 9 | Clash for Windows 使用方法 | 工具教程 | 工具使用 | Clash for Windows | https://github.com/Fndroid/clash_for_windows_pkg |
| 10 | 影视飓风拍摄课程笔记 | 工具教程 | 拍摄剪辑 | 影视飓风课程 | https://www.ysjf.com |
| 11 | 《置身事内》读书笔记 | 其他图书 | 经济 | 宏观经济 | https://book.douban.com |
| 12 | 唐诗摘录与赏析 | 其他图书 | 诗词 | 唐诗 | https://ctext.org |

## 二、逐条详情（按表单字段）

### 1. Vue3 响应式更新

- **标题 (title)**：Vue3 响应式更新
- **一级分类 (category_1)**：技术文章
- **二级分类 (category_2)**：前端
- **三级分类 (category_3)**：Vue
- **链接 (link)**：https://vuejs.org/api/reactivity-core
- **描述 (description)**：记录 Vue3 响应式系统、ref、reactive 和更新时机。
- **标签 (tags)**：Vue、前端、响应式
- **类型 (item_type)**：external
- **状态 (status)**：published

### 2. TypeScript 类型体操

- **标题 (title)**：TypeScript 类型体操
- **一级分类 (category_1)**：技术文章
- **二级分类 (category_2)**：前端
- **三级分类 (category_3)**：TypeScript
- **链接 (link)**：https://www.typescriptlang.org/docs/handbook/utility-types.html
- **描述 (description)**：TypeScript 类型推导、泛型约束和工具类型练习。
- **标签 (tags)**：TypeScript、前端工程
- **类型 (item_type)**：external
- **状态 (status)**：published

### 3. Electron 任务栏闪烁

- **标题 (title)**：Electron 任务栏闪烁
- **一级分类 (category_1)**：技术文章
- **二级分类 (category_2)**：前端
- **三级分类 (category_3)**：Electron
- **链接 (link)**：https://www.electronjs.org/docs/api/browser-window#winflashframeflag
- **描述 (description)**：通过 mainWindow.flashFrame() 控制任务栏图标闪烁状态。
- **标签 (tags)**：Electron、桌面端
- **类型 (item_type)**：external
- **状态 (status)**：published

### 4. Nest 配置

- **标题 (title)**：Nest 配置
- **一级分类 (category_1)**：技术文章
- **二级分类 (category_2)**：后端
- **三级分类 (category_3)**：API设计
- **链接 (link)**：https://docs.nestjs.com/fundamentals/modules
- **描述 (description)**：Nest 项目中的模块、环境变量和启动配置记录。
- **标签 (tags)**：NestJS、Node.js、后端
- **类型 (item_type)**：external
- **状态 (status)**：published

### 5. Vercel 部署

- **标题 (title)**：Vercel 部署
- **一级分类 (category_1)**：技术文章
- **二级分类 (category_2)**：后端
- **三级分类 (category_3)**：服务部署
- **链接 (link)**：https://vercel.com/docs/deployments
- **描述 (description)**：Vercel 部署流程、环境变量和构建问题记录。
- **标签 (tags)**：Vercel、部署
- **类型 (item_type)**：external
- **状态 (status)**：published

### 6. Agent 工具调用机制整理

- **标题 (title)**：Agent 工具调用机制整理
- **一级分类 (category_1)**：技术文章
- **二级分类 (category_2)**：AI
- **三级分类 (category_3)**：Agent
- **链接 (link)**：https://platform.openai.com/docs/guides/tools
- **描述 (description)**：整理 Agent 如何规划任务、调用工具、处理观察结果和继续执行。
- **标签 (tags)**：Agent、Tool Calling、LLM
- **类型 (item_type)**：external
- **状态 (status)**：published

### 7. LLM 基础概念

- **标题 (title)**：LLM 基础概念
- **一级分类 (category_1)**：技术文章
- **二级分类 (category_2)**：AI
- **三级分类 (category_3)**：LLM
- **链接 (link)**：https://platform.openai.com/docs
- **描述 (description)**：整理 token、上下文窗口、采样参数、结构化输出等基础概念。
- **标签 (tags)**：LLM、基础概念
- **类型 (item_type)**：external
- **状态 (status)**：published

### 8. AI Infra 笔记

- **标题 (title)**：AI Infra 笔记
- **一级分类 (category_1)**：技术文章
- **二级分类 (category_2)**：AI
- **三级分类 (category_3)**：Infra
- **链接 (link)**：https://github.com/openai/evals
- **描述 (description)**：记录推理服务、向量数据库、评测流水线和部署链路。
- **标签 (tags)**：Infra、评测、部署
- **类型 (item_type)**：external
- **状态 (status)**：published

### 9. Clash for Windows 使用方法

- **标题 (title)**：Clash for Windows 使用方法
- **一级分类 (category_1)**：工具教程
- **二级分类 (category_2)**：工具使用
- **三级分类 (category_3)**：Clash for Windows
- **链接 (link)**：https://github.com/Fndroid/clash_for_windows_pkg
- **描述 (description)**：记录订阅导入、规则模式、系统代理和常见网络问题排查。
- **标签 (tags)**：代理工具、Windows、经验记录
- **类型 (item_type)**：external
- **状态 (status)**：published

### 10. 影视飓风拍摄课程笔记

- **标题 (title)**：影视飓风拍摄课程笔记
- **一级分类 (category_1)**：工具教程
- **二级分类 (category_2)**：拍摄剪辑
- **三级分类 (category_3)**：影视飓风课程
- **链接 (link)**：https://www.ysjf.com
- **描述 (description)**：整理相机参数、构图、收音、灯光和剪辑流程中的实用经验。
- **标签 (tags)**：拍摄、剪辑、课程笔记
- **类型 (item_type)**：external
- **状态 (status)**：published

### 11. 《置身事内》读书笔记

- **标题 (title)**：《置身事内》读书笔记
- **一级分类 (category_1)**：其他图书
- **二级分类 (category_2)**：经济
- **三级分类 (category_3)**：宏观经济
- **链接 (link)**：https://book.douban.com
- **描述 (description)**：围绕地方政府、财政、土地和产业政策整理核心观点。
- **标签 (tags)**：读书笔记、中国经济、财政
- **类型 (item_type)**：external
- **状态 (status)**：published

### 12. 唐诗摘录与赏析

- **标题 (title)**：唐诗摘录与赏析
- **一级分类 (category_1)**：其他图书
- **二级分类 (category_2)**：诗词
- **三级分类 (category_3)**：唐诗
- **链接 (link)**：https://ctext.org
- **描述 (description)**：按诗人、主题和意象整理唐诗摘录、注释和个人理解。
- **标签 (tags)**：诗词、读书笔记、摘录
- **类型 (item_type)**：external
- **状态 (status)**：published
