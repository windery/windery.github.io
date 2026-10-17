---
date: "2026-10-16"
slug: "news"
kind: "news"
label: "AI 新闻"
order: 1
title: "GitHub 把 AI 安全做到 PR，Anthropic 向 METR 开放内部评估"
summary: "GitHub 的 AI Scan 和 agentic autofix 同日转正：前者只给建议，后者提交草稿 PR；Anthropic 让六名 METR 人员进入内部系统，并允许独立发表。"
tags: ["安全", "模型"]
---

GitHub 在 10 月 15 日正式推出两项代码安全能力：AI Scan 给 CodeQL 没覆盖的语言和框架补检查，agentic autofix 让 Copilot 修改代码、重新扫描，再提交修复 PR。Anthropic 同日宣布，六名 METR 评估人员获得接近内部风险评估团队的访问权限，可以独立发布评估结果。

## GitHub：AI Scan 只给建议，agentic autofix 提交草稿 PR

AI Scan 在 PR 的代码变更里查找漏洞，补充 CodeQL 当前没有覆盖的场景：PHP、Shell/Bash、Terraform 的 HCL 配置、Dockerfile，以及 Java 的 JSP、C# 的 Blazor。启用 code scanning 和 AI Scan 后，结果会出现在 PR 的 Conversation 和 Files changed 页面，用 AI 标识与 CodeQL 告警区分，并可能附带风险解释和修复建议。

这对同时维护应用代码、部署脚本和基础设施的团队有实际意义：一次改动里的更多文件可以接受检查。但 **AI Scan 的结果目前只是建议，不会让检查失败，也不能通过规则集阻止合并**；来自 fork 或 Dependabot 的 PR 不在运行范围。公开仓库可用，组织的私有和内部仓库需要 Code Security 或 Advanced Security；使用不要求 Copilot 许可证，但会消耗 Code Security AI Credits。[AI Scan 公告](https://github.blog/changelog/2026-10-15-ai-scan-for-pull-requests-generally-available)

agentic autofix 处理的是另一端：把默认分支上的 code scanning 告警分配给 Copilot，它会查阅相关文件、生成修改、重新运行 CodeQL，必要时继续迭代，最后创建草稿 PR。PR 里会写明修复内容和验证过程；一次最多可以选 25 个告警，交给它在同一个 PR 中处理。

这项功能面向 GitHub Enterprise Cloud 上的 Code Security 和 Advanced Security 客户，需要管理员启用策略并配置计费，消耗 AI Credits 和 Actions 分钟。**只在 PR 或其他分支上发现的告警不能直接分配给它。** 因此，不能把两则公告理解成“AI Scan 发现的问题都会自动由 Copilot 修好”；两者的触发方式和覆盖范围必须分别看。[agentic autofix 公告](https://github.blog/changelog/2026-10-15-agentic-autofix-for-code-scanning-alerts-general-availability)

## Anthropic：六名 METR 人员进入内部系统

Anthropic 向非营利评估机构 METR 的六名员工提供公司设备、办公空间，以及接近内部风险评估团队的工具和系统访问权限。合作不只允许测试模型输出，还让评估人员接触更多内部安全实践。

这项安排的关键是信息获取与发表权同时改变：METR 可以发表对 Anthropic 风险水平、事件和实践的分析，Anthropic 不能否决。访问仍有边界：客户数据、律师保密信息、模型架构等类别被排除；Anthropic 可以要求删除预先约定类别中的敏感内容，METR 可以公开评论删减是否合理，但不能披露被删内容。

这是评估机制的变化，不是 METR 已经给出“模型安全”的结论。公告也明确说，早期合作方获得的信息和发表权更有限，不能把 METR 的权限套给所有评估机构。[Anthropic 公告](https://www.anthropic.com/news/an-update-on-independent-evaluators)
