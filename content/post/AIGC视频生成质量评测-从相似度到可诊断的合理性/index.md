---
title: '从"像不像"到"合不合理"：AIGC 视频生成质量评测的方法演进与实践'
date: 2026-08-17T16:40:48+08:00
draft: false 

categories: ["技术文章", "AI", "评测"]
tags: ["AIGC", "视频生成", "质量评测", "VBench", "VLM"]
---

# 从"像不像"到"合不合理"：AIGC 视频生成质量评测的方法演进与实践

> 摘要：AIGC 生成质量评测的主线，已经从"与参考答案有多像"（FID、CLIP、词重叠）转向同时衡量**真实感、语义/指令一致性、结构与时序一致性、事实正确性与物理合理性**。本文梳理了这条演进脉络中的关键工作——VBench、VMBench、VideoScore、VBench-2.0、VideoPhy-2、PhyWorldBench、Video-Bench 等——并结合笔者搭建生成视频合理性评测系统的实践经验，讨论"多维诊断 + 专项算法 + VLM 仲裁"这一路线该怎么落地、有哪些坑。

---

## 一、先厘清一件事：我们在评测什么

过去几年，AIGC 评测最容易犯的错误，是把四个不同层次的概念混为一谈：

- **评价对象（judge what）**：画质、时序、运动、物理、prompt 对齐；
- **测试内容（test what）**：人体、动物、数量、空间关系、碰撞、状态变化；
- **评价方法（measure how）**：光流、追踪、嵌入相似度、专项分类器、VLM 问答；
- **标签协议（label how）**：二分类、连续分、1–5 Likert、成对偏好、不可判定。

一个经典误区是：把某个自动指标（比如光流、CLIP 相似度）当成一个独立的质量维度。光流大只说明"画面动得多"，既不代表"动得对"，也不代表"动得好"。EvalCrafter 就发现，光流幅度这类指标对高动态的坏视频反而可能给出高分——"运动幅度"不能直接作为"运动质量"的正向代理（EvalCrafter, arXiv:2310.11440）。

一篇跨文本、视觉、语音的评测综述，将自动评测方法归纳为五类：**启发式、嵌入式、学习型、LLM/VLM 型、基准测试型**（arXiv:2506.10019）。这张表值得贴在墙上：

| 方法类型 | 基本思路 | 典型优点 | 主要问题 |
| --- | --- | --- | --- |
| 启发式指标 | 词重叠、像素误差、信噪比、编辑距离 | 快、便宜、可复现 | 只覆盖表层质量，与人类偏好相关性有限 |
| 嵌入相似度 | 比较预训练表示 | 能识别语义相似与跨模态对齐 | 受底层模型偏差影响，复杂关系与事实错误易漏检 |
| 学习型评估器 | 用人工评分/偏好训练质量模型 | 可拟合人类判断 | 依赖标注数据，跨域泛化有限 |
| LLM/VLM 评审 | 让模型按标准打分、比较、批评 | 处理开放式输出并生成解释 | 位置/长度偏差、自我偏好、幻觉、不稳定 |
| 基准测试 | 设计覆盖特定能力的题集 | 测组合能力、事实性、长尾 | 依赖题集设计，易被提示模板过拟合 |

对视频生成而言，情况比图像更复杂：视频不仅要"每一帧都好看"，还要在时间上连续、运动上合理。一篇视频生成评测综述把常见错误归纳为六类（arXiv:2410.19884）：技术错误（模糊/低清/伪影）、动态错误（动作不足近似静态）、物理错误（违反重力/碰撞）、一致性错误（人物物体颜色形状突变）、结构质量错误（几何畸变/缺失部件）、指令对齐错误（遗漏或添加 prompt 内容）。

---

## 二、VBench：把"视频好不好"拆成 16 个可诊断的问题

VBench 是视频生成评测的一个分水岭（arXiv:2311.17982）。它的核心判断是：FVD、IS、CLIP 这类单值指标既难以充分反映人类判断，也无法揭示模型"在哪些能力上失败"。于是它把评测拆成两大类、16 个解耦维度：

**Video Quality（只看视频本身好不好）**：
- Subject Consistency（主体一致性）
- Background Consistency（背景一致性）
- Temporal Flickering（时序闪烁）
- Motion Smoothness（运动平滑度）
- Dynamic Degree（动态程度）
- Aesthetic Quality（审美质量）
- Imaging Quality（成像质量）

**Video-Condition Consistency（看是否满足用户条件）**：
- Object Class、Multiple Objects、Human Action、Color、Spatial Relationship、Scene、Appearance Style、Temporal Style、Overall Consistency

