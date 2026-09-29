---
name: Rust 阅读课
description: 以暖白纸面、中文层级与真实代码组织的离线技术教材
colors:
  paper: "#faf8f3"
  ink: "#292c29"
  muted: "#686b62"
  accent: "#a33e25"
  line: "#d9d8cf"
  surface: "#f0eee6"
  sage: "#e8ede5"
  code: "#f0efe8"
typography:
  display:
    fontFamily: "\"Songti SC\", \"Noto Serif CJK SC\", \"STSong\", Georgia, serif"
    fontSize: "clamp(38px,4.1vw,58px)"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-.035em"
  lesson-title:
    fontFamily: "\"Songti SC\", \"Noto Serif CJK SC\", \"STSong\", Georgia, serif"
    fontSize: "clamp(30px,3vw,44px)"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-.035em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.9
  lead:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.95
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.75
  code:
    fontFamily: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.9
rounded:
  control: "3px"
  inline-code: "2px"
spacing:
  space-1: "8px"
  space-2: "16px"
  space-3: "24px"
  space-4: "32px"
  space-5: "48px"
  space-6: "64px"
components:
  button-default:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "11px 19px"
  button-start:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "12px 22px"
  button-copy:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
  search:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    width: "100%"
  lesson-row:
    textColor: "{colors.ink}"
    padding: "15px 10px 17px"
  code-block:
    backgroundColor: "{colors.code}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.control}"
    padding: "24px"
  answer-disclosure:
    backgroundColor: "transparent"
    padding: "17px 0"
---

# Design System: Rust 阅读课

## Overview

**Creative North Star: "可反复翻阅的中文技术教材"**

以“可反复翻阅的中文技术教材”为视觉参照：暖白纸面承载深墨正文，宋体标题形成章节感，铁锈橙标注可行动的位置。信息密度由段落、细线与留白调节，服务长文阅读和代码推理。

系统来自已实现的共享样式与生成模板。首页的阶段目录、课程的窄正文和第 7 节借用演示各有任务，不要求所有页面套同一构图。字体和脚本均保持本地可用，不引入网络依赖。

**Key Characteristics:**
- 暖白纸面与深墨正文
- 中文衬线标题、系统无衬线正文、等宽代码
- 细分隔线与小圆角，静态表面无阴影
- 真实代码、折叠解析与明确的交互状态

依据：`assets/course.css` 为视觉实现，`assets/course.js` 为交互实现，`scripts/build_course.py` 为生成模板，`course/content.py` 为教学内容。抽样核对首页与 `lessons/0007-borrowing.html`；已有截图仅作现状参考，不表示用户批准图或新增浏览器测试。前置机器可读值记录真实复用样式，间距保留已有 CSS 变量名的数字级次。

## Colors

单一铁锈橙强调色与暖中性色组成教材纸面；状态色只表达具体交互结果。

### Primary
- **铁锈橙（accent）**：正文链接、品牌方块、阶段序号、首页开始按钮、焦点轮廓与选择状态。

### Neutral
- **暖白纸（paper）**：全页背景，以及深底按钮上的浅色文字。
- **深墨（ink）**：正文、标题与常规实心按钮。
- **灰橄榄（muted）**：说明、辅助导航与来源。
- **纸边灰（line）**：分隔线、表格边线与答案选项边界。
- **浅纸层（surface）**：行内代码、目录悬停与表头。
- **代码纸（code）**：多行代码与代码工具栏。
- **淡鼠尾草（sage）**：已读按钮的按下状态；对应状态仍须显示文字。

链接、选项反馈和语法高亮另有局部色值，保留在实现中；不要把它们当成新增品牌主色。sidecar 的八阶色带仅供面板展示，由现有颜色推导，不是新的实现令牌。

## Typography

**Display Font:** Songti SC，依次回退 Noto Serif CJK SC、STSong、Georgia、serif。  
**Body Font:** 系统无衬线，包含 PingFang SC 与 Microsoft YaHei。  
**Label/Mono Font:** SFMono-Regular、Consolas、Liberation Mono、Menlo、monospace。

标题带有中文教材章节感，正文以清晰连续阅读为主。只调用本地可用字体，不下载字体包。

### Hierarchy
- **Display**：首页及通用页面主标题使用 display；首页行高单独增至 (1.5)。
- **Lesson title**：课程标题使用 lesson-title；移动尺寸见 Layout。
- **Headline**：通用二级标题使用 headline；课程分节标题为 (23px)，最窄断点为 (22px)。
- **Body / Lead**：正文使用 body；导读使用 lead 与辅助文字色。课程段落上限 (42em)，导读通常不超过 (34em)。
- **Label / Code**：辅助说明使用 label；代码使用 code，标题栏与按钮局部缩小。不要将小字号辅助文字用于主要教学段落。

**The 阅读层级 Rule.** 大标题负责章节识别；正文保留足够行距；代码独立使用等宽字体。

## Layout

全站外框上限 (1232px)，桌面左右内边距 (32px)。基础间距级次见 frontmatter；真实布局也使用内容所需的中间值，不要求强制吸附所有数值。

首页主区为内容与教学代码双栏；课程目录按阶段分组，阶段侧栏 (220px)、间隔 (48px)，条目以编号、标题与说明连续排列。目录不是独立重复卡片网格。此规则只适用于课程目录。

课程桌面为侧栏 (190px)、间隔 (78px) 与正文上限 (720px)。侧栏距顶部 (32px) 粘性定位。速查有独立容器与表格，不套用课程侧栏。

