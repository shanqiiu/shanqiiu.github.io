---
title: '大模型部署与运维：从"Ollama 入门"到"vLLM 生产实践"'
date: 2026-08-20T16:22:00+08:00
draft: false 

categories: ["技术文章", "AI", "大模型"]
tags: ["大模型部署", "Ollama", "vLLM", "llama.cpp", "运维", "RAG"]
---

> 调 API 不等于会"部署"。当需求从"写个 demo"变成"7×24 在线、数据不出内网、扛住并发"，真正要掌握的是模型服务的部署与运维能力。本文整理一条面向工程落地、由浅入深的路径：先用 Ollama 跑通，再理解 llama.cpp 的量化原理，最后用 vLLM 上生产；并给出国内可用的硬件与架构配置参考。

---

## 1. 为什么要学部署与运维

绝大多数算法同学的第一反应是"直接调云端 API"。但这条路在真实业务里有明显天花板：

- **数据隐私**：金融、政务、医疗场景的数据不能出内网；
- **成本**：按 token 计费，批量任务/7×24 在线时费用迅速失控；
- **定制化**：需要微调、改结构、接私有知识库；
- **离线可用**：内网、出差、无网环境仍要能用。

一个常见的误区是"本地部署 = 完全替代云端"。现实里更优的策略是**云端 + 本地混合**：日常对话用云端 API（效果最好），敏感数据用本地模型（保隐私），批量任务用本地模型（省成本）。本文聚焦"本地/私有化部署"这条线，不涉及云端 API 调用本身。

---

## 2. 工具全景与选型

当前主流推理栈呈"连续谱"分布，按场景直接选：

| 工具 | 定位 | 硬件要求 | 优势 | 适合人群 |
| --- | --- | --- | --- | --- |
| **Ollama** | 一键式、全平台 | 4GB+ 显存 / CPU | 零配置、自动 API、模型库丰富 | 个人、快速原型、服务端 |
| **llama.cpp** | 极致轻量、C++ 推理 | CPU / 低配 GPU | 纯 CPU 流畅、GGUF 量化、速度快 | 低配设备、边缘端、想控细节 |
| **vLLM** | 高吞吐、GPU 优化 | NVIDIA GPU | PagedAttention、连续批处理、快 5–10× | 生产、高 QPS、多 GPU |
| **TGI** | Hugging Face 官方服务 | 多 GPU | 工程化、健康检查、容器友好 | 企业级、HF 生态 |
| **LM Studio** | GUI 可视化 | 6GB+ 显存 | 零命令行、模型市场、滑块调参 | 非技术、Mac 用户 |
| **Open WebUI** | Web 界面、多后端 | 任意 | 多用户、会话、插件、私有化 | 团队、私有化 Web 服务 |

一句话选型：

- 个人 / 快速原型 → **Ollama**
- 纯 CPU / 低配 GPU → **llama.cpp**
- NVIDIA GPU / 高并发 → **vLLM**
- 企业级 / HF 生态 → **TGI**
- 非技术 / 可视化 → **LM Studio**
- 团队 / 私有化 Web → **Open WebUI**（常作为 Ollama/vLLM 的前端）

> Ollama 本质上是"穿了西装的 llama.cpp"——底层推理引擎仍是 llama.cpp，只是把下载、量化、服务打包成一个二进制。理解这一点，后面两条路径就不冲突了。

---

## 3. 最简路径示范：Ollama + Open WebUI（10 分钟上手）

这是最推荐的新手起点。一条 `docker-compose.yml` 即可同时拉起推理引擎和聊天界面，数据全程在本地，断网也能用。

### 3.1 前置条件

- 一台内存足够的机器（CPU 跑 7B 模型需 ≥8GB 可用内存，GPU 加速需 ≥8GB 显存）；
- 安装 Docker 与 Docker Compose；
- 20GB+ 硬盘空间（7B 模型约 14GB）。

没有 GPU 也能跑——CPU 下 7B 模型约 3–5 token/s，查资料、写文本、聊天完全够用，只是不是"实时对话"体感。

### 3.2 部署文件