VBench 的研究范式比它提出的具体指标更值得保留：它不是问"这个视频总体好不好"，而是问"**在这个特定能力上，哪个视频更好**"。每个维度配专门 prompt、专门评测方法，再用人类成对偏好标注验证每个维度与人类判断的相关性。多数维度取得了较高相关性，但颜色、人类动作等复杂语义维度相对困难。

一个非常重要的发现是：**时序一致性和动态程度之间存在潜在冲突**。一个模型可以生成几乎静止的视频，从而获得极高的帧间一致分，但它根本没有生成有意义的动作。所以"稳不稳定"必须和"是否发生了正确变化"联合判断——这一点在我自己的实践中反复踩坑，后文会细说。

---

## 三、从"看起来真实"到"内在真实"：VBench-2.0

VBench-2.0 提出了一个关键区分（arXiv:2503.21755）：

- **Superficial Faithfulness（表面真实性）**：画面清晰、平滑、像真的；
- **Intrinsic Faithfulness（内在真实性）**：遵守物理规律、常识、人体结构、对象关系和事件逻辑。

它在原有基础上新增五个大类、18 个细粒度能力：Human Fidelity（人体解剖/身份/服装/人物交互）、Controllability（动态空间关系/动作顺序/复杂场景）、Creativity（多样性/构图/复杂剧情）、Physics（力学/热学/材料/多视角一致性）、Commonsense（运动合理性/实例保持/物体状态变化）。

VBench-2.0 使用了三类评估器，这个设计透露了一个重要趋势：

1. **VLM 生成视频描述，LLM 判断描述是否符合 ground truth**；
2. **视频问答**：用多组问题检查关键对象、动作和状态是否存在；
3. **专门的异常检测器**：处理人体畸变、实体分裂、物体合并等通用 VLM 不擅长的错误。

结论是：**通用 VLM 不是所有视频错误的最佳评估器**。对于物体计数、人体解剖、实体身份变化和细粒度时序异常，专门模型往往更可靠。它揭示的模型共性问题也很有参考价值：复杂多场景剧情弱、简单属性变化也常完不成、长时序人体运动不稳定、物理与常识能力没有随画面质量同步提升。

---

## 四、VMBench：运动质量该拆成五个问题

VMBench 是运动质量专项基准（arXiv:2503.10076），它的出发点是：现有评测往往关注静态画质、文本对齐或简单运动平滑，却不能充分识别"运动是否自然、是否符合人体与物理常识、是否真的被人感知为合理"。它把运动质量拆成五个符合人类感知流程的指标（合称 PMM，Perception-Driven Motion Metrics）：

| 指标 | 含义 | 检测的问题 |
| --- | --- | --- |
| OIS 对象完整性 | 运动中人/物是否形变、断裂、结构异常 | 手脚长度突变、身体融合、边缘撕裂 |
| PAS 可感知幅度 | 主体是否真的在动（剥离镜头运动） | 画面有变化但主体几乎不动 |
| TCS 时序连贯 | 对象是否无故消失、重现、身份跳变 | 突然出现/消失、轨迹跳变 |
| MSS 运动平滑 | 是否出现闪烁、突变、运动模糊 | 光流平滑但局部形变 |
| CAS 常识合理 | 动作是否符合物理与日常经验 | 无惯性、无重心变化、碰撞无反应 |

其中三个设计尤其值得借鉴：

- **PAS 把主体运动和镜头运动分开**：用 GroundingDINO 定位主体、Grounded-SAM 取掩码、CoTracker 跟踪关键点，再按主体关键点位移算幅度。简单用全局光流会把"镜头摇得很大"误判成"主体运动很充分"。
- **TCS 区分真实遮挡和生成错误**：物体被遮挡、出画、因景深变小并不一定是错误，规则过滤掉这些合法事件后，才对无法解释的消失/跳变扣分。
- **CAS 是一个学习型分类器而非规则指标**：用约 1 万条生成视频和 VideoReward 偏好数据生成五级标签（Bad/Poor/Fair/Good/Perfect），再用 VideoMAEv2 训练分类器，以五级预测概率计算加权 MOS。

在人类对齐实验中，PMM 平均 Spearman 相关约 0.622，各维度 CAS 0.699、MSS 0.771、OIS 0.658、PAS 0.652、TCS 0.545；相比规则型指标和直接 MLLM prompting，平均相关性提升约 35.3%。这个数字说明：把笼统的"Motion Quality"拆成更贴近人类感知的五个子问题，比只算光流或帧间相似度更接近人类判断。

---

## 五、物理真实性：画面逼真 ≠ 物理正确

