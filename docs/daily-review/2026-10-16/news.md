# GitHub 将 AI 漏洞扫描与 Agent 修复转为正式功能；Anthropic 向 METR 开放内部评估权限

2026 年 10 月 16 日 · 新闻篇 · 本地审阅稿，未发布

GitHub 在 10 月 15 日正式推出两项代码安全能力：AI Scan 为 CodeQL 尚未覆盖的语言和框架补充漏洞检查，agentic autofix 则让 Copilot 修改代码、重新扫描，再提交修复 PR。Anthropic 同日宣布，六名 METR 评估人员已获得接近内部风险评估团队的访问权限，并可以独立发布评估结果。

## GitHub：AI Scan 扩大检查范围，agentic autofix 把修复做到 PR

**这次新增的是两种不同能力：发现更多问题，以及把已有告警交给 Agent 修复。** GitHub 没有把它们做成一个对所有仓库通用的自动闭环，使用范围也不同。

AI Scan 在拉取请求（PR）的代码变更中查找漏洞，补充 CodeQL 当前没有覆盖的场景，包括 PHP、Shell/Bash、Terraform 的 HCL 配置、Dockerfile，以及 Java 的 JSP、C# 的 Blazor。启用 code scanning 和 AI Scan 后，结果会出现在 PR 的 Conversation 与 Files changed 页面，用 AI 标识与 CodeQL 告警区分，还可能附带风险解释和修复建议。

这对同时维护应用代码、部署脚本和基础设施配置的团队有实际意义：安全检查的范围扩展到了同一次改动里的更多文件。不过，**AI Scan 的结果目前只是建议，不会让 code scanning 检查失败，也不能通过规则集阻止合并**；来自 fork 或 Dependabot 的 PR 也不在其运行范围内。公开仓库可以使用，组织的私有和内部仓库需要 Code Security 或 Advanced Security；不要求 Copilot 许可证，但使用会消耗 Code Security AI Credits。[GitHub AI Scan 公告](https://github.blog/changelog/2026-10-15-ai-scan-for-pull-requests-generally-available)

agentic autofix 处理的是另一端：维护者把默认分支上的 code scanning 告警分配给 Copilot 后，它会查阅相关文件、生成修改、重新运行 CodeQL，必要时继续迭代，最后创建草稿 PR。PR 中会说明修复内容以及验证过程；一次最多可以选择 25 个告警，交给它在同一个 PR 中处理。

这项功能面向 GitHub Enterprise Cloud 上的 Code Security 和 Advanced Security 客户，需要管理员启用相关策略并配置计费方式，消耗 Code Security AI Credits 和 GitHub Actions 分钟。**只在 PR 或其他分支上发现的告警不能直接分配给它。** 因此，不能把两则公告理解成“AI Scan 发现的问题都会自动由 Copilot 修好”；它们各自的触发方式和覆盖范围必须分别看。[GitHub agentic autofix 公告](https://github.blog/changelog/2026-10-15-agentic-autofix-for-code-scanning-alerts-general-availability)

## Anthropic：六名 METR 人员进入内部系统，评估结果无需 Anthropic 批准发布

Anthropic 宣布，已经向非营利 AI 评估机构 METR 的六名员工提供公司设备、办公空间，以及大致相当于内部风险评估团队的工具和系统访问权限。合作不只允许测试模型输出，还让评估人员接触更多内部安全实践信息。

这项安排最值得关注的是信息获取与发表权同时改变：METR 可以发表对 Anthropic 风险水平、事件及实践的分析，Anthropic 不能否决发表。不过，访问并非毫无限制，客户数据、律师保密信息、模型架构等类别被排除；Anthropic 也可以要求删除预先约定类别中的敏感内容。METR 可以公开评论这些删减是否合理，但不能披露被删内容。

与只向外部机构提供一个模型测试接口相比，这种驻场评估给了评估者更多观察内部流程的机会。**这是评估机制的变化，不是 METR 已经出具“模型安全”的结论。** Anthropic 还在推进其他合作，但公告明确说，早期合作方获得的信息和发表权更有限，不能把 METR 的权限一并套给所有评估机构。[Anthropic 公告](https://www.anthropic.com/news/an-update-on-independent-evaluators)

## 日期与来源

- 2026-10-15 · GitHub：[AI Scan 正式上线](https://github.blog/changelog/2026-10-15-ai-scan-for-pull-requests-generally-available)
- 2026-10-15 · GitHub：[agentic autofix 正式上线](https://github.blog/changelog/2026-10-15-agentic-autofix-for-code-scanning-alerts-general-availability)
- 2026-10-15 · Anthropic：[METR 独立评估安排](https://www.anthropic.com/news/an-update-on-independent-evaluators)