```yaml
# docker-compose.yml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ./ollama/models:/root/.ollama
    environment:
      - OLLAMA_KEEP_ALIVE=24h   # 模型常驻内存，对话秒响应

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    restart: unless-stopped
    ports:
      - "3000:8080"
    volumes:
      - ./open-webui/data:/app/backend/data
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
    depends_on:
      - ollama
```

### 3.3 启动与验证

```bash
# 1. 启动所有服务
docker compose up -d

# 2. 拉取一个中文友好的 7B 模型（约 14GB，首次需联网）
docker exec ollama ollama pull deepseek-r1:7b

# 3. 验证 Ollama 推理是否正常
curl http://localhost:11434/api/generate \
  -d '{"model":"deepseek-r1:7b","prompt":"你好，请用一句话介绍自己"}'
```

返回 JSON 中含 `response` 字段即部署成功。浏览器访问 `http://localhost:3000`，首次注册一个**本地账号**（信息存在你本地 `./open-webui/data`，不上传任何服务器），左上角切换 `deepseek-r1:7b` 即可对话。

### 3.4 模型推荐（新手第一发）

| 模型 | 参数量 | 推荐显存 | 中文能力 | 适用场景 |
| --- | --- | --- | --- | --- |
| DeepSeek-R1:7B | 7B | 8GB | 极强 | 推理分析（首选） |
| Qwen2.5:7B | 7B | 8GB | 极强 | 日常对话、写作 |
| Qwen2.5:1.5B | 1.5B | 2GB | 较强 | 低配机器专用 |
| Llama3.1:8B | 8B | 10GB | 一般 | 英文任务为主 |

> 机器只有 4GB 内存就选 `Qwen2.5:1.5B`；其余情况新手直接 `deepseek-r1:7b`。`OLLAMA_KEEP_ALIVE=24h` 让模型常驻内存，避免每次对话前重新加载等十几秒。

### 3.5 外网访问（可选，注意安全）

- **Tailscale 组网**（推荐）：手机装 Tailscale，通过虚拟 IP 直连，端到端加密、不走公网，延迟更低；
- **Nginx Proxy Manager 反代**：配域名 + HTTPS，适合手机浏览器直接访问。

大模型对话数据量不大但涉及隐私，**优先 Tailscale 而非直接暴露公网端口**。

---

## 4. 进阶：理解原理与生产升级

### 4.1 llama.cpp —— 想把推理"看透"就走这条

当 Ollama 的黑盒不够用（要精确控制哪些层放 GPU、用多少线程、什么采样参数），直接去引擎层：

```bash
# 编译（CUDA 加速）
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
cmake -B build -DGGML_CUDA=ON
cmake --build build --config Release -j$(nproc)

# 下载 GGUF 量化模型并启动服务
./build/bin/llama-server \
  -m models/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf \
  -ngl 35 \      # 卸载到 GPU 的层数（7B 全卸载设 99）
  -c 8192 \      # 上下文窗口，越大越吃显存
  -t 8 \         # CPU 线程数（仅影响未卸载到 GPU 的层）
  --mlock        # 锁定内存防 swap，保证稳定
```

关键旋钮：上下文长度从 4K 调到 32K，显存可能翻倍；Q4 量化比 Q8 省一半显存、效果损失约 2%–5%。量化是本地部署的"核心开关"。

### 4.2 vLLM —— 真正上生产

单卡、单用户用 Ollama 没问题；一旦要**多用户共享一台 GPU、扛并发、低延迟**，就必须上 vLLM。它的核心价值是 **PagedAttention**（像虚拟内存一样管理 KV cache，消除 60%–80% 的显存碎片）和**连续批处理**（新请求无需等待当前批次结束）。

```bash
pip install vllm

# 启动 OpenAI 兼容服务
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --tensor-parallel-size 1 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.9 \
  --port 8000
```

