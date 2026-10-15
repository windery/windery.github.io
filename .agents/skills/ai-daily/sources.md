# AI 日报信息源

Codex 的 AI 日报 skill 按这份配置抓取内容。80 个源都在 2026-10-11 用下面的读法实际读到过内容；「核实」列写的是核实日期和当时读到的最新一条的日期。最新一条超过 90 天的源不收录。首次运行及两周复盘时重新核查临近门槛的源，按实际入选情况人工增删。

X List 不在这里：它只通过 X 抓取包装器读取，List ID 在本地私有配置里。

## 读法模板

表格「读法」列引用下面的代号。命令里的 `<地址>` 换成表格「地址」列。

```bash
# RSS:N —— agent-reach 自带 Python 里的 feedparser，N 是条数（默认 5）
AR_PY="$(sed -n '1s/^#!//p' "$(command -v agent-reach)")"
"$AR_PY" -c "import feedparser,sys; f=feedparser.parse(sys.argv[1]); n=int(sys.argv[2]); print(f.bozo, f.feed.get('title')); [print(e.get('published', e.get('updated','')), '|', e.get('title'), '|', e.get('link')) for e in f.entries[:n]]" "<地址>" 5

# JINA —— 网页转 Markdown。Jina 按 IP 限频：两次请求间隔 3–5 秒，429 时 curl 会自动重试
curl -s -m 40 --retry 3 --retry-delay 5 "https://r.jina.ai/<地址>"

# GH-REL —— GitHub 正式版 release（过滤 alpha / nightly / rc），<地址> 是 owner/repo
gh api "repos/<地址>/releases?per_page=30" --jq '.[] | select(.prerelease==false) | "\(.published_at) | \(.name) | \(.html_url)"' | head -5

# GH-Q1 / GH-Q2 / GH-Q3 —— GitHub 搜索，日期在运行时算
D7=$(date -v-7d +%Y-%m-%d); D30=$(date -v-30d +%Y-%m-%d)
FMT='.items[] | "\(.stargazers_count)\t\(.full_name)\t\(.created_at[0:10])\t\(.language)\t\(.description // "" | .[0:100])"'
gh api -X GET search/repositories -f q="llm OR agent OR agents OR mcp OR rag in:name,description,topics created:>=$D7" -f sort=stars -f order=desc -f per_page=10 --jq "$FMT"                                        # GH-Q1
gh api -X GET search/repositories -f q="\"claude code\" OR codex OR \"coding agent\" OR cursor OR \"gemini cli\" in:name,description,topics created:>=$D7" -f sort=stars -f order=desc -f per_page=10 --jq "$FMT"   # GH-Q2
gh api -X GET search/repositories -f q="llm OR agent OR mcp OR rag in:name,description,topics created:>=$D30 stars:>=500" -f sort=stars -f order=desc -f per_page=20 --jq "$FMT"                                # GH-Q3

# V2EX-HOT —— V2EX 全站热门（公开 API）
curl -s "https://www.v2ex.com/api/topics/hot.json" -H "User-Agent: agent-reach/1.0"

# BILI-UP —— B 站 UP 主最近投稿，<地址> 是 UID。偶尔返回 412，重试几次
bili user-videos <地址> -n 10 --json

# BILI-SEARCH —— B 站视频搜索，<地址> 是关键词
bili search "<地址>" --type video -n 20 --json
```

## 一、GitHub 热门 AI 项目

| 名称 | 类型 | 地址 | 读法 | 入选理由 | 核实 |
|---|---|---|---|---|---|
| 近 7 天新建 · AI 综合 | API | search/repositories | GH-Q1 | 一条查询覆盖 agent、MCP、RAG、LLM 应用，是新项目的主入口 | 10-11（最新 10-10） |
| 近 7 天新建 · AI 编程工具 | API | search/repositories | GH-Q2 | 抓 Claude Code、Codex、Cursor、Gemini CLI 生态的 skill、插件、harness | 10-11（最新 10-08） |
| 近 30 天快速增长 | API | search/repositories | GH-Q3 | 按「star ÷ 天龄」排，近似衡量增长速度 | 10-11（最新 09-23） |
| GitHub Trending · 全语言日榜 | 网页 | https://github.com/trending?since=daily | JINA；抽仓库名和 stars today，自己按今日 star 重排 | 唯一现成的「今日新增 star」，老仓库翻红也能抓到 | 10-11（当日榜） |
| GitHub Trending · Python | 网页 | https://github.com/trending/python?since=daily | JINA | AI 应用和 agent 框架以 Python 为主，噪音少 | 10-11（当日榜） |
| GitHub Trending · TypeScript | 网页 | https://github.com/trending/typescript?since=daily | JINA | MCP server、agent UI、编程工具插件多用 TS | 10-11（当日榜） |

