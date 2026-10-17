# AI 日报四篇拆分

状态：2026-10-17 已上线 main。每天一个日期目录，四篇独立文章；旧合刊继续可读。

## 结构

```
src/content/daily/YYYY-MM-DD/
├── _issue.md    当天摘要、highlights、tags、窗口、x、coverage
├── news.md      AI 新闻
├── tools.md     工具与实践
├── method.md    方法
└── topics.md    口播选题
```

- `/daily/`：日期列表，显示当天主线、四篇标签和篇数。
- `/daily/YYYY-MM-DD/`：当日页，列出四篇标题与摘要。
- `/daily/YYYY-MM-DD/<slug>/`：独立文章页，左侧同日活动栏、中间 720px 正文、右侧 H2/H3 目录；1240px 以下收右栏，1024px 以下收左栏并变单列。
- 首页「最新日报」指向最新日期页。
- 没有合格材料的篇目可省略，但至少保留一篇；缺口写进 `_issue.md` 的 `coverage`。

## 内容分工

- **新闻**：1–3 个事件，按影响筛选；每条 H2 说清主体与变化，2–4 段解释机制、影响和边界。
- **工具**：当日 GitHub 热门 AI 项目中最多深挖一个；读 README、文档和关键实现，讲机制、适用对象和限制；未实测不写性能结论。
- **方法**：一篇近 30 天、具名作者、可读到原文的文章；讲问题、做法、步骤、限制，编辑补充明确归属。
- **口播选题**：三张卡，包含开场、核心观点、提纲和证据链接。本轮选择公开第四篇；如果以后要私密，可用 draft 标记或单独发布到飞书。

## 写作约束

标题只讲一件事、不带日期前缀；摘要一句；每篇 2–4 个自然段；证据链接贴事实；禁止「变化／影响／建议／限制／证据／发布时间」字段表和「本地审阅稿」「编辑判断：」「值得关注」「值得纳入工作流」。`_issue.md` 的 coverage 不进入公开正文。

## 校验与发布

- `npm run check:daily` 校验旧合刊与四篇目录：日期/slug/kind/label/title/summary/order、issue meta、tags、coverage、x、无字段表、至少有原文链接。
- `npm run build` 自动跑 check-daily，再构建、Pagefind、站内链接与私有路径扫描。
- `npm run publish:daily -- --date YYYY-MM-DD --dry-run` 演练整期发布；`--publish` 提交日期目录、推送、等 Pages 成功、发一条汇总飞书消息。
- `npm test` 覆盖旧合刊与四篇目录的发布演练；`deploy.yml` 在 CI 跑测试；`daily-freshness.yml` 每天检查线上最新一期。
