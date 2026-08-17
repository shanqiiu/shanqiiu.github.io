-- ============================================================
-- 知识库种子数据批量导入（12 条）
-- 适用：Supabase Dashboard -> SQL Editor 中执行本文件
-- 说明：
--   1. 在 SQL Editor 中以 postgres(owner) 身份执行，RLS 对 owner 不生效，可绕过
--      knowledge_items_admin_insert 策略直接写入；若改用 API/客户端则以管理员
--      邮箱（须在 knowledge_admins 表）身份走 RLS。
--   2. created_by / id / created_at / updated_at 由数据库自动填充，未显式写入。
--   3. content_markdown 留空（原始数据无正文）；item_type 按一级分类语义映射
--      （技术文章->article, 工具教程->tool, 其他图书->book）。
--   4. 若重复执行，本脚本不会去重；建议在空表上首次导入，或先 truncate。
-- ============================================================

insert into public.knowledge_items
  (title, description, content_markdown, link, category_1, category_2, category_3, tags, item_type, status)
values
  ('Vue3 响应式更新', '记录 Vue3 响应式系统、ref、reactive 和更新时机。', '', 'https://vuejs.org/api/reactivity-core', '技术文章', '前端', 'Vue', '{"Vue","前端","响应式"}'::text[], 'article', 'published'),
  ('TypeScript 类型体操', 'TypeScript 类型推导、泛型约束和工具类型练习。', '', 'https://www.typescriptlang.org/docs/handbook/utility-types.html', '技术文章', '前端', 'TypeScript', '{"TypeScript","前端工程"}'::text[], 'article', 'published'),
  ('Electron 任务栏闪烁', '通过 mainWindow.flashFrame() 控制任务栏图标闪烁状态。', '', 'https://www.electronjs.org/docs/api/browser-window#winflashframeflag', '技术文章', '前端', 'Electron', '{"Electron","桌面端"}'::text[], 'article', 'published'),
  ('Nest 配置', 'Nest 项目中的模块、环境变量和启动配置记录。', '', 'https://docs.nestjs.com/fundamentals/modules', '技术文章', '后端', 'API设计', '{"NestJS","Node.js","后端"}'::text[], 'article', 'published'),
  ('Vercel 部署', 'Vercel 部署流程、环境变量和构建问题记录。', '', 'https://vercel.com/docs/deployments', '技术文章', '后端', '服务部署', '{"Vercel","部署"}'::text[], 'article', 'published'),
  ('Agent 工具调用机制整理', '整理 Agent 如何规划任务、调用工具、处理观察结果和继续执行。', '', 'https://platform.openai.com/docs/guides/tools', '技术文章', 'AI', 'Agent', '{"Agent","Tool Calling","LLM"}'::text[], 'article', 'published'),
  ('LLM 基础概念', '整理 token、上下文窗口、采样参数、结构化输出等基础概念。', '', 'https://platform.openai.com/docs', '技术文章', 'AI', 'LLM', '{"LLM","基础概念"}'::text[], 'article', 'published'),
  ('AI Infra 笔记', '记录推理服务、向量数据库、评测流水线和部署链路。', '', 'https://github.com/openai/evals', '技术文章', 'AI', 'Infra', '{"Infra","评测","部署"}'::text[], 'article', 'published'),
  ('Clash for Windows 使用方法', '记录订阅导入、规则模式、系统代理和常见网络问题排查。', '', 'https://github.com/Fndroid/clash_for_windows_pkg', '工具教程', '工具使用', 'Clash for Windows', '{"代理工具","Windows","经验记录"}'::text[], 'tool', 'published'),
  ('影视飓风拍摄课程笔记', '整理相机参数、构图、收音、灯光和剪辑流程中的实用经验。', '', 'https://www.ysjf.com', '工具教程', '拍摄剪辑', '影视飓风课程', '{"拍摄","剪辑","课程笔记"}'::text[], 'tool', 'published'),
  ('《置身事内》读书笔记', '围绕地方政府、财政、土地和产业政策整理核心观点。', '', 'https://book.douban.com', '其他图书', '经济', '宏观经济', '{"读书笔记","中国经济","财政"}'::text[], 'book', 'published'),
  ('唐诗摘录与赏析', '按诗人、主题和意象整理唐诗摘录、注释和个人理解。', '', 'https://ctext.org', '其他图书', '诗词', '唐诗', '{"诗词","读书笔记","摘录"}'::text[], 'book', 'published');