搜索 API 测不出区间增长，关键词也会命中无关项目（理财 app、营销号 skill），Trending 里混着非 AI 项目，入选前都要按描述再筛一轮。

## 二、模型与产品发布

以厂商官方为准。价格变化主要出现在各家 API changelog 里；定价页是静态表格，只在 changelog 提到调价时打开核对数字。

| 名称 | 类型 | 地址 | 读法 | 入选理由 | 核实 |
|---|---|---|---|---|---|
| Anthropic Newsroom | 网页 | https://www.anthropic.com/news | JINA；模型发布在页顶置顶卡片里，要扫整页 | Claude 新模型、政策的官方首发 | 10-11（最新 10-08） |
| Claude Platform release notes | 网页 | https://platform.claude.com/docs/en/release-notes/overview | JINA | Claude API、SDK 的新模型、beta、弃用、价格调整 | 10-11（最新 10-09） |
| Claude Code releases | RSS | https://github.com/anthropics/claude-code/releases.atom | RSS:5；几乎每天发版，只挑有新能力的版本或合并成一条 | 头部 AI 编程工具 | 10-11（最新 10-09） |
| Claude Blog | 网页 | https://claude.com/blog | JINA | Claude 产品功能和开发实践，比 Newsroom 更偏开发者 | 10-11（最新 10-08） |
| OpenAI News | RSS | https://openai.com/news/rss.xml | RSS:30；一大半是客户案例，优先 Product、Research 类 | OpenAI 新模型和产品的官方首发 | 10-11（最新 10-09） |
| OpenAI API Changelog | 网页 | https://developers.openai.com/api/docs/changelog | JINA；条目日期不带年份，年份看上级标题 | API 模型、端点、价格变化的一手记录 | 10-11（最新 10-08） |
| ChatGPT & Codex changelog | 网页 | https://developers.openai.com/codex/changelog | JINA | Codex 的产品级更新，比 GitHub release 信息量大 | 10-11（最新 10-08） |
| Gemini API release notes | 网页 | https://ai.google.dev/gemini-api/docs/changelog | JINA | Gemini 模型上下线、弃用、价格 | 10-11（最新 10-08） |
| Google DeepMind Blog | RSS | https://deepmind.google/blog/rss.xml | RSS:5；bozo 为 True 但条目正常 | Gemini、Gemma 等模型发布帖 | 10-11（最新 10-06） |
| Google Developers Blog | RSS | https://developers.googleblog.com/rss/ | RSS:10；没有日期，靠「没见过的条目」判断新旧 | Google 面向开发者的 AI 工具、ADK、Gemma 用法 | 10-11（最新 10-08，从文章页查得） |
| AI at Meta Blog | 网页 | https://ai.meta.com/blog/ | JINA | Meta 模型的官方发布 | 10-11（最新 07-27，临近 90 天） |
| Mistral changelog | 网页 | https://docs.mistral.ai/getting-started/changelog | JINA；日期不带年份 | 模型发布、弃用、上线价格都在这里 | 10-11（最新 10-06） |
| xAI News | 网页 | https://x.ai/news | JINA | Grok 模型和产品发布 | 10-11（最新 09-28） |
| xAI API release notes | 网页 | https://docs.x.ai/docs/release-notes | JINA；日期不带年份 | Grok API 的模型、下线和价格变化 | 10-11（最新 10-02） |
| Hugging Face Blog | RSS | https://huggingface.co/blog/feed.xml | RSS:30；很多社区文章，只收厂商发模型或重要工具的 | 开源模型首发地 | 10-11（最新 10-09） |
| GitHub Changelog · Copilot | RSS | https://github.blog/changelog/label/copilot/feed/ | RSS:10 | Copilot 功能、计费变化，新模型在 Copilot 上线的时间 | 10-11（最新 10-10） |
| Cursor Changelog | RSS | https://cursor.com/changelog/rss.xml | RSS:5 | 头部 AI IDE 的功能更新 | 10-11（最新 10-06） |
| Gemini CLI releases | API | google-gemini/gemini-cli | GH-REL | Google 官方终端编程 agent，可以和 Claude Code、Codex 对比 | 10-11（最新 10-06） |
| Devin Desktop（原 Windsurf）changelog | 网页 | https://windsurf.com/changelog | JINA | 主流 AI IDE 之一，已改名 | 10-11（最新 09-29） |
| DeepSeek API Change Log | 网页 | https://api-docs.deepseek.com/updates | JINA | DeepSeek 新模型、API 行为和价格 | 10-11（最新 09-10） |
| DeepSeek Harness releases | RSS | https://github.com/deepseek-ai/deepseek-harness/releases.atom | RSS:5；全是预发布版，只在 minor 版本跳变时收 | DeepSeek 官方编程 agent harness，国内生态影响大 | 10-11（最新 10-09） |
| Qwen Research | 网页 | https://qwen.ai/research | JINA；没有单篇链接 | 通义千问模型发布、开源公告 | 10-11（最新 09-20） |
| Alibaba Cloud Model Studio 模型更新 | 网页 | https://www.alibabacloud.com/help/en/model-studio/newly-released-models | JINA | Qwen API 的新模型、下线时间，带 model ID | 10-11（最新 10-09） |
| Kimi API Platform Changelog | 网页 | https://platform.kimi.ai/docs/platform-changelog | JINA；没有日期，靠「没见过的条目」判断 | Kimi API 的新模型、下线、计费变化 | 10-11（晚于 08-31） |
| Kimi Blog | 网页 | https://www.kimi.com/blog | JINA；2026-10-14 复核仍停在 07-16，次日若无更新即超过 90 天，须暂停读取 | Kimi 模型发布和技术报告 | 10-14（最新 07-16） |
| Z.ai New Released | 网页 | https://docs.z.ai/release-notes/new-released | JINA；没有日期，靠「没见过的条目」判断 | 智谱 GLM 新模型的官方发布记录 | 10-11（约 08-28） |
| MiniMax News | 网页 | https://www.minimax.io/news | JINA | MiniMax 模型发布和开源公告 | 10-11（最新 08-26） |
| ByteDance Seed Research | 网页 | https://seed.bytedance.com/en/research | JINA | 字节 Seed 模型发布帖和技术报告 | 10-11（最新 08-05） |
| 火山方舟 · 模型发布公告 | 网页 | https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh | JINA | 豆包 Seed 系列的 API 上线记录，model ID 里带日期 | 10-11（最新 09-15） |
| 腾讯混元官网 | 网页 | https://hunyuan.tencent.com/ | JINA | 混元模型发布，唯一能读到的官方入口 | 10-11（最新 09-21） |