- 在 (1000px) 及以下收紧栏宽和间距；课程侧栏变为 (160px)、栏距 (40px)。
- 在 (740px) 及以下，页面左右留白 (24px)，首页与阶段目录单栏，课程侧栏改为正文前的流式导航；课程标题 (34px)。
- 在 (480px) 及以下，页面左右留白 (20px)，搜索栏纵排、参考入口单栏；课程标题 (30px)，正文代码 (12px)，代码内边距 (18px 16px)。

长代码与表格在自身容器横向滚动。打印使用 (18mm) 页边距，隐藏操作组件，展开答案，代码允许换行。

## Elevation & Depth

静态界面无 box-shadow。层次由暖纸底色、代码浅底、细分隔线以及文字密度建立。交互以底色、边框或文字颜色变化呈现，无位移或缩放动画。常规按钮和目录条目采用 (0.16s) 颜色或背景过渡；减少动态效果偏好关闭过渡与平滑滚动。

**The 纸面分层 Rule.** 用纸色、浅底色与细线区分内容层次；不为普通阅读容器增加阴影。

## Shapes

按钮、输入框、代码块和选项采用 frontmatter 的 control 小圆角；行内代码使用 inline-code。阅读区域与分组保留平直细线，不套大圆角面板。品牌为方形文字标识；普通内容不需要额外徽章。

## Components

### Buttons
常规提交与已读操作为深墨实心按钮；首页开始按钮使用铁锈橙，是局部强调变体。复制按钮为透明底细边框。hover 改底色，focus-visible 使用强调色 (2px) 外轮廓与 (5px) 间距；禁用态透明度 (0.5)。已读按钮通过 aria-pressed 与文字共同表达可撤销状态。

### Inputs / Fields
搜索使用透明底、细边框与小圆角，标签始终可见。输入后筛选课程，同时隐藏空阶段，保留空结果提示。判断题使用原生单选框，选中后改变选项底色和边框；提交反馈通过 aria-live 与文字说明结果。

### Navigation
全站导航使用辅助文字色，悬停转为强调色；课程侧栏锚点与底部前后课链接保持文本可读。跳到正文链接在键盘聚焦时显示。移动侧栏变为流式导航，不遮挡正文。方向箭头统一使用内联 SVG，尺寸 (16px)、线宽 (1.5)，圆端点与圆连接，继承文字颜色；辅助图标对读屏隐藏。

### Course Directory
阶段标题与细线建立分组，行项悬停使用浅纸层；编号使用等宽字体，已读状态补充“已读”文字。目录入口的视觉密度与长文页不同，不把目录行变成全站内容容器。

### Code & Answers
代码块使用等宽字体与浅代码底；工具栏显示文件名与复制操作。复制失败显示手动复制说明。折叠答案采用原生 details/summary 与强调色标记；展开内容仍可离线阅读，无脚本时保留解析入口。误读提示采用上下分隔线与强调文字。

### Borrowing Study
第 7 节专用的三步借用演示使用细边框区域、等分步骤按钮、代码行与数据关系图。按下态通过 aria-pressed、边框和底色表达，内容对应本课代码。它是教学组件样例，不要求其他课无差别添加演示。

## Do's and Don'ts

### Do:
- **Do** 从共享样式与生成模板修改视觉系统，再生成对应页面，保持结果可复现。
- **Do** 沿用标题、正文、代码三种字体角色；保持本地字体回退与离线资源。
- **Do** 为交互保留键盘焦点、文字反馈与可识别状态；已读标记不代表已掌握。
- **Do** 根据页面任务组织布局；目录分阶段，正文控制行宽，速查保留表格。

### Don't:
- **Don't** 用装饰性示例代替教学代码，或让视觉状态暗示未经证明的学习结果。
- **Don't** 把首页双栏或某节演示强制推广成每个页面的模板。
- **Don't** 引入网络字体、外部 JavaScript 或普通容器的投影层。

## 本站扩展：项目目录与文章阅读

本站保留暖白、铁锈色与中文阅读字体；上述 Rust 课程规则及独立样式保持独立。共享基础样式见 `src/styles/site.css`，项目目录与文章布局以 `src/styles/reading.css` 为准。只读学习站不使用装饰图片、营销指标卡或无意义动效。

- **两层阅读路径**：`/projects/` 直接进入 `/projects/:slug/:article/`，不设置中间项目落地页。项目名称直达首篇；旧 `/projects/:slug/` 仅保留静态重定向至首篇。
- **纵向篇目**：目录按项目分组，桌面左侧显示项目名称、简介及元信息，右侧按阅读顺序纵向排列子篇。每行包含编号、标题、短摘要和箭头，以细线分隔，不改为横向卡片。窄屏项目介绍与篇目上下排列。
- **紧凑树形目录**：文章桌面布局为 228px 侧栏、72px 栏距与最多 740px 正文；侧栏粘性定位并独立滚动。全部篇目保持可见，仅当前篇展开 H2 章节。当前篇以浅底标识，当前章节以铁锈色文字及竖线标识，并保留 `aria-current` 状态。
- **移动阅读**：850px 及以下使用正文前的原生折叠目录；选择章节后收起目录并将焦点移至目标标题。640px 及以下项目目录变为单栏。打印时隐藏阅读导航，减少动态效果偏好关闭篇目过渡。
- **显示文案**：短摘要与精简 H2 标签由 `content/reading.json` 管理，保持正文标题与锚点不变；缺失时使用文章原有信息。组件职责分别见 `ProjectEntry.astro`、`ArticleList.astro` 与 `ReadingTree.astro`。
