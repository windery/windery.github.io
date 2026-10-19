---
date: "2026-10-19"
slug: "tools"
kind: "tools"
label: "工具与实践"
title: "ai-job-search 让第二个 Agent 审查求职材料"
summary: "这个今日上榜项目把个人档案、岗位匹配、事实审计和 PDF 校验串成一套申请流程。"
order: 2
tags: ["工具", "求职", "Agent"]
---

## 先核对经历，再生成申请材料

`MadsLorentzen/ai-job-search` 出现在本次读取的 [GitHub 全语言日榜](https://github.com/trending?since=daily)与 [Python 日榜](https://github.com/trending/python?since=daily)，页面显示今日新增 2,213 stars。这是榜单观察值，不是首次发布的日期。它以 Claude Code 为主要执行工具，把个人资料放进文件，再通过 `/scrape` 搜岗位、`/apply` 评估并起草简历和求职信；核心申请流程可以调整语言和市场，默认门户集成则较偏丹麦。[README](https://github.com/MadsLorentzen/ai-job-search/blob/0f6480d32e59d7651d920a5ec6d78ede2f4113bf/README.md)

`/apply` 的关键设计是先评估、经使用者同意后起草，再交给一个新上下文的 reviewer。审阅流程要求逐项核对日期、雇主、职位和数字，只接受候选人档案、主简历与根目录个人资料三份来源支持的事实；此前定制过的简历只能参考结构与措辞。它还要求把使用者新确认的事实及时写回档案，否则下一会话可能把真实经历误判为无依据。这里的约束主要写在 Agent 指令中，不能等同于程序已经证明每一句材料真实。[申请流程](https://github.com/MadsLorentzen/ai-job-search/blob/0f6480d32e59d7651d920a5ec6d78ede2f4113bf/.claude/commands/apply.md)

内容审阅之后，还有独立的文件验收。流程要求编译并查看 PDF，`verify_pdf.py` 则先尝试 pypdf，失败或没有可提取文本时回退到 Poppler，检查页数、文本和所需字符串。它的 `--ascii-dates` 会检查原始文本层里的年份与非 ASCII 连接号，避免用于字符串匹配的标点归一化掩盖日期格式问题。这能发现一部分“看起来正常、招聘系统却读不全”的缺陷，但脚本通过并不保证所有 ATS 都能正确解析。[校验实现](https://github.com/MadsLorentzen/ai-job-search/blob/0f6480d32e59d7651d920a5ec6d78ede2f4113bf/tools/verify_pdf.py)

它适合愿意维护本地资料和 CLI 的求职者先用一个熟悉岗位试跑。设置文档提醒，`/setup` 会改写受 Git 跟踪的个人档案，推送前应先确认私有仓库和忽略规则；“文件在自己机器上”也不意味着本地离线推理，核心流程仍依赖 Claude Code 的订阅或 API。安全说明承认，招聘页指令隔离属于提示层防御，并非 sandbox。本次只核读了 README、设置与安全文档、申请流程和关键脚本，未安装运行或做性能测试，不能把作者的求职经历当作普遍效果。[设置说明](https://github.com/MadsLorentzen/ai-job-search/blob/0f6480d32e59d7651d920a5ec6d78ede2f4113bf/SETUP.md) · [安全边界](https://github.com/MadsLorentzen/ai-job-search/blob/0f6480d32e59d7651d920a5ec6d78ede2f4113bf/SECURITY.md)