## 三、大 V 经验与技术博客

X 动态来自 X List（见开头）。下面是博客、newsletter、播客。高频源每天最多取 1 条，按 agent、eval、MCP、RAG、context、harness、Claude Code、Codex、Cursor、skill 等关键词过滤；同一篇内容同时出现在聚合源和作者原站时，只收原文。

### 技术博客

| 名称 | 类型 | 地址 | 读法 | 入选理由 | 核实 |
|---|---|---|---|---|---|
| Simon Willison | RSS | https://simonwillison.net/atom/entries/ | RSS:5；只用 entries（长文），不用 everything | 每天亲手测新模型、LLM 工具和 AI 编程工作流，最稳定的一手源 | 10-11（最新 10-09） |
| Hamel Husain | RSS | https://hamel.dev/index.xml | RSS:5；部分条目链接只到首页，按标题找原文 | evals 方法论代表人物，讲错误分析和评估，偏实操 | 10-11（最新 09-30） |
| Armin Ronacher | RSS | https://lucumr.pocoo.org/feed.atom | RSS:5；只取 agent、coding、LLM 相关 | Flask 作者，长期写用 agent 写代码的真实体验和反思 | 10-11（最新 10-06） |
| Geoffrey Huntley | RSS | https://ghuntley.com/rss/ | RSS:10；一天多篇，每天最多 1 篇 | Ralph loop 提出者，AI 编程 agent 的激进实践 | 10-11（最新 10-10） |
| Harper Reed | RSS | https://harper.blog/index.xml | RSS:5；只取 agent、LLM 工作流相关 | 详细记录用 LLM 写代码、跑 agent 的工作流 | 10-11（最新 09-22） |
| Addy Osmani（Elevate） | RSS | https://addyo.substack.com/feed | RSS:5 | 每两周左右一篇 agentic engineering，讲老项目里怎么用 agent、怎么审 AI 代码 | 10-11（最新 09-28） |
| Philipp Schmid | RSS | https://www.philschmid.de/rss | RSS:5；bozo 为 True 但条目正常 | Gemini API、managed agents、上下文工程的上手教程，代码多 | 10-11（最新 09-28） |
| Drew Breunig | RSS | https://www.dbreunig.com/feed.xml | RSS:5 | 上下文工程、harness、系统提示词拆解，约每周一篇 | 10-11（最新 09-07） |
| Steve Yegge | RSS | https://steve-yegge.medium.com/feed | RSS:5；链接去掉 `?source=rss…` 参数 | 多 agent 编排和 vibe coding 的长文，观点强 | 10-11（最新 08-24） |
| Thorsten Ball（Register Spill） | RSS | https://registerspill.thorstenball.com/feed | RSS:5 | Amp 工程师，每周点评 AI 编程好文，适合发现文章 | 10-11（最新 10-04） |
| Amp News | RSS | https://ampcode.com/news.rss | RSS:5；只取讲设计思路的，纯功能上线跳过 | 前沿 coding agent 团队，常解释 agent 为什么这么设计 | 10-11（最新 10-10） |
| claude.dev Blog | RSS | https://claude.dev/rss.xml | RSS:5 | Anthropic 开发者写 Claude Code、Managed Agents、eval 的实操文章（anthropic.com 和 claude.com 首页都链向 claude.dev） | 10-11（最新 10-08） |
| OpenAI Developers Blog | 网页 | https://developers.openai.com/blog | JINA；日期不带年份 | OpenAI 官方开发者实践：Codex、Agents/Responses API、AGENTS.md | 10-11（最新 09-23） |
| OpenAI Cookbook | 网页 | https://developers.openai.com/cookbook | JINA；页面很长，找带日期的列表项 | 可运行的示例和最佳实践（agents、evals、sandbox） | 10-11（最新 09-29） |
| LangChain Blog | RSS | https://www.langchain.com/blog/rss.xml | RSS:10；一天多篇，只取 agent 架构、harness、eval 方法 | agent 框架团队的方法论文章 | 10-11（最新 10-09） |
| Cursor Blog | 网页 | https://cursor.com/blog | JINA；优先 research、ideas 分类 | AI 编程一线团队的工程和研究文章 | 10-11（最新 09-23） |
| Martin Fowler | RSS | https://martinfowler.com/feed.atom | RSS:15；只取 Exploring Gen AI 和标题涉及 LLM/AI 的 | Thoughtworks 对 AI 辅助编程的长期观察，冷静不炒作 | 10-11（最新 10-04） |

