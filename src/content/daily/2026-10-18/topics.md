---
date: "2026-10-18"
slug: "topics"
kind: "topics"
label: "口播选题"
title: "Agent 反复修不好的 Bug，先查它是否困在旧假设里"
summary: "三张选题卡分别从上下文惯性、跨工具交接和搜索调用计费切入 Agent 的运行成本。"
order: 4
tags: ["口播", "Agent", "可靠性"]
---

## 卡一：越努力的 Agent，也可能越难换方向

开场：“一个 Agent 调了几小时包版本，真正出错的却是 API 端点。”核心观点是：持续运行不等于持续获得新证据。Drew Breunig 10 月 14 日用这个案例解释上下文惯性——旧假设被反复写回对话，后续行动也继续沿着它走。[案例与作者原文](https://www.dbreunig.com/2026/10/14/context-inertia.html)

提纲：先讲错查包版本的案例，再解释压缩可能保留旧路线，最后给出“核对产物—记录事实与反证—新会话验证新假设”的操作顺序。收尾边界：研究中的重置策略不能直接变成所有任务的固定计时器，应看是否出现反证后仍反复打转。

## 卡二：从 Claude Code 换到 Codex，交接该留下什么

开场：“换个编程 Agent，为什么还得重新讲一遍上次踩过的坑？”核心观点是把工作状态留成可搜索、可核对的记录。今日榜上的 ai-memory 选择 Git 管理的 Markdown wiki；它的交接代码还检查 `open` 状态再认领，避免两个会话同时接走同一份交接。[项目说明](https://github.com/akitaonrails/ai-memory/blob/995e35d5866973c3176709261e924a67e3c76158/README.md) · [认领实现](https://github.com/akitaonrails/ai-memory/blob/995e35d5866973c3176709261e924a67e3c76158/crates/ai-memory-store/src/ops.rs)

提纲：用一次跨工具接力引入，展示决定、失败原因和下一步这三类记录，再讲“找到记忆”和“确认记忆仍正确”是两道检查。收尾边界：本期只审阅了文档和代码，不能展示成已实测的无缝迁移，也不能把存了记录等同于下一 Agent 会正确执行。

## 卡三：Agent 搜一次网页，账单怎么算

开场：“DeepSeek 开放搜索 API 后，搜索结果返回 5 条和 50 条，单次价格一样。”核心观点是搜索、读取网页和模型生成可以有不同的计费单位。10 月 17 日开放的 Search 与 Fetch 各按千次成功且产生结果的请求收费 0.75 美元，搜索返回条数不改变单次价格。[官方公告](https://api-docs.deepseek.com/updates) · [接口计费文档](https://api-docs.deepseek.com/guides/search)

提纲：先拆开搜索结果和抓取正文，再算一个连续调用 Search、Fetch 的流程，最后提醒读者区分直接接口与服务端工具调用。收尾边界：文档写明后者目前免费、上海时间 11 月 1 日零点起收费；这里没有进行真实调用计费测试，网页也可能因站点政策无法读取。