调用方式与 OpenAI 完全一致，只换 `base_url`：

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8000/v1", api_key="not-needed")
resp = client.chat.completions.create(
    model="Qwen/Qwen2.5-7B-Instruct",
    messages=[{"role":"user","content":"解释一下 PagedAttention"}],
)
```

> 本地模型并发能力有限（Ollama/llama.cpp 近似串行），**不适合做高并发在线服务**；这是切换到 vLLM 的根本理由。

---

## 5. 国内可用配置参考

结合国内采购与合规现实，给出可落地的硬件与架构判断。

### 5.1 GPU 型号怎么选

| 场景 | 推荐型号 | 显存 | 说明 |
| --- | --- | --- | --- |
| 个人 / 体验 | RTX 4070 / 4060 | 8–12GB | 轻量 7B，CPU 模式也能跑 |
| 个人 / 高性价比 | RTX 4090 / 3090 | 24GB | 跑 7B–14B 流畅，二手 3090 便宜；注意无 NVLink、电源散热 |
| 开发 / 小团队 | A10 / RTX 4090×2 | 24GB×N | 多卡可 tensor-parallel |
| 数据中心（特供） | **H20 / A800** | 96–640GB | NVIDIA 对华出口合规版，替代 A100/H100 |
| 国产算力 | **华为昇腾 910B** | 64GB | 需 MindIE 或 vllm-ascend 插件，**不能直接用 Ollama** |

几点现实判断：

- **主流生态仍是 NVIDIA CUDA**——Ollama、llama.cpp、vLLM 原生支持；
- **国产卡首选昇腾 910B**，但推理栈要换成华为 **MindIE** 或社区 **vllm-ascend** 后端，迁移成本要算进去；
- **模型权重下载需联网一次**：HuggingFace 国内不稳，建议用 **ModelScope（魔搭）** 镜像源拉取权重，再离线部署。

### 5.2 要不要内网部署

| 场景 | 建议 | 理由 |
| --- | --- | --- |
| 金融 / 政务 / 医疗 | **必须内网** | 数据合规、不能出网 |
| 企业内部知识库 | **建议内网** | 文档不外泄 |
| 个人 / 实验 | 可公网可内网 | 看隐私需求 |
| 对外公共服务 | 云端 + 内网混合 | 敏感数据走内网，通用走云端 |

注意：Ollama / vLLM / llama.cpp 都支持纯离线推理，但**权重下载、首次依赖安装需联网**。内网环境提前在可联网机器下载好镜像与权重，再拷入内网。

### 5.3 要不要接 RAG

取决于"是否要基于私有文档问答"：

- **纯对话 / 通用任务**：不接 RAG，直接对话即可；
- **内部文档问答（报销流程、技术规范、产品文档）**：**建议接 RAG**；
- **最简单方案**：Open WebUI 内置文档上传与问答，底层用 Ollama 的 `nomic-embed-text` 做 embedding，零额外组件；
- **生产方案**：embedding 模型（如 `bge-large-zh`）+ 向量库 **Chroma**（轻量）/ **Milvus**（分布式）+ vLLM 生成。

> 私有知识库的核心价值：把内部文档喂给本地模型，员工直接提问，数据不出内网、7×24 免费可用。RAG + 本地模型是当前"数据合规"场景最稳的组合。

---

## 6. 生产运维要点

当服务要长期在线，重点关注四件事：

**容器化**：Docker 打包，Kubernetes 编排，Deployment 管理副本生命周期。

**监控告警**：Prometheus + Grafana 采集 GPU 利用率、显存、吞吐、延迟；示例规则——GPU 利用率持续 >90% 超过 5 分钟触发告警。

**弹性伸缩**：基于 CPU/GPU 利用率水平扩容；工作日/周末设置不同副本数；保留最近 3 个成功镜像版本以便回滚。

**安全**：自托管若不做安全，比用云服务更危险。生产建议 Nginx 反代 + API Key 鉴权；端口绑定 `127.0.0.1` 而非 `0.0.0.0`，对外只暴露经鉴权的入口。

**故障恢复**：每 30 秒探测 `/health` 端点；Kubernetes ReplicaSet 保障副本数；定期快照模型权重到对象存储。

高频坑：OOM（降 batch size / 启用量化）、首字延迟高（模型未常驻内存）、并发上不去（该切 vLLM 了）、模型加载失败（权重 MD5 校验 + CUDA 版本匹配）。

---

## 7. 部署后如何验证性能：首字延迟与吞吐压测

部署完不等于能上线。至少验证两项核心指标：**首字延迟（TTFT, Time To First Token）** 与 **吞吐量（Throughput）**。

| 指标 | 含义 | 7B 模型合格参考 |
| --- | --- | --- |
| 首字延迟 TTFT | 发请求到收到第一个 token | 单卡 < 500ms |
| 吞吐量 | 每秒生成 token 数 | vLLM 单卡 ≥ 50 tok/s |
| 显存占用 | `nvidia-smi` 峰值 | ≤ 90% 峰值，留 10% 余量 |

**手动验证 TTFT（curl）：**

```bash
time curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"Qwen/Qwen2.5-7B-Instruct","messages":[{"role":"user","content":"你好"}],"max_tokens":64}'
```

**并发压测（Python 异步，测吞吐与 P99 延迟）：**

```python
import asyncio, time
from openai import AsyncOpenAI

