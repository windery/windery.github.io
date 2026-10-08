---
name: Windery 学习笔记
description: 以开发者文档站为品类标准的中文课程与开源项目解读站
colors:
  bg: "#ffffff"
  bg-subtle: "#fafafa"
  bg-hover: "#f2f2f2"
  fg: "#171717"
  fg-2: "#4d4d4d"
  fg-3: "#666666"
  border: "#ebebeb"
  border-strong: "#d4d4d4"
  link: "#0062d1"
  link-hover: "#004fa8"
  focus: "#0070f3"
  selection: "#cce4ff"
  bg-dark: "#0a0a0a"
  bg-subtle-dark: "#111111"
  bg-hover-dark: "#1c1c1c"
  fg-dark: "#ededed"
  fg-2-dark: "#a1a1a1"
  fg-3-dark: "#8f8f8f"
  border-dark: "#262626"
  border-strong-dark: "#3a3a3a"
  link-dark: "#52a8ff"
  link-hover-dark: "#8cc6ff"
  selection-dark: "#1d3b66"
typography:
  display:
    fontFamily: "Geist, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "clamp(32px, 4vw, 44px)"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  article-title:
    fontFamily: "Geist, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  subhead:
    fontFamily: "Geist, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  lead:
    fontFamily: "Geist, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "Geist, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.8
  ui:
    fontFamily: "Geist, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Geist, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\""
  code:
    fontFamily: "\"Geist Mono\", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.fg}"
    textColor: "{colors.bg}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.fg}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.bg-hover}"
  search-trigger:
    backgroundColor: "{colors.bg-subtle}"
    textColor: "{colors.fg-3}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
    width: "240px"
  nav-link:
    textColor: "{colors.fg-2}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  nav-link-hover:
    backgroundColor: "{colors.bg-hover}"
    textColor: "{colors.fg}"
  sidebar-link-current:
    backgroundColor: "{colors.bg-hover}"
    textColor: "{colors.fg}"
    rounded: "{rounded.md}"
    padding: "7px 10px"
  entry-kind-chip:
    textColor: "{colors.fg-2}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
  code-block:
    backgroundColor: "{colors.bg-subtle}"
    textColor: "{colors.fg}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
    padding: "16px 20px"
  code-block-bar:
    textColor: "{colors.fg-3}"
    height: "38px"
    padding: "0 8px 0 16px"
  inline-code:
    backgroundColor: "{colors.bg-hover}"
    rounded: "{rounded.sm}"
    padding: "1px 5px"
  reading-row:
    textColor: "{colors.fg}"
    padding: "12px 16px"
  reading-row-hover:
    backgroundColor: "{colors.bg-subtle}"
    textColor: "{colors.link}"
  pagination-card:
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
  pagination-card-hover:
    backgroundColor: "{colors.bg-subtle}"
---

# Design System: Windery 学习笔记

## Overview

**Creative North Star: "安静的开发者文档"**

这套系统采用品类标准：开发者文档站，以 Vercel / Next.js 文档的完成度为基准。纯白与近黑两套主题由系统偏好切换，中性灰承担全部层次，唯一的彩色是蓝色，只出现在链接与焦点上。页面不靠装饰取胜，靠排版密度、1px 细线和一致的 6px 圆角把内容组织清楚。

读者的任务是找到某个项目的某篇解读并读完，所以视觉重心始终落在文字上：首页是左对齐大标题加按时间排列的条目列表；文章页是三栏文档布局（左侧本项目篇目、中间正文、右侧本页目录），文末给出上一篇 / 下一篇。没有阴影、没有渐变、没有插图，也不加任何个性化怪癖。

已明确废弃的视觉方向：旧的暖白纸面、宋体标题、铁锈橙强调的“教材”风。`public/courses/rust/` 是独立的静态导出，保留它自己的旧样式，不在本系统范围内，也不应反向影响本系统。

