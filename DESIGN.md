---
name: Windery 学习笔记
description: 白底、无衬线、只有一种荧光黄强调色的个人学习站
colors:
  paper: "#ffffff"
  ink: "#161614"
  muted: "#66655f"
  line: "#e7e6e1"
  surface: "#f5f5f2"
  mark: "#ffe14a"
  mark-soft: "#fff3a8"
typography:
  sans:
    fontFamily: "\"Schibsted Grotesk\", -apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", sans-serif"
  mono:
    fontFamily: "\"JetBrains Mono\", \"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, monospace"
  tab:
    fontSize: "20px"
    fontWeight: 650
  entry-name:
    fontSize: "17px"
    fontWeight: 650
  entry-desc:
    fontSize: "14px"
    lineHeight: 1.7
  meta:
    fontSize: "13px"
  tag:
    fontSize: "12px"
  reader-title:
    fontSize: "40px"
    fontWeight: 650
rounded:
  tag: "4px"
  control: "6px"
---
# Design System: Windery 学习笔记

## Overview

Windery 自己的学习站：课程与开源项目解读。界面要简洁，重要信息突出，其余都退后。只有浅色主题，全站统一，Rust 课程的导出页也套用同一套外观。

- 白底、深墨文字、细分隔线，没有装饰图片、口号或营销式文案。
- 唯一的强调色是荧光黄（`mark`），像在书上划重点：链接下划线、当前 tab、悬停时的名称高亮、当前目录项。
- 中文用系统无衬线字体；拉丁字母用自托管的 Schibsted Grotesk；版本号、commit、代码用 JetBrains Mono。
- 读者关心的来源信息要具体：代码仓库链接、发布版本号、commit 和阅读日期，不用「公开源码」「版本」这类空标签。
- 站点的定位与描述不随阶段学习目标变化，阶段目标不写进站点文案。

## Colors

- **paper**：全页背景。
- **ink**：正文、标题、链接文字、品牌方块。
- **muted**：说明、元信息、未选中的 tab。
- **line**：分隔线与边框。
- **surface**：版本号与 commit 的底色、悬停底色、表头。
- **mark**：荧光黄。当前 tab 的下划线、链接下划线、名称悬停高亮、文字选区。
- **mark-soft**：浅黄。「连载中」状态、当前目录项、导航当前项。

不要再加第二种强调色。状态只靠浅黄、灰底和细边框区分。

## Typography

`--serif` 与 `--sans` 都指向同一组无衬线字体，旧样式里的 serif 引用因此也是无衬线。字体文件在 `public/fonts/`，只覆盖拉丁字符，中文走系统字体，不下载中文字体。

- 首页 tab：20px / 650。
- 列表条目名称：17px / 650；项目的 owner 部分用 muted、常规字重。
- 条目说明：14px，行高 1.7。
- 元信息：13px，数字等宽对齐；版本号和 commit 用 mono 12px 加 surface 底。
- 文章标题：40px，窄屏 36px。

## Layout

### 顶栏与页脚

顶栏只有品牌「Windery / 学习笔记」和「搜索」。课程和项目解读的入口是首页的 tab，不在顶栏重复。页脚只有站名和「内容与源码」链接。

### 首页

- 页面上一组 tab：「课程」|「项目解读」，下面直接是所选 tab 的列表。没有方向筛选，也没有计数。
- 两个 tab 用同一种行样式：左侧名称和一行说明，右侧元信息；行与行之间是细线。窄屏时元信息移到说明下方。
- 课程行的元信息：状态标签（筹备中 / 连载中 / 已完结）和课时说明。项目行的元信息：发布版本（没有时显示 `commit xxxxxxx`）、篇数、阅读日期。
- 两个列表都按 `updated` 倒序。
- 打开的 tab 记在 URL 里：`/?tab=projects` 直接打开项目解读。旧地址 `/courses/` 和 `/projects/` 跳转到对应 tab。
- 无脚本时两个列表上下依次显示，各带标题。

样式见 `src/styles/route.css`，页面见 `src/pages/index.astro`。

### 文章页

- 桌面左侧栏：最上方是「全部项目解读」链接（回到项目解读 tab），下面是本文的 H2 目录，粘性定位，当前章节用 mark-soft 底色标出。
- 标题下一行写项目名和「第 N 篇，共 M 篇」。再下一行是来源信息（`SourceMeta.astro`）：代码仓库链接（私有仓库只写名称并标「私有仓库」）、版本号与 commit 链接、阅读日期。
- 文末是带标题的「上一篇 / 下一篇」。
- 850px 及以下把目录收进标题下方的折叠组件；640px 及以下表格在页边距内横向滚动。

样式见 `src/styles/reading.css`。

### Rust 课程

导出的 HTML 不改结构，只在 `course.css` 之后加载 `public/course-theme/rust.css`，换成本站的颜色、字体和强调方式。`scripts/import-rust.py` 每次导入都会注入这个样式表。

## Shapes & Depth

- 小圆角：标签 4px，控件 6px，代码块 8px。
- 静态内容没有阴影，也不用卡片做结构。层次靠留白、细线和字重。
- 过渡只用于颜色和底色（约 0.16s）；减少动态效果偏好下关闭过渡。

## Do's and Don'ts

### Do
- 先问一个页面上什么最重要，让它最显眼，其余退后。
- 给版本、commit、仓库这些读者会查的信息具体值和链接。
- 新增组件沿用现有的 token 和行样式。

### Don't
- 不加口号、导语、eyebrow 标签或 01/02 式的分节编号。
- 不在两处放同一个导航入口。
- 不加深色主题、第二种强调色或装饰性阴影。
- 不让阶段学习目标出现在站点文案里。
