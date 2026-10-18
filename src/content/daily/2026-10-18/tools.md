---
date: "2026-10-18"
slug: "tools"
kind: "tools"
label: "工具与实践"
title: "ai-memory 用 Markdown 交接跨 Agent 的工作"
summary: "这个今日上榜项目把长期记录存进 Git wiki，并用带状态的交接记录衔接不同编程 Agent。"
order: 2
tags: ["工具", "记忆", "Agent"]
---

## 换一个 Agent，怎样接住上一段工作

`akitaonrails/ai-memory` 出现在本次读取的 [GitHub 全语言日榜](https://github.com/trending?since=daily)，页面记录今日新增 178 stars；这是榜单观察值，不是项目首次发布时间。它面向一个具体问题：在 Claude Code、Codex 等工具间切换后，架构决定、失败尝试和待办仍要能找到。项目以单个 Rust 程序提供服务，把 Markdown wiki 作为长期记录的源数据，SQLite 则负责搜索及会话、交接等索引。[README](https://github.com/akitaonrails/ai-memory/blob/995e35d5866973c3176709261e924a67e3c76158/README.md)

它的基本链路是捕获、整理、检索、交接。生命周期 hook 记录工作事件，服务端先处理文本，再把会话整理为 wiki 页面；下一会话读取简要状态并按需搜索。架构文档区分了无需 LLM 的规则整理路径与可配置的模型整理路径，因此“能记录和搜索”与“自动写出高质量知识页”应分开评价。检索实现把全文匹配和实体匹配等候选排名融合，文档还描述了链接邻居与可选向量召回。[架构说明](https://github.com/akitaonrails/ai-memory/blob/995e35d5866973c3176709261e924a67e3c76158/docs/ARCHITECTURE.md) · [检索实现](https://github.com/akitaonrails/ai-memory/blob/995e35d5866973c3176709261e924a67e3c76158/crates/ai-memory-store/src/reader.rs)

交接也不只是塞一段摘要。关键实现把 handoff 从 `open` 改为 `accepted`，更新条件同时检查工作区、项目、所有者和原状态；只有成功更新的会话才认领这份交接。这样两个会话同时启动时，能避免把同一份待接手工作都当作自己的任务。这里能从代码核对的是认领机制，不能据此保证后续 Agent 一定理解或完成了交接内容。[交接实现](https://github.com/akitaonrails/ai-memory/blob/995e35d5866973c3176709261e924a67e3c76158/crates/ai-memory-store/src/ops.rs)

它适合经常跨工具、跨会话工作的开发者先做小范围评估：挑一个熟悉的仓库，检查下一会话能否找回一项决定、一条失败原因和一个未完成步骤。接入前还要确认哪些事件会被捕获，以及是否配置外部模型服务；代码中的脱敏器覆盖已知凭据形态，也明确无法可靠识别所有无结构随机字符串。本次只读了 README、架构文档和关键实现，没有安装运行或做性能测试，不能把项目的吞吐或记忆效果宣传当作实测结论。[脱敏边界](https://github.com/akitaonrails/ai-memory/blob/995e35d5866973c3176709261e924a67e3c76158/crates/ai-memory-core/src/sanitize.rs)
