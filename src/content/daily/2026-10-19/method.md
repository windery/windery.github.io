---
date: "2026-10-19"
slug: "method"
kind: "method"
label: "方法"
title: "Armin Ronacher：先用代码筛选工具结果，再交给模型"
summary: "一篇 10 月 6 日的文章用 Pi 的 Codemode 说明工具编排、结构化输出与上下文之间的分工。"
order: 3
tags: ["方法", "Codemode", "MCP"]
---

## 把批量处理留在工具之间

Armin Ronacher 在 10 月 6 日的 [《What is Codemode》](https://lucumr.pocoo.org/2026/10/6/codemode/) 中，回应了一个看似矛盾的问题：他此前主张多用 CLI 和脚本，为什么 Pi 又加入了经 Codemode 调用 MCP 的方式？他的出发点是，有些操作可以在执行环境里用 bash 组合，但看图、调用模型、编排子 Agent 等能力需要 harness，也就是管理 Agent 会话与工具的宿主程序，参与处理。Codemode 让模型写代码调用这些工具，并在结果进入模型上下文前先处理数据。

作者把 harness 与实际运行命令的环境分开看。在他描述的 Pi 实现中，Codemode 运行在宿主侧自己的 sandbox，使用 WASM 内的 QuickJS，限制网络、文件系统、计时器和内存；需要外部能力时再调用工具。这个边界解释了为什么它与“让模型在 bash 中跑一段 JavaScript”不同：两段代码可能运行在不同机器、文件系统和信任范围内。这里讲的是 Pi 的实现，不能据此假定所有叫 Code Mode 的产品都采用相同隔离方式。[宿主与执行环境的区别](https://lucumr.pocoo.org/2026/10/6/codemode/)

原文给出了一套可复用的处理顺序：先取 5–10 个结果探测结构，再写代码处理剩余数据，只把需要判断的部分返回模型。示例先读取 GitHub issues，再批量调用分类模型，保存结果，最后仅返回按挫败程度排序的少量条目；另一个 MCP 示例用 `Promise.allSettled` 保留各组织请求的独立失败。文章中的 Pi 会自行限制并发，不能把示例里的 `Promise.all` 直接当成其他系统的限流方案。[真实会话示例](https://lucumr.pocoo.org/2026/10/6/codemode/)

作者强调，这种模式依赖稳定的结构化输出：小批量探测返回一种形状、大批量却变成另一种形状，脚本就会失效；内外两层都要求写代码时，也会增加转义和小模型理解的难度，持久化恢复仍待解决。实践时可先检查返回结构、逐项错误与并发上限，再决定是否批处理；这组检查是依据原文整理的操作顺序。文章没有提供通用的速度或 token 节省比例，不能把减少上下文往返直接等同于端到端效果提升。[作者列出的边界与待解问题](https://lucumr.pocoo.org/2026/10/6/codemode/)