async def bench(base_url, model, n=100, conc=10, max_tokens=128):
    client = AsyncOpenAI(base_url=base_url, api_key="not-needed")
    sem = asyncio.Semaphore(conc)
    ttfts, lat = [], []

    async def one(prompt):
        async with sem:
            t0 = time.perf_counter()
            ttft = None
            stream = await client.chat.completions.create(
                model=model, messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens, stream=True,
            )
            async for chunk in stream:
                if ttft is None and chunk.choices[0].delta.content:
                    ttft = time.perf_counter() - t0
            lat.append(time.perf_counter() - t0)
            ttfts.append(ttft)

    prompts = [f"解释概念 {i}" for i in range(n)]
    t_start = time.perf_counter()
    await asyncio.gather(*[one(p) for p in prompts])
    wall = time.perf_counter() - t_start

    print(f"请求数={n}  总耗时={wall:.2f}s  吞吐={n / wall:.1f} req/s")
    print(f"平均首字延迟={sum(ttfts) / len(ttfts) * 1000:.0f}ms"
          f"  P99延迟={sorted(lat)[int(0.99 * len(lat))] * 1000:.0f}ms")

asyncio.run(bench("http://localhost:8000/v1", "Qwen/Qwen2.5-7B-Instruct"))
```

> 更重的场景可用 **Locust** 做多轮压力测试；Ollama 侧用 `ollama ps` 看模型是否常驻、用 `nvidia-smi` 看显存。压测发现吞吐上不去、并发一高就排队，基本就是该从 Ollama 切到 vLLM 的信号。

## 8. 靠谱学习资源清单

> 提醒：2026 年涌现大量"保姆级"SEO 软文（尤其堆云厂商广告的），优先级应是 **官方文档 > 社区博客 > 营销软文**。

**入门（最推荐，可直接照抄命令）**
- Ollama + Open WebUI 一条龙（中文，Docker Compose 一把梭，含 GPU 加速与外网访问）
- 《AI 零基础第六课：本地部署与开源大模型》——讲清动机、选型、私有知识库搭建
- *Running LLMs Locally in 2026*（45 分钟，Ollama→llama.cpp→vLLM 三步对照，附显存/带宽账）

**框架原理与选型**
- 《本地大模型部署（框架总览）》——一张表对比 Ollama/llama.cpp/vLLM/TGI/LM Studio，含量化技巧与选型决策树
- *Self-Hosting with llama.cpp + vLLM*——实战向，含 Nginx 反代 + API Key 鉴权（安全部分常被忽略）
- **vLLM 官方文档** https://docs.vllm.ai —— 生产吞吐的权威来源

**运维（环境→高可用全流程）**
- 《2026 AI 大模型部署指南》——覆盖资源规划、K8s 清单、Prometheus 告警、自动扩缩容、故障恢复
- *daddaops.com local LLM deployment*——讲透 `-ngl`/`-c`/`--mlock` 调参旋钮与 KV cache 显存账

---

## 9. 结语

本地/私有化部署不是"妥协方案"，而是越来越靠谱的长期选择。给新手的最短路径很清晰：

> **先用 Ollama + Open WebUI 跑通（半天），理解 llama.cpp 的量化与显存账（一天），需要并发再上 vLLM（两天），最后用 Docker/K8s + Prometheus 补运维。**

其中，Ollama 负责"跑起来"，llama.cpp 负责"看透原理与控制"，vLLM 负责"扛生产"，Open WebUI 负责"人能用"。而这一切的前提，是先想清楚三个问题：**用什么 GPU、要不要内网、要不要接 RAG**——本文第 5 节已给出可直接照做的判断表。

---