### Newsletter

| 名称 | 类型 | 地址 | 读法 | 入选理由 | 核实 |
|---|---|---|---|---|---|
| Latent Space（长文） | RSS | https://www.latent.space/feed | RSS:15；`[AINews]` 只用于发现线索，日报引用厂商或作者原文；跳过 `[Subscriber Exclusive]`，播客单集和下面的播客 feed 按链接去重 | AI Engineer 社区核心阵地，长文和访谈都围绕 AI 工程实践 | 10-14（最新 10-13） |
| The Pragmatic Engineer | RSS | https://newsletter.pragmaticengineer.com/feed | RSS:5；只取标题涉及 AI、agent、AI 工具的 | 用调研和访谈讲 AI 工具在真实公司里怎么用，有数据 | 10-11（最新 10-08） |

### 播客

| 名称 | 类型 | 地址 | 读法 | 入选理由 | 核实 |
|---|---|---|---|---|---|
| Latent Space Podcast | RSS | https://api.substack.com/feed/podcast/1084089.rss | RSS:5；只取 agent、coding、AI 产品相关单集 | 访谈一线 AI 工程团队，圈内最有影响力的播客 | 10-11（最新 10-10） |
| Practical AI | RSS | https://changelog.com/practicalai/feed | RSS:5 | 每周一期，偏落地实践 | 10-11（最新 10-08） |
| AI Engineer（YouTube） | RSS | https://www.youtube.com/feeds/videos.xml?channel_id=UCLKPca3kwwd-B59HNr-_lvA | RSS:15（YouTube feed 上限）；高峰期半小时一条，一天读一次会漏；每天最多取 1–2 个 | AI Engineer 大会演讲，一线团队讲 RAG、agent、eval 落地 | 10-11（最新 10-11） |
| Raising an Agent（Amp） | RSS | https://ampcode.com/podcast.rss | RSS:5 | 做 coding agent 的人聊怎么和 agent 协作，约两周一期 | 10-11（最新 09-25） |
| Vanishing Gradients | RSS | https://hugobowne.substack.com/feed | RSS:5；newsletter 和播客单集都可用 | 嘉宾多是做 eval、agent、AI 产品的实践者 | 10-11（最新 10-11） |

