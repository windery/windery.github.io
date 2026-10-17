# AI 日报四篇审阅稿

2026 年 10 月 16 日

## 一 新闻 GitHub 正式开放两项代码安全功能 Anthropic 向 METR 开放内部评估权限

今天的三条消息：

- **GitHub 正式开放自动修漏洞功能**：Copilot 根据安全告警修改代码，重新扫描后提交草稿 PR，面向企业云安全服务客户。
- **GitHub AI Scan 正式上线**：补充检查 PHP、Shell 和基础设施配置等代码变更，检查结果目前不能阻止合并。
- **Anthropic 扩大外部评估权限**：六名 METR 人员获得接近内部风险评估团队的访问权限，可以独立发表分析。

### GitHub 自动修漏洞功能正式开放 修复后会重新扫描

GitHub 于 10 月 15 日正式开放 agentic autofix。开发者把默认分支上的安全告警交给 Copilot 后，它会查找相关代码、生成修改，再运行代码扫描工具 CodeQL。告警仍在，就继续调整，最后提交附修复说明和验证记录的草稿 PR，等待审阅。一份 PR 最多可以处理 25 条告警。

这项功能面向 GitHub Enterprise Cloud 上购买了 Code Security 或 Advanced Security 的客户，需要管理员开启。运行会消耗安全服务的 AI 额度和 GitHub Actions 运行分钟；启用后，单条告警原先免费的 Generate Fix 入口会被替换。

它目前只接收默认分支上的告警，只在某个 PR 或其他分支出现的告警不能直接指派。重新扫描检查的是原告警是否消除，修改有没有影响业务功能，仍要结合项目自己的测试判断。