物理合理性是最容易被"画面逼真"掩盖的维度。一个视频可以光影自然、画面漂亮，但苹果下落速度不变、碰撞后没有动量变化、玻璃落地不破碎、物体凭空漂浮或穿透。

VideoPhy / VideoPhy-2 集中评测生成视频能否在正确呈现动作的同时遵守物理常识（arXiv:2406.03520、arXiv:2503.06800），提出三类标签：

- **SA（Semantic Adherence）**：prompt 中的实体、动作、关系、时序是否准确呈现，1–5 分；
- **PC（Physical Commonsense）**：仅依视频判断对象属性、运动与力、交互反应是否现实，1–5 分；
- **PR（Physical Rules, VideoPhy-2）**：针对每条候选物理规则判断是否遵守，**0=违反 / 1=遵守 / 2=无法确定**。

其中 PR 的"无法确定"非常重要：物理规则可能不可见、被遮挡或无法从视频证据可靠判断，不应强制二分类。联合指标也强调：只有 SA 和 PC 都达到较高水平才计高分，避免"物理正确但完全没执行动作"的静态/无关视频拿高分。

PhyWorldBench 则把物理评测进一步落到**事件级、现象级的可验证标准**（arXiv:2507.13428）。它设计了 1,050 个 prompt（覆盖 969 类运动），每条视频按两级标准做 Yes/No 判断：

- **Basic Standards**：关键对象/事件是否真的出现（如"是否出现苹果和树枝""苹果是否向下掉落"）；
- **Key Standards**：关键物理现象是否出现且合理（如"速度是否随时间增加""轨迹是否合理"）。

它揭示的现象很值得警惕：物理增强 prompt 通常比普通 prompt 更容易得到物理合理结果；碰撞、破碎、突然状态变化尤其困难；**模型容易生成"电影化的平滑动作"，而不是严格遵守物理规律**。这意味着物理评测不能只依赖整体审美分数，而要使用事件级、现象级的可验证标准。

---

## 六、让 MLLM 更可靠地评审：Video-Bench 与 LLM-as-a-Judge

近两年最重要的变化是让 LLM/VLM 充当评审器。但 LLM 评审不能直接当作"自动真值"。LLM-as-a-Judge 综述系统梳理了它的偏差（arXiv:2411.15594）：位置偏差（偏好第一个/第二个候选）、长度偏差（偏好更长答案）、具体性偏差、自我增强偏差（偏爱同系列模型）、文化与语言偏差、提示词敏感性、对无关系统提示或对抗措辞的脆弱性。

因此比较可靠的流程是：随机交换候选顺序、多次采样、多数投票，并在一小部分样本上与人工结果校准。综述实验也显示，LLM 评审与人类判断之间仍存在明显差距，推理能力更强并不必然带来稳定的人类偏好一致性。

Video-Bench 重点研究如何让 MLLM 更可靠地评估视频（arXiv:2504.04907），它有两项核心技术：

1. **Chain-of-Query（CoQ）**：不让 MLLM 直接从"视频 + prompt"输出一个分数，而是分两步——先让 MLLM 专门描述视频的某一方面（颜色、动作、主体），再根据多个细化问题判断描述与 prompt 是否一致。例如评估"一只棕色考拉在冲浪"，依次问：是否有考拉？是否在冲浪？颜色是否为棕？动作是否完整？波浪与考拉关系是否合理？本质是把一个困难的跨模态判断拆成多个容易验证的局部问题。

2. **Few-shot scoring**：给 MLLM 提供若干带分数的视频示例，让它学习评分尺度，解决"3 分和 4 分到底差多少"的绝对评分问题。

它的稳定性结果很有启发：重复运行时完全相同分数的比例约 67%，但 Krippendorff's alpha 达 0.867——评估器可能有少量分数抖动，但整体排序仍然稳定。实践结论是：**CoQ + few-shot 比"请 GPT-4o 给视频打 1–10 分"可靠得多**。

另一个路线是学习型评估器。VideoScore 用约 37,600 条视频在五个维度（Visual Quality、Temporal Consistency、Dynamic Degree、Text-to-Video Alignment、Factual Consistency）上做人工评分，训练专门的质量评估模型（arXiv:2406.15252）。它的平均 Spearman 相关达 77.1，显著高于传统特征指标和直接 prompting 的 GPT-4o/Gemini 评审。这再次印证：直接让通用 MLLM"看视频打分"效果不一定好，在多维人工反馈上专门训练的评估器往往更稳定——但代价是需要大量高质量人工标注，且受训练分布限制。

---

## 七、我的实践：一个"可诊断合理性"评测系统的思路与经验