## 四、中文社区

V2EX 节点用 RSS 不用 API：API 每个节点只给 10 条，`programmer` 只够覆盖约 14 小时；RSS 给 50 条。RSS 的 `published` 就是主题创建时间（UTC），链接末尾 `#replyN` 是回复数，去重前先去掉。

B 站：bili-cli 不输出发布时间，搜索也不能按时间排。判断新旧靠「每期记下见过的 BV 号」，或用 aid 推算时间（aid 随投稿时间递增，约每天 5.6×10⁹；定时发布的视频会早最多约 3 天，阈值往前放 4 天）。播放量不能当质量信号。

| 名称 | 类型 | 地址 | 读法 | 入选理由 | 核实 |
|---|---|---|---|---|---|
| V2EX · claude | RSS | https://www.v2ex.com/feed/claude.xml | RSS:50 | 国内用 Claude 的一手讨论：封号、支付、用量、项目体验 | 10-11（最新 10-11） |
| V2EX · claudecode | RSS | https://www.v2ex.com/feed/claudecode.xml | RSS:50 | 专门讨论 Claude Code，量少但对口 | 10-11（最新 10-10） |
| V2EX · openai | RSS | https://www.v2ex.com/feed/openai.xml | RSS:50 | Codex/GPT 的国内使用实况 | 10-11（最新 10-11） |
| V2EX · codex | RSS | https://www.v2ex.com/feed/codex.xml | RSS:50；交易帖多，要过滤 | Codex 的故障、重置、设置问题 | 10-11（最新 10-11） |
| V2EX · programmer | RSS | https://www.v2ex.com/feed/programmer.xml | RSS:50；只留标题匹配 AI 关键词的 | 全站最活跃的技术节点，约六成标题和 AI 相关 | 10-11（最新 10-11） |
| V2EX · agent | RSS | https://www.v2ex.com/feed/agent.xml | RSS:50 | agent 工具对比和使用 | 10-11（最新 10-10） |
| V2EX · vibecoding | RSS | https://www.v2ex.com/feed/vibecoding.xml | RSS:50 | AI 编程翻车和踩坑 | 10-11（最新 10-11） |
| V2EX · localllm | RSS | https://www.v2ex.com/feed/localllm.xml | RSS:50 | 本地部署国内开源模型的实测 | 10-11（最新 10-09） |
| V2EX · deepseek | RSS | https://www.v2ex.com/feed/deepseek.xml | RSS:50 | 国内模型使用和各平台价格对比 | 10-11（最新 10-11） |
| V2EX · cursor | RSS | https://www.v2ex.com/feed/cursor.xml | RSS:50 | 国内用 Cursor 的订阅、模型、网络问题，量很少 | 10-11（最新 10-10） |
| V2EX · 全站热门 | API | https://www.v2ex.com/api/topics/hot.json | V2EX-HOT；按回复数排，不按时间，先过滤创建时间再和节点结果去重 | 捞节点以外的 AI 热帖 | 10-11（最新 10-11） |
| B 站 · 马克的技术工作坊 | API | 1815948385 | BILI-UP | AI 编程工作流、MCP vs CLI、Harness，原理讲得透 | 10-11（最新 10-03） |
| B 站 · 五里墩茶社 | API | 615957867 | BILI-UP；跳过 Python 课程章节 | 开发者视角：Agent Harness、MCP、新 API 实测，几乎每天更 | 10-11（最新 10-08） |
| B 站 · 技术爬爬虾 | API | 316183842 | BILI-UP | 实用工具实测：Codex 技巧、Agent/Skill 玩法 | 10-11（约 09-29） |
| B 站 · AI超元域 | API | 3493277319825652 | BILI-UP；跳过视频生成类 | 新模型、新工具的深度实测 | 10-11（最新 10-05） |
| B 站 · 程序员鱼皮 | API | 12890453 | BILI-UP；只挑实测和开源类 | 新模型第一时间实测，国内开发者视角 | 10-11（最新 10-10） |
| B 站 · 人工大黑 | API | 2475977 | BILI-UP；跳过游戏汉化 | 用真实代码和 agent 场景测国内外模型 | 10-11（最新 10-08） |
| B 站 · 唐国梁Tommy | API | 474347248 | BILI-UP；按标题筛 | 偏原理的工程讲解 | 10-11（最新 10-09） |
| B 站搜索 · Claude Code | 搜索 | Claude Code | BILI-SEARCH；低优先级，强过滤 | 国内可用性信息集中在这里 | 10-11（约 10-10） |
| B 站搜索 · Codex | 搜索 | Codex | BILI-SEARCH；低优先级，强过滤 | Codex 国内注册、订阅、接国产模型的踩坑 | 10-11（最新 10-10） |

