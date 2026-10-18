---
date: "2026-10-18"
slug: "news"
kind: "news"
label: "新闻"
title: "DeepSeek 开放独立的搜索与网页读取 API"
summary: "开发者可单独调用 Search 与 Fetch，按成功且产生结果的请求计费。"
order: 1
tags: ["DeepSeek", "搜索", "自动化"]
---

## 搜索和读取网页，可以拆成两步调用

DeepSeek 10 月 17 日宣布开放自研搜索 API。配套文档提供两个独立 JSON 接口：`POST /v1/tools/search` 返回结构化搜索结果，`POST /v1/tools/fetch` 读取单个页面并返回 Markdown，沿用 DeepSeek API key。Search 可用 `need_content` 请求正文，但正文不可用时仍可能为空；接入 Agent 或 RAG 时，应检查实际内容，不能把“找到了链接”当成“读到了网页”。[官方公告](https://api-docs.deepseek.com/updates) · [Search & Fetch 文档](https://api-docs.deepseek.com/guides/search)

文档标价为 Search、Fetch 各每千次成功请求 0.75 美元，只有 HTTP 200 且产生结果才计费，空搜索和失败请求不计费，返回条数不改变单次费用。另一个需要区分的入口是通过 DeepSeek Harness、Claude Code 或 Codex 使用 DeepSeek API 时的服务端工具调用：文档写明目前免费，上海时间 11 月 1 日零点开始按请求收费。两接口各有账号级 5 QPS 限制，Fetch 还受目标站点访问政策约束；“开放搜索”并不保证任意网页都能读到。[计费、限流与错误处理](https://api-docs.deepseek.com/guides/search)

## Claude Code 调整部分无人值守会话的默认权限

Claude Code 10 月 16 日发布的 2.1.302 调整了 `claude -p` 和 Agent SDK 的启动行为：未指定 permission mode 的会话，在使用第三方 provider、关闭 telemetry，或全新安装等条件下，以 `default` 模式启动。发布说明同时明确，显式传入 `--permission-mode auto` 仍保留 auto 行为。它影响的是这些条件下的默认选择，不能据此推断所有交互会话都更换了模式。[官方 release](https://github.com/anthropics/claude-code/releases/tag/v2.1.302)

这对定时任务和脚本集成更直接：省略参数的调用方应检查启动命令与环境，确认原本依赖的自动审批行为是否仍成立。同版还修复了云端定时任务中途失败后，可能在一小时或更久后从头重跑的问题。这是官方列出的修复，本文没有在对应环境复现；升级后应验收权限与失败恢复，尤其核对重复执行会产生外部写入的任务。[同版说明](https://github.com/anthropics/claude-code/releases/tag/v2.1.302)