2026-10-15 · GitHub：[agentic autofix 正式开放](https://github.blog/changelog/2026-10-15-agentic-autofix-for-code-scanning-alerts-general-availability)

### GitHub AI Scan 扩大漏洞检查范围 结果目前只作建议

GitHub 同日正式上线 AI Scan，用 AI 检查 PR 中的代码变更，补充 CodeQL 尚未覆盖的语言和框架。范围包括 PHP、Shell 脚本、Terraform 配置和 Dockerfile，也覆盖部分 Java、C# 框架场景。维护者可以在 PR 中看到风险说明及可能的修复建议。

对同时修改应用代码和部署配置的团队，这意味着一次提交里的更多文件可以接受漏洞检查。不过，AI Scan 的结果目前只作建议，不会使安全检查失败，也不能通过仓库规则阻止合并；来自 fork 和 Dependabot 的 PR 不运行这项检查。

公开仓库可用，组织的私有及内部仓库需要 Code Security 或 Advanced Security。使用不要求 Copilot 许可证，但会消耗安全服务的 AI 额度。

AI Scan 检查的是 PR 中的改动，agentic autofix 接收的是默认分支上的告警。两项功能的入口和范围不同，公告没有承诺把 AI Scan 的发现全部自动交给 Copilot 修复。

2026-10-15 · GitHub：[AI Scan 正式上线](https://github.blog/changelog/2026-10-15-ai-scan-for-pull-requests-generally-available)

### Anthropic 向六名 METR 人员开放内部访问 允许独立发表分析

Anthropic 宣布，已向非营利 AI 评估机构 METR 的六名员工提供公司设备、办公空间，以及接近内部风险评估团队的工具和系统访问权限。评估人员因此可以了解更多内部安全实践，而不只是通过接口测试模型输出。

METR 可以发表对 Anthropic 风险水平、事件和实践的分析，Anthropic 不能否决发表。访问仍有边界：客户数据、律师保密信息、模型架构等类别被排除；Anthropic 可以要求删去预先约定类别中的敏感内容，METR 可以公开评论删减是否合理，但不能披露被删内容。

这次公告公布的是外部机构如何获得信息、如何发表结果。METR 尚未因此给出模型安全结论，其他合作机构也不自动拥有相同权限。

2026-10-15 · Anthropic：[独立评估安排](https://www.anthropic.com/news/an-update-on-independent-evaluators)

## 二 工具 TokenSpeed 用 C++ 调度请求 用 Python 执行模型

TokenSpeed 是 LightSeek Foundation 开源的模型推理引擎，面向自己部署模型服务的开发者和团队，提供兼容 OpenAI 的服务接口。

多条请求同时进入服务时，除了计算下一段输出，还要安排各请求何时计算、使用哪些缓存。TokenSpeed 用 C++ 调度请求与缓存，再由 Python 执行模型计算。

项目：[lightseekorg/tokenspeed](https://github.com/lightseekorg/tokenspeed) · MIT 许可证

### 请求从输入处理到逐步生成

模型收到请求后，先处理输入，再逐步生成输出。前一阶段通常叫 prefill，后一阶段叫 decode。两类工作同时存在时，调度器需要安排下一轮处理哪些请求。

TokenSpeed 在 C++ 中为请求定义了不同状态，包括已提交、处理输入、生成中和结束中。事件到来后，`Request::Apply` 更新请求状态。读这部分代码，可以沿着状态变化追踪一次请求，而不必在一段混合逻辑里寻找它进行到了哪一步。[请求状态](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/fsm/states.h) · [事件处理](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/scheduler/request.h)

### 缓存由仍在使用它的引用共同持有

逐步生成时，模型会保存前面计算得到的中间结果，避免每一步都重新处理完整历史，这类缓存称为 KV cache。

TokenSpeed 的 `CacheBlockRef` 用引用计数管理共享缓存块：仍有引用时继续持有，最后一个引用释放时销毁所持对象。这里处理的是缓存的生命周期，一条请求结束时，缓存可能仍被其他使用方持有。[缓存引用实现](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/cache/core/cache_block_ref.h)

### C++ 产出执行计划 Python 接手设备计算

两层之间有一个具体的交接点：Python 事件循环调用 C++ 调度器的 `next_execution_plan()`，拿到下一轮执行计划，再交给设备执行入口。设计文档还将控制逻辑与 GPU 工作分开，把模型计算放在专门的执行线程中。

因此，研究它时可以分别看“下一轮安排什么”和“怎样完成计算”，再沿执行计划把两者连起来。这是项目在代码中体现出的分工。[事件循环](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/python/tokenspeed/runtime/engine/event_loop.py) · [设计文档](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/docs/design/event-loop.md)

### 适合谁看 怎样开始

如果你已有 GPU，希望研究推理调度、缓存管理或针对特定负载调优，TokenSpeed 提供了一套值得读的实现。只调用托管模型 API 的应用开发者，通常不需要自己接管这一层。

它与 vLLM 都提供兼容 OpenAI 的服务入口；已有 vLLM 服务的团队，仍需按模型支持、硬件、并发和输入输出长度比较。本文没有运行性能测试，不能据此判断 TokenSpeed 更快。

上手先按 GPU 类型选择官方安装路线，再用 `tokenspeed env` 查看环境、用 `tokenspeed serve --help` 检查启动选项。官方最小示例采用 `openai/gpt-oss-20b`，实际能否装入取决于硬件和配置。需要比较现有引擎时，可以固定模型与负载，记录首个 token 的等待时间、后续生成速度和错误情况。[安装指南](https://lightseek.org/tokenspeed/guides/getting-started) · [启动服务](https://lightseek.org/tokenspeed/guides/launching) · [vLLM 服务文档](https://docs.vllm.ai/en/latest/serving/online_serving/)

### 当日 GitHub AI 热门项目

2026-10-16 上午 · [GitHub 全语言 Trending 日榜](https://github.com/trending?since=daily)。按页面显示的当日新增 star 排序，TokenSpeed 已在上文介绍，不再重复列入。

| 项目 | 用途 | 总 star | 当日新增 star |
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

## 三 方法 Simon Willison 用语音开发博客功能 再用键盘完成审查

Simon Willison 在 10 月 9 日的博客中记录了一次开发：他一边做饭，一边用 Codex 的语音对话，为自己的 Django 博客增加 newsletter 归档。按他的记录，约半小时后功能大体完成；吃饭后又花了约半小时，用键盘审查和修改，才部署上线。

这个案例把一次 AI 开发的过程交代得很具体：预览什么时候打开，需求怎样改口，哪些实现需要返工，什么时候需要回到键盘。

### 先打开预览 再用语音讨论

Simon 先让 Codex 启动本地开发服务器并打开浏览器，随后才开始语音对话。做饭时，他可以瞥一眼页面，直接告诉 Agent 哪些地方要改。

预览让双方讨论同一个已经出现的结果。例如，页面上某类内容出现在了错误的位置，他可以直接指出来，不必先根据文字汇报想象页面。

### 把内容出现在哪里讲清楚

原文保留了一段带改口的语音转录。Simon 先说 newsletter 不要出现在标签页和日期归档，随后修正：不要进标签页和首页，但应该进入发送当天的日期归档。

搜索规则也分了两类：Substack 周报主要重复博客已有内容，不必再进入搜索；月度 newsletter 有独立内容，公开后应该能被搜索。这些要求直接决定功能行为，口头表达虽然不整齐，最后采用的规则却很具体。

最终改动包括数据模型和迁移、管理后台、四种导入、按年归档及搜索集成，可以在 [PR #719](https://github.com/simonw/simonwillisonblog/pull/719) 中查看。

### 功能做出来后 检查具体实现

语音阶段结束后，Simon 让 Codex 创建分支和 PR，再去 GitHub 审查。他发现一个导入脚本使用 Git 子进程；涉及私有仓库的导入，他更希望通过 API 完成，于是切回打字要求修改，也调整了页面展示。

私有数据导入还需要配置新的 API key，这部分同样让他回到键盘前。页面已经能看，并没有省掉导入方式、配置和代码审查这些交付工作。

### 在自己项目里可以怎样试

从这个案例可以整理出一个适合小功能的协作顺序：

1. **先开预览。** 让后续反馈能指向实际页面。
2. **用语音讲业务规则。** 说清什么内容出现在哪里、什么时候可见；改口后确认最终规则。
3. **用键盘传精确材料。** 报错、参数、代码位置和配置适合粘贴或直接编辑。
4. **交付前看实际改动。** 核对代码、导入方式和配置是否符合项目要求。

这是根据案例整理的用法。Simon 熟悉自己的博客，也预先知道这是一项相对简单的 Django 改动。作者认为语音适合同时处理其他事情的场景，但涉及细节时，打字和粘贴仍更高效。因此，先在熟悉项目中试一个边界清楚的小功能，比一次改变整个开发方式更接近这个案例的条件。

2026-10-09 · Simon Willison：[A new feature for my blog, built using my voice](https://simonwillison.net/2026/Oct/9/built-using-my-voice/) · [关联 PR](https://github.com/simonw/simonwillisonblog/pull/719/files)

## 四 口播 三个面向 AI 工程师的选题

### 选题一 GitHub 的 AI 漏洞检查与自动修复分别做什么

**开场**

GitHub 10 月 15 日正式开放了两项代码安全功能。AI Scan 检查 PR 里的改动，agentic autofix 接收默认分支上的告警、修改代码，再提交草稿 PR。名字放在一起容易混淆，实际入口不同。

**核心观点**

两项功能的触发入口与使用条件不同，需要分别判断自己的仓库能使用哪一项。

**讲述提纲**

1. 先展示 AI Scan 检查的文件类型，用 Shell 脚本和 Terraform 配置说明检查范围。
2. 交代结果如何使用：目前只作建议，不能阻止合并。
3. 展示另一个入口：把默认分支告警指派给 Copilot，它修改代码、重新跑 CodeQL、提交草稿 PR。
4. 说明使用条件：自动修复面向企业云安全服务客户，消耗 AI 额度和 Actions 分钟。

**画面与证据**

2026-10-15 · GitHub：[AI Scan 公告](https://github.blog/changelog/2026-10-15-ai-scan-for-pull-requests-generally-available)中的范围与限制；[agentic autofix 公告](https://github.blog/changelog/2026-10-15-agentic-autofix-for-code-scanning-alerts-general-availability)中的流程和使用条件。

### 选题二 TokenSpeed 怎样把请求调度与模型计算分开

**开场**

多个人同时请求模型时，服务除了生成答案，还要安排下一轮算谁、缓存由谁使用。TokenSpeed 用 C++ 管这些调度工作，再把执行计划交给 Python 运行模型。

**核心观点**

沿一条请求看推理引擎的分工：状态记录进度，缓存引用管理资源，执行计划连接调度与计算。

**讲述提纲**

1. 用一次请求解释输入处理和逐步生成，对应 prefill 与 decode。
2. 展示源码里的请求状态，说明调度器如何记录进行到哪一步。
3. 展示缓存引用：一条请求结束时，其他使用方可能仍持有缓存。
4. 定位 Python 中的 `next_execution_plan()`，画出 C++ 调度器到设备执行入口的交接。

**画面与证据**

[请求状态](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/fsm/states.h) · [缓存引用](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/cache/core/cache_block_ref.h) · [事件循环](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/python/tokenspeed/runtime/engine/event_loop.py)

### 选题三 Simon 怎样在语音开发后完成键盘审查

**开场**

Simon Willison 做饭时，用约半小时语音对话给博客增加了 newsletter 归档。按他的记录，之后还有约半小时键盘审查：他检查 PR，改了导入方式，也处理了私有数据配置。

**核心观点**

用这次开发说明不同输入方式适合什么工作：语音配合预览讨论业务规则，键盘处理精确实现和配置。

**讲述提纲**

1. 展示原文预览截图，交代他先开本地服务器，再开始语音。
2. 讲一处具体改口：newsletter 不进首页和标签页，但要进日期归档。
3. 展示 PR，说明数据模型、导入和搜索都变成了实际代码。
4. 讲键盘收尾：导入从 Git 子进程改为 API，私有内容读取需要新配置。

**画面与证据**

2026-10-09 · Simon Willison：[原文的语音转录、截图与审查过程](https://simonwillison.net/2026/Oct/9/built-using-my-voice/) · [PR #719](https://github.com/simonw/simonwillisonblog/pull/719)
