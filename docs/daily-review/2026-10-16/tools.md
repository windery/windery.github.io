# TokenSpeed：用 C++ 管请求与缓存，让 Python 执行模型推理

2026 年 10 月 16 日 · 工具篇 · 本地审阅稿，未发布

如果你正在自己部署模型，Agent 的一次任务会带来连续的推理请求，长输入、生成中的请求和缓存资源都需要调度。LightSeek Foundation 的开源推理引擎 **TokenSpeed** 把请求状态与缓存调度放进 C++，将模型执行保留在 Python，并提供兼容 OpenAI 接口的 HTTP 服务。它值得看的地方，是这套分工如何在代码里落实。

项目：[lightseekorg/tokenspeed](https://github.com/lightseekorg/tokenspeed) · MIT 许可证 · 本次 GitHub API 读取总星标 **2,513**。本文核对文档与源码，未安装或测量推理性能；代码观察固定在提交 `8ee249233900a664bfe50e9ad7ed745c21df0517`。

## 一次请求怎样走过 TokenSpeed

先区分两段模型工作：prefill 是处理输入、建立后续生成所需的中间状态；decode 是逐步生成输出。KV cache 保存注意力计算中的中间结果，避免每一步都重新计算完整历史。多条请求同时进行时，调度器既要决定下一轮算谁，也要决定缓存空间归谁使用。

TokenSpeed 的实现可以沿着下面三处阅读。

**第一处是请求状态。** `fsm/states.h` 用 C++ 的 `std::variant` 列出 Submitted、Prefilling、Decoding、Finishing、Finished 等状态；`Request::Apply` 则把事件作用到当前状态，并保存转换后的状态。等待输入处理、正在生成和正在结束由明确的状态类型表示，便于追踪一次请求在何时拥有哪些资源。[状态定义](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/fsm/states.h) · [请求与事件处理](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/scheduler/request.h)

**第二处是缓存资源的生命周期。** `CacheBlockRef` 保存共享所有权，控制块维护引用计数，最后一个引用释放时销毁其持有的缓存块对象。这回答了一个具体问题：缓存仍被其他使用方持有时，不能只因为一条请求结束就按“无人使用”处理。类型和所有权设计约束了操作方式，但不能由此推导整个系统已经消除了所有并发或内存错误。[缓存引用实现接口](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/cache/core/cache_block_ref.h)

**第三处是调度与执行的交接。** Python 事件循环从 C++ 调度器取得 `next_execution_plan()`，再交给设备执行入口。设计文档将控制逻辑与 GPU 工作分开，模型计算放到专门的执行线程中。编辑判断：这样的边界让调度状态的修改与模型执行代码的迭代各有归属，比只说“C++ 更快、Python 更灵活”具体得多。[事件循环代码](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/python/tokenspeed/runtime/engine/event_loop.py) · [控制与执行分工](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/docs/design/event-loop.md)

## 它与直接换一个模型 API 有什么不同

调用托管模型 API 时，调度、缓存和 GPU 通常由服务商管理；部署 TokenSpeed 后，这些运行条件成为自己的责任。它适合已有 GPU、需要研究推理部署或针对特定负载调优的团队，不是给订阅式编程助手增加一项能力的插件。

若已经在用 vLLM，兼容 OpenAI 接口也不足以成为迁移理由：两者都提供这一类服务入口。TokenSpeed 此次可核对的特色在于上面的调度与执行分工；是否比现有引擎更合适，仍取决于具体模型、硬件、并发量和输入输出长度。本文没有进行同条件对比，不采纳 README 中的性能定位作为实测结论。[TokenSpeed 服务入口](https://lightseek.org/tokenspeed/guides/launching) · [vLLM 服务文档](https://docs.vllm.ai/en/latest/serving/online_serving/)

## 怎样开始评估

官方入门文档给出了 NVIDIA GPU 路线，以及 ROCm 7.2 的安装路线。CUDA nightly 要求 CUDA 13 和 Python 3.11–3.13；H100/H200 的 CUDA 12.9 另有源码安装方案。不同 GPU 对应的内核、依赖和模型支持需要按文档选择，不能只看一条安装命令。

装好对应环境后，先用 `tokenspeed env` 查看环境，再检查 `tokenspeed serve --help`。官方最小启动示例使用 `openai/gpt-oss-20b` 和单路张量并行；服务成功启动之后，才适合进入实际负载测试。模型能否装入仍取决于硬件与配置，这个示例不是显存容量保证。[入门与安装](https://lightseek.org/tokenspeed/guides/getting-started)

我的评估建议是保留现有引擎作为对照，固定模型、精度、输入长度和并发，分别记录首 token 延迟、持续生成速度及错误情况。这样得到的结果才回答“我的 Agent 是否获益”；项目名称中的 Speed 和榜单星标都回答不了这个问题。

## 当日 GitHub AI 热门项目

以下来自本次读取的 GitHub 全语言日榜，按页面显示的当日新增星标降序整理。仅压缩项目自述来说明用途，不代表已逐个做代码审查。TokenSpeed 已在上文深挖，列表不重复列入；非 AI 项目 Ghidra 未纳入。

| 项目 | 用途 | 总 star | 当日新增 |
|---|---|---:|---:|
| [morluto/rea](https://github.com/morluto/rea) | 用 Agent 辅助分析应用行为与原生二进制 | 271,114 | 32,314 |
| [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio) | 本地语音克隆、转录、配音和听写工作台 | 69,155 | 3,024 |
| [K-Dense-AI/scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) | 面向科研任务的 Agent skills 集合 | 50,508 | 1,091 |
| [affaan-m/ECC](https://github.com/affaan-m/ECC) | 编程 Agent 的 skills、记忆与工作流配置 | 280,421 | 1,013 |
| [mksglu/context-mode](https://github.com/mksglu/context-mode) | 管理编程 Agent 的工具输出与会话上下文 | 29,803 | 904 |
| [xerj-org/xerj](https://github.com/xerj-org/xerj) | 为 Agent 索引并搜索代码、文档和日志 | 5,689 | 715 |
| [obra/superpowers](https://github.com/obra/superpowers) | 将软件开发流程组织为 Agent skills | 299,921 | 582 |
| [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | 通过简短表达规则和代理减少输出冗余 | 112,580 | 433 |
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | Anthropic 维护的 Claude Code 插件目录 | 39,135 | 307 |
| [ruvnet/ruflo](https://github.com/ruvnet/ruflo) | 多 Agent 编排、记忆与检索工作流 | 75,143 | 147 |

观察日期为 2026 年 10 月 16 日上午（Asia/Taipei），采集于 10:15 前。本表数字统一采用 [GitHub Trending 页面](https://github.com/trending?since=daily) 的同一份快照；“当日新增”是 GitHub 的页面口径，不是本站自行计算的自然日增量。榜单与稍后 API 查询可能有差异，因此没有混用二者的计数。
