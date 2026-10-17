---
date: "2026-10-16"
slug: "tools"
kind: "tools"
label: "工具与实践"
order: 2
title: "TokenSpeed：C++ 管调度，Python 跑模型"
summary: "一个自托管推理引擎把请求状态、缓存生命周期和执行计划分开；读代码比看榜单更能判断它适合谁。"
tags: ["推理", "开源"]
---

如果你自己部署模型服务，一次 Agent 任务会带来一串请求：长输入、正在生成的请求和缓存资源都要排队。LightSeek Foundation 开源的 TokenSpeed 把请求状态与缓存调度放进 C++，把模型执行留在 Python，并提供兼容 OpenAI 的 HTTP 接口。

## 一次请求怎样走过调度器

先区分两段模型工作：prefill 处理输入、建立后续生成所需的中间状态；decode 逐步生成输出。KV cache 保存注意力计算的中间结果，避免每一步都重算完整历史。多条请求同时进行时，调度器既要决定下一轮算谁，也要决定缓存空间归谁。

TokenSpeed 的实现可以沿着三处读。`fsm/states.h` 用 `std::variant` 列出 Submitted、Prefilling、Decoding、Finishing、Finished 等状态，`Request::Apply` 把事件作用到当前状态；`CacheBlockRef` 用引用计数管理共享缓存块，最后一个引用释放时才销毁；Python 事件循环从 C++ 调度器取 `next_execution_plan()`，再交给设备执行入口。三处连起来，就是“这一轮算谁、缓存归谁、在哪执行”。[请求状态](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/fsm/states.h) · [缓存引用](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/tokenspeed-scheduler/csrc/cache/core/cache_block_ref.h) · [事件循环](https://github.com/lightseekorg/tokenspeed/blob/8ee249233900a664bfe50e9ad7ed745c21df0517/python/tokenspeed/runtime/engine/event_loop.py)

这些类型和所有权设计约束了操作方式，但不能由此推导整个系统已经消除并发或内存错误。本文没有运行性能测试，README 里的加速数字不能当实测结论。

## 它适合谁，怎样开始评估

它适合已经有 GPU、想研究推理调度或针对特定负载调优的团队；只调用托管 API 的应用不需要自己接管这一层。和 vLLM 相比，两者都提供兼容 OpenAI 的服务入口，是否更合适仍取决于模型、硬件、并发和输入输出长度。

上手先按官方文档选 GPU 路线，用 `tokenspeed env` 检查环境，再试 `tokenspeed serve --help`；官方最小示例是 `openai/gpt-oss-20b`，实际能否装入取决于硬件。要比较现有引擎，固定模型、精度、输入长度和并发，记录首 token 延迟、持续生成速度和错误情况，比只看榜单星标更有用。

项目：[lightseekorg/tokenspeed](https://github.com/lightseekorg/tokenspeed) · 固定提交 [8ee2492](https://github.com/lightseekorg/tokenspeed/tree/8ee249233900a664bfe50e9ad7ed745c21df0517) · MIT