基于上面的调研，我在实践中搭建了一个面向生成视频的**合理性评测系统**。这里不展开具体实现细节，只谈思路、借鉴方式和踩坑经验。

### 7.1 核心思路：多维诊断，而非单一总分

系统的第一性原理是：**"视频是否合理"不是一个分数，而是一组可以各自独立诊断的能力**。因此我把它拆成了若干彼此解耦的维度，每个维度有自己的适用性判定（能不能评）、证据（依据什么）、异常定位（哪里出了问题）和分数。这一思想直接来自 VBench 的维度分解范式。

每个维度的内部，我采用"**专项算法信号 + VLM 开放语义仲裁**"的组合，而不是单一的 CLIP 分或单一的 VLM 总分：

- 对可精确测量的信号（人脸身份漂移、人体关键点结构、光流平滑度、对象出现/消失），用专项模型或规则给出可定位的证据；
- 对开放世界语义与常识（生物结构是否真的异常、动作是否自然、物理是否违规），让 VLM 在算法提供的候选证据上做仲裁，而不是让 VLM 从头看全片。

这个设计来自 VBench-2.0 的启示——通用 VLM 不是所有错误的最佳评估器，物体计数、人体解剖、实体身份变化等需要专项模型兜底。

### 7.2 借鉴了什么

**从 VMBench 借运动质量拆解**：PAS 的"分离镜头运动与主体运动"、OIS 的"运动中的结构完整性"、TCS 的"区分合法遮挡与生成错误"，分别对应我系统中运动维度与时间一致性维度的几个子信号。尤其是 PAS 的教训——不能把全局光流当成主体运动——直接避免了一类"镜头动得大被误判为主体在动"的错误。

**从 VideoPhy-2 / PhyWorldBench 借"不可判定"与两级标准**：物理、遮挡等场景天然存在"证据不足"，强制二分类会把"看不清"混同于"正常"。我引入了"不可判定/不适用"的语义，并尝试把物理合理性拆成"对象/事件是否真的出现（Basic）"与"物理现象是否合理（Key）"两级，避免"动作没发生所以没有物理错误"的假高分。

**从 Video-Bench 借 CoQ 与 few-shot**：对 VLM 评审，我采用了"强制分步推理 + 动态规则注入 + few-shot 参考图"的 prompt 设计，并引入结构化 JSON 输出与后处理归一化，而不是让模型自由发挥。这与 Video-Bench 的 CoQ + few-shot scoring 同路线。

**从 LLM-as-a-Judge 借自一致性投票**：对最依赖语义判断的维度，我做了多次并行采样 + 多数票决（verdict 多票决、数值取中位数、列表取并集），用并发调用摊平额外延迟。这直接对应"重复评测 + 多数投票"的可靠流程。

### 7.3 经验总结：五条最值得记下的教训

**第一，"合理"和"遵循"要分层。** 系统最开始只评"视频自身是否合理"，后来才意识到：能判断主体漂移、物理违规，却回答不了"prompt 要求的对象、数量、属性、关系、动作顺序是否都出现了"。这是两件事——前者是内在合理性，后者是条件遵循。VBench 的 Video-Condition Consistency 一整块，和 VBench-2.0 的 Controllability，都属于后者，需要独立的输入（prompt/参考图/控制信号）和独立的输出结构，不能用一个全局 CLIP 分或一句 VLM 总评混进物理/时序分里。

**第二，警惕"静态视频高一致分"陷阱。** VBench 指出的"时序一致性与动态程度冲突"在实践中非常真实：一个几乎不动的视频，帧间一致性接近满分，但它没有完成任何动作。所以"稳定"必须与"是否发生了预期变化"联合判断，评分策略里要显式处理这种冲突，而不是简单加权平均。

**第三，VLM 单点依赖是脆弱的设计。** 如果某个维度在 VLM 可用时直接采用 VLM 分、不可用时才降级，那么这个维度本质上就退化成了"黑盒单判"。VMBench 的 CAS 和 VideoScore 都说明：学习型/专项评估器比直接 prompting 通用 VLM 更稳定。正确的姿势是把 VLM 当作仲裁者，用算法证据去约束它，而不是当唯一裁判。

**第四，评测器本身也要被评测。** 自一致性投票只是起点，不能默认"多数投票一定提升人类一致性"。LLM-as-a-Judge 列出的位置偏差、长度偏差、自我偏好，以及 Video-Bench 报告的"67% 精确重复率但 alpha 0.867"，都说明需要建立固定的校准集，定期报告重复一致率、后端一致率、候选顺序一致率、跨域切片和与人工的相关性。