**Key Characteristics:**
- 纯白 / 近黑双主题，跟随 `prefers-color-scheme`
- Geist + PingFang SC 无衬线全站统一，代码用 Geist Mono（均本地自托管，OFL）
- 1px 中性灰细线分隔，6px 圆角
- 蓝色只用于链接与焦点
- 静态表面无阴影、无渐变；层次靠浅灰底与边线

## Colors

一组近乎无彩的中性灰，加一支克制的蓝。每个颜色在暗色主题下都有对应值（frontmatter 中以 `-dark` 结尾），以 CSS 变量在 `:root` 上整体替换，组件只引用变量名。

### Primary
- **文档蓝（link / link-dark）**：正文链接、条目标题悬停、篇目行悬停时的标题色。悬停时加深为 link-hover（暗色主题下变亮）。
- **焦点蓝（focus）**：`:focus-visible` 的 2px 外轮廓、输入框光标色。暗色主题下与 link-dark 共用同一值。

### Neutral
- **纸白 / 墨黑（bg / bg-dark）**：页面底色。顶部导航用 88% 的 bg 叠半透明模糊。
- **浅灰底（bg-subtle）**：代码块、引用块、表头、搜索入口、篇目行与翻页卡片的悬停底。
- **悬停灰（bg-hover）**：导航链接与侧栏链接的悬停底、侧栏当前篇的常驻底、行内代码底。
- **主文字（fg）**：标题、正文、主按钮底色（主按钮文字反用 bg）。
- **次文字（fg-2）**：导语、条目摘要、导航默认态、表头文字。
- **辅助文字（fg-3）**：元信息（篇数、日期、来源）、本页目录默认态、代码语言条、面包屑。
- **细线（border）**：条目分隔、页头底线、代码块与表格外框、侧栏右边线。
- **强线（border-strong）**：次按钮与搜索入口的边框、品牌名分隔线、课程标签边框、滚动条。
- **选区蓝（selection）**：文本选区与搜索结果高亮。

### Named Rules
**The 一支蓝 Rule.** 蓝色只表示“可以点”或“焦点在这里”。状态、分类、当前位置一律用中性灰的明度与字重表达；本页目录和侧栏的当前项都是 fg + 500 字重，不是蓝色。

**The 双主题同构 Rule.** 新增颜色必须同时给出亮色与暗色两个值，并作为 `:root` 变量定义；组件里不写死十六进制色值。

## Typography

**Display Font:** Geist（回退 PingFang SC、Hiragino Sans GB、Microsoft YaHei、system-ui）
**Body Font:** 同上，全站一套无衬线
**Label/Mono Font:** Geist Mono（回退 ui-monospace、SFMono-Regular、Menlo、Consolas）

**Character:** Geist 负责拉丁字母和数字，中文自然落到系统黑体；标题用 600 字重加负字距收紧，正文保持宽松行距。两款字体均从 `public/fonts/` 自托管，`font-display: swap`，正文字体预加载。

### Hierarchy
- **Display**：首页与目录页主标题。
- **Article title**：文章页 H1；860px 及以下降为 32px。
- **Headline**：正文 H2；正文内上方留 56px，760px 及以下降为 22px。
- **Title**：首页 / 目录条目标题；项目名的 owner 部分用 400 字重 + 辅助文字色，仓库名保持 600。
- **Subhead**：正文 H3。
- **Lead**：页头导语，最大行宽 36em，用次文字色；760px 及以下 17px。文章首段同样放大为 17px 次文字色。
- **Body**：正文。条目摘要为 15px 次文字色，最大行宽 46em；正文栏本身上限 720px。
- **UI**：按钮、导航、侧栏链接（导航与侧栏为 400 字重，当前项升为 500）。
- **Label**：元信息、面包屑、目录标签，等宽数字（tabular-nums）。
- **Code**：多行代码；行内代码为 0.875em，带 1px 细线与浅底。