V2EX 交易帖（代充、拼车、出售、邀请、低价……）先扔掉；封号、绑卡、额度这类每天都有的帖子合并成一条「国内可用性动态」。B 站搜索结果先过滤课程营销号（全 N 集、七天、小白到大神、训练营、私信领取……）。

## 通用注意

- 没有日期或日期不完整的源（Google Developers Blog、Kimi changelog、Z.ai、Qwen Research、Mistral、xAI、OpenAI changelog），靠「每期记下见过的条目」判断新旧，第一次运行只建基线。Jina 输出头部的 `Published Time` 是整页元数据，不能当条目日期。
- 「上一期之后」统一换算成 UTC 比较：RSS 多是 GMT，GitHub 是 UTC，网页上只有美国当地日期。
- 同一件事常出现在多个源（比如新模型同时出现在厂商新闻、release notes、Copilot changelog、火山方舟），按模型或项目名合并，优先引用厂商自己的源。
- 某个源当天读不到（429、412、超时），在日报里记为「本期未读到」，不要卡住整份日报。

## 编辑精选与覆盖（v2）

来源目录是采集范围，不是日报栏目或入选配额。每天读取所有 active 源；阅读失败、无更新和暂停必须分别记录到 coverage，不能把 RSS 截断当成完整覆盖。若最旧一条仍晚于窗口起点，继续翻页/查原站；无法补足时记录覆盖缺口。

- 排序：会改变开发者决策的发布/兼容性/成本变化 → 可复现方法或代码 → 有新增事实的简讯。GitHub 星标、社区回复、视频播放量不能替代技术价值。
- 聚合页只用于发现，阅读全文并追溯到厂商公告、release、论文、代码或作者原文；无法核对就舍弃。
- 同一模型/项目的发布、接入和转述先归并为一个事件；只有实质独立变化才拆分，标题说明区别。
- 每条都保留原始发布时间与证据。日期缺失照实写，不以采集时间补造；旧文可作注明日期的背景深读。
- 少讯日少发，无证据不发；具体格式、去重与质量要求以 SKILL.md 和 daily-editorial.md 为准。