**第五，物理正确不等于画面好看。** PhyWorldBench 揭示的"电影化平滑动作"现象——模型倾向生成视觉上流畅但违反物理的运动——意味着物理维度必须用事件级、现象级的可验证标准去测，不能被高分辨率、景深和电影化镜头带偏。

---

## 八、总结

AIGC 视频质量评测的演进可以概括为一条清晰的脉络：

```
单一总分（FVD/CLIP）
  → 多维诊断（VBench 16 维）
  → 学习型评估器（VideoScore）
  → 内在真实性与专项能力（VBench-2.0 / VMBench / PhyWorldBench）
  → 更可靠的 MLLM 评审方法论（Video-Bench）
```

未来较可靠的评测系统，不会由某个单一指标取代人工，而会采用"**任务分解的自动指标 + 多模态评审器 + 小规模人工校准 + 偏差与鲁棒性测试**"的组合。其中最关键的转变，是把"质量"从一个抽象总分，拆成可诊断的能力维度，并针对不同模态分别建模：文本侧重事实性与指令遵循，图像侧重组合关系与知识一致性，视频侧重时序与物理合理性，音频侧重自然度、语义与跨模态同步。

对视频而言，我更愿意用一句话总结这个领域的核心共识：**评测一个生成视频，不是问"它好不好看"，而是问"它在这一项能力上，是否真的合理"**——而"合理"这个词，需要被拆解到每一帧、每一段运动、每一条物理规则，才能被真正测量。

---

## 参考文献

1. VBench: *VBench: Comprehensive Benchmark Suite for Video Generative Models*. [arXiv:2311.17982](https://arxiv.org/abs/2311.17982)
2. VBench++: *VBench++: Comprehensive and Versatile Benchmark Suite for Video Generative Models*. [arXiv:2411.13503](https://arxiv.org/abs/2411.13503)
3. VBench-2.0: *VBench-2.0: Advancing Video Generation Benchmark Suite for Intrinsic Faithfulness*. [arXiv:2503.21755](https://arxiv.org/abs/2503.21755)
4. VMBench: *VMBench: A Benchmark for Perception-Aligned Video Motion Generation*. [arXiv:2503.10076](https://arxiv.org/abs/2503.10076)
5. VideoScore: *VideoScore: Building Automatic Metrics to Simulate Fine-grained Human Feedback for Video Generation*. [arXiv:2406.15252](https://arxiv.org/abs/2406.15252)
6. Video-Bench: *Video-Bench: A Comprehensive Benchmark and Evaluation Methodology towards Reliable Video Understanding with MLLMs*. [arXiv:2504.04907](https://arxiv.org/abs/2504.04907)
7. VideoPhy: *VideoPhy: Evaluating Physical Commonsense for Video Generation*. [arXiv:2406.03520](https://arxiv.org/abs/2406.03520)
8. VideoPhy-2: *VideoPhy-2: A Challenging Action-Centric Physical Commonsense Evaluation in Video Generation*. [arXiv:2503.06800](https://arxiv.org/abs/2503.06800)
9. PhyWorldBench: *PhyWorldBench: Benchmarking Physical World Model for Video Generation*. [arXiv:2507.13428](https://arxiv.org/abs/2507.13428)
10. EvalCrafter: *EvalCrafter: Benchmarking and Evaluating Large Video Generation Models*. [arXiv:2310.11440](https://arxiv.org/abs/2310.11440)
11. T2V-CompBench: *T2V-CompBench: A Comprehensive Benchmark for Compositional Text-to-video Generation*. [arXiv:2407.14505](https://arxiv.org/abs/2407.14505)
12. FETV: *FETV: A Benchmark for Fine-Grained Evaluation of Open-Domain Text-to-Video Generation*. [arXiv:2311.01813](https://arxiv.org/abs/2311.01813)
13. AIGCBench: *AIGCBench: Comprehensive Evaluation of Image-to-Video Content Generated by AI*. [arXiv:2401.01651](https://arxiv.org/abs/2401.01651)
14. VideoReward: *Improving Video Generation with Human Feedback*. [arXiv:2501.13918](https://arxiv.org/abs/2501.13918)
15. WISE: *WISE: A World Knowledge-Informed Semantic Evaluation for Text-to-Image Generation*. [arXiv:2503.07265](https://arxiv.org/abs/2503.07265)
16. A Survey on LLM-as-a-Judge. [arXiv:2411.15594](https://arxiv.org/abs/2411.15594)
17. A Survey of Automatic Evaluation Methods on Text, Visual and Speech Generations. [arXiv:2506.10019](https://arxiv.org/abs/2506.10019)
18. A Survey of AI-Generated Video Evaluation. [arXiv:2410.19884](https://arxiv.org/abs/2410.19884)