**The 字重定位 Rule.** 当前位置、当前页用字重（500）和主文字色标出，不加颜色、不加下划线、不加竖线。

## Layout

- **顶部导航**：64px 粘性（760px 及以下 56px），内容上限 1400px，左右 24px。品牌、课程、项目解读，搜索入口推到最右（240px 宽，窄屏只剩图标）。
- **通用页面**（首页、目录、搜索、404）：容器上限 1080px，上 64px、左右 24px；页头下方 40px 留白后接 1px 底线。条目列表只用上下细线分隔，条目上下各 28px（560px 及以下 24px），不做卡片网格。
- **文章页三栏**：240px 左栏 + 正文（上限 720px，居中）+ 220px 右栏，栏距 48px，总宽上限 1400px。左右栏粘性贴在导航下方，各自独立滚动。
  - 1180px 及以下：去掉右栏，左栏缩为 220px；本页目录改为标题下方的原生折叠块，默认收起，选中章节后自动收起并把焦点移到目标标题。
  - 860px 及以下：单栏，左右 16px，隐藏左栏；面包屑承担返回入口。
  - 560px 及以下：条目标题与元信息纵排，上一篇 / 下一篇改为单列。
- **间距节奏**：以 4px 为基，常用 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64（frontmatter `spacing`）。
- **滚动**：平滑滚动，锚点预留导航高度 + 24px。长代码与表格在自身外框内横向滚动。
- **打印**：隐藏导航、页脚、左右栏、折叠目录、面包屑和翻页；代码改为换行，正文 10.5pt。

**The 两层阅读路径 Rule.** 项目目录 `/projects/` 直接进入文章 `/projects/:slug/:article/`，没有中间的项目落地页；项目名直达首篇，旧的 `/projects/:slug/` 只做 301 重定向到首篇。

## Elevation & Depth

完全扁平：没有 box-shadow，没有渐变。层次只靠三件事——浅灰底（bg-subtle / bg-hover）、1px 细线（border / border-strong）、文字明度（fg → fg-2 → fg-3）。唯一的“材质”是顶部导航：88% 不透明底色叠 `saturate(180%) blur(12px)` 背景模糊，配一条底线。

交互反馈只变底色、边线或文字色，过渡 0.15s；唯一的位移是篇目链接箭头悬停右移 2px（0.2s，`cubic-bezier(.16,1,.3,1)`），以及折叠目录箭头旋转 180°。减少动态效果偏好下关闭全部过渡与平滑滚动。

**The 线不是影 Rule.** 需要把一块内容从背景里分出来时，用 1px 细线或浅灰底，不用投影。

## Shapes

- **6px（md）**：默认圆角——按钮、搜索入口、导航与侧栏链接、代码块、表格外框、引用块、篇目列表外框、折叠目录、跳转链接、品牌图标。
- **4px（sm）**：小件——行内代码、代码复制按钮、焦点轮廓。
- **10px（lg）**：只用于上一篇 / 下一篇翻页卡片。
- **全圆（pill）**：只用于条目标题旁的“课程”类型标签。

品牌标识是 32×32、7px 圆角的近黑方块，白色折线字形；它与 fg 同色。图标统一为内联 SVG 线性图标，16px（列表内 14px），线宽 1.5–1.6，圆端点，继承文字颜色，对读屏隐藏。

## Components

### Buttons
扁平、紧凑、可预期。高 40px，6px 圆角，14px / 500。
- **Primary**：fg 实心、bg 文字；悬停把底色向 bg 混 14%。每屏最多一个，用于首页“浏览项目解读”、404“返回学习笔记”。
- **Secondary**：bg 底 + border-strong 边框 + fg 文字；悬停换 bg-hover。可带右箭头图标（课程“开始阅读”）。
- **Focus**：全站统一 2px focus 外轮廓、2px 间距。

