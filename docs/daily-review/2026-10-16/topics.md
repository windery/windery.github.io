# AI 开发者口播选题：GitHub 的两种安全自动化、TokenSpeed 的调度分工、Simon 的语音开发

2026 年 10 月 16 日 · 口播选题篇 · 本地审阅稿，未写入飞书

这三张卡各自绑定一组真实材料，供挑选后再扩成完整口播稿。第一张适合近期产品解读，第二张适合工程原理解释，第三张适合开发工作流分享。

## 选题一：GitHub AI Scan 发现漏洞，为什么还拦不住合并？

**开场切入**

“GitHub 10 月 15 日正式推出 AI Scan，能在 PHP、Shell 和 Terraform 等改动里找漏洞。但有个容易看漏的细节：这些 AI 发现目前不能阻止 PR 合并。”

**核心观点**

发现问题、提出修复和决定是否合并，是不同环节。GitHub 同日发布的 AI Scan 与 agentic autofix 各自覆盖其中一部分，不能把二者讲成任何 PR 都能自动发现、修复并通过安全验收。

**讲述提纲**

1. 展示 AI Scan 公告列出的新增检查范围，解释它补充的是 CodeQL 尚未覆盖的语言和框架场景。
2. 放大公告中的限制：结果是 advisory，不使 code scanning 检查失败，也不能通过规则集阻止合并；fork 和 Dependabot PR 不运行。
3. 转到 agentic autofix：把默认分支告警交给 Copilot，它修改代码、重新运行 CodeQL，再创建草稿 PR。
4. 用“PR 上的建议”和“默认分支告警的修复任务”两个具体入口收尾，帮助观众判断自己要找的是哪项能力。

**可用画面与证据**

- [AI Scan 官方公告](https://github.blog/changelog/2026-10-15-ai-scan-for-pull-requests-generally-available)：How it works 与 Availability 两节。
- [agentic autofix 官方公告](https://github.blog/changelog/2026-10-15-agentic-autofix-for-code-scanning-alerts-general-availability)：工作流程、默认分支限制和计费说明。

成稿不能将 CodeQL 告警关闭说成所有安全问题已消除，也不能省掉企业功能的使用门槛。无需虚构一个被修复的漏洞案例，直接对照两个官方流程就足以讲清差异。

## 选题二：TokenSpeed 为什么让 C++ 决定算谁，让 Python 执行模型？

**开场切入**

“一个推理服务不只是在调用模型。新请求进来、旧请求还在生成、缓存又被几条请求共用，谁先算、空间归谁，都得有人管。TokenSpeed 把这些状态交给 C++ 调度器，模型执行留在 Python。”

**核心观点**

这个项目可以用来讲清推理引擎的一条工程边界：调度器产出执行计划，执行层完成设备工作，再将结果反馈回来。仅凭用了 C++，不能断言整体服务必然更快。

**讲述提纲**

1. 先用一条请求说明 prefill 与 decode：前者处理输入，后者逐步生成。
2. 展示 `states.h` 的 Submitted、Prefilling、Decoding 等状态，让观众看到状态并非口头概念。
3. 展示 `CacheBlockRef` 的共享所有权，解释一条请求结束不等于所有使用方都已释放缓存块。
4. 在 Python 事件循环中定位 `next_execution_plan()` 与设备执行入口，连成“状态 → 计划 → 执行”的链路。
5. 交代适用对象：这是自托管模型服务的工程选题，需要相应 GPU 环境，不是普通聊天客户端的加速按钮。

**可用画面与证据**

- [请求状态定义](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/fsm/states.h)。
- [缓存引用接口](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/cache/core/cache_block_ref.h)。
- [Python 事件循环](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/python/tokenspeed/runtime/engine/event_loop.py)。

这张卡依据源码解读，没有运行性能测试。画面可以讲机制，不应配上“比 vLLM 快多少”一类未验证的成绩。

## 选题三：Simon 做饭时写完博客功能，为什么还要半小时键盘收尾？

**开场切入**

“Simon Willison 用约半小时语音对话，给 Django 博客做出了 newsletter 归档。但他没有马上发布：又花了约半小时打字审查，连导入方式都改了。”

**核心观点**

这个案例的可学之处是分阶段协作。语音让需求讨论与预览反馈连续进行，键盘和 PR 则帮助他解决精确实现及交付问题；不能只剪出做饭时的半小时，省掉后面的工作。

**讲述提纲**

1. 展示原文截图：本地开发预览已经打开，Simon 才开始语音对话。
2. 复述一段具体需求变化：newsletter 不进首页和标签页，但进日期归档；公开月报可搜索，重复博客内容的周报不重复进搜索。
3. 展示 PR：数据模型、导入和搜索都确实变成了代码。
4. 讲收尾发现：一个导入脚本使用 Git 子进程，他改用 API，并调整页面；私有数据配置也需要回到键盘。
5. 给观众一个可尝试的任务：在熟悉项目里挑一个小页面功能，先开预览，用语音讲清展示规则，再用键盘检查并收尾。

**可用画面与证据**

- [Simon 10 月 9 日原文](https://simonwillison.net/2026/Oct/9/built-using-my-voice/)：语音转录、预览截图与 Finishing it with a review 一节。
- [已合并的 PR #719](https://github.com/simonw/simonwillisonblog/pull/719)：实现内容与审查后的改动。

作者没有提供与纯键盘开发的对照实验，因此不将这段经历换算成效率倍数，也不扩写成“语音已经替代程序员日常输入”。