### Navigation
- **顶部导航**：链接默认 fg-2，悬停 fg + bg-hover 底；当前栏目 fg + 500，无底色。品牌名后以强线隔出“学习笔记”副名（窄屏隐藏）。
- **搜索入口**：外观是输入框但实为链接，跳到 Pagefind 搜索页；浅灰底、强线边框、放大镜图标 + 占位文字。Pagefind UI 的颜色、圆角、字体经变量接入本系统。
- **跳到正文**：键盘聚焦时从顶部出现，fg 实心。

### Entry List（首页与目录共用）
- 条目 = 标题行（标题 + 右侧元信息）+ 一句摘要 + 篇目链接，条目之间只有细线。
- **紧凑篇目**（首页）：一行横排文字链接，每项带 14px 右箭头，悬停变蓝、箭头右移。
- **完整篇目**（项目目录）：细线外框 + 6px 圆角的单层纵向列表，每行标题 + 短摘要 + 箭头，悬停浅灰底、标题变蓝。
- **课程条目**：标题旁 pill 标签“课程”，下方一个 Secondary 按钮直接进入课程。
- 首页把课程和项目合并成一个列表，按 `createdAt` 从新到旧排列，同一时间用反向插入顺序；只有首页这样排，项目目录与课程目录保持各自的目录顺序。

### Docs Sidebar（文章左栏）
顶部是“全部项目”返回链接，其下是项目名（owner/ 用辅助色）与本项目的篇目列表：默认 fg-2，悬停与当前篇均为 bg-hover 底 + fg，当前篇再加 500 字重与 `aria-current="page"`。底部细线隔开来源信息（12px）。

**The 原位返回 Rule.** 返回链接（桌面为左栏“全部项目”，窄屏为面包屑“项目解读”）固定回到项目目录对应项目处，并恢复离开时的滚动位置与链接焦点；视口宽度变了就退化为滚到该项目。

### Article TOC（右栏 / 折叠目录）
只列当前文章的 H2，13px 辅助色；随滚动高亮当前章节为 fg + 500，并设 `aria-current="location"`。目录显示的精简标签与条目短摘要来自 `content/reading.json`，正文标题与锚点不变；缺失时回退到原标题 / 原描述。

### Code Block
由文章页脚本包裹：38px 高的语言条（等宽 12px、辅助色、底线）+ 右侧透明“复制”按钮（悬停 bg-hover）。复制成功显示“已复制”，失败提示手动选中，1.6s 后复原；脚本不可用时代码块照常显示。整体浅灰底、细线外框、6px 圆角；暗色主题切到 Shiki 的暗色配色。

### Tables & Quotes
表格放进可横向滚动的细线圆角外框，表头浅灰底 13px 次文字色，单元格只有横向细线。引用块为细线圆角浅灰底，次文字色。

### Article Pagination
文末两列卡片：细线外框、10px 圆角，小字“上一篇 / 下一篇”在上、文章名在下；下一篇右对齐。悬停加深边线并给浅灰底。首尾篇只显示存在的一侧。

## Do's and Don'ts

### Do:
- **Do** 所有颜色走 `:root` 变量，亮暗两套值成对定义。
- **Do** 用 1px 细线和浅灰底区分层次，圆角默认 6px。
- **Do** 把蓝色留给链接与焦点；当前位置用 fg + 500 字重表达。
- **Do** 新页面复用通用页面容器（1080px）与条目列表；长文复用三栏文档布局与 720px 正文栏。
- **Do** 字体只用本地自托管的 Geist / Geist Mono 与系统中文黑体。
- **Do** 每个交互保留可见的 2px 焦点轮廓，并尊重减少动态效果偏好。

### Don't:
- **Don't** 加 box-shadow、渐变、插图或装饰性图片。
- **Don't** 引入第二种强调色，或用彩色表达分类、状态。
- **Don't** 把条目列表改成卡片网格，或在项目目录与文章之间加中间落地页。
- **Don't** 引入衬线标题字或网络字体；不要把 `public/courses/rust/` 的旧教材样式搬进本系统。
