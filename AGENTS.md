# 个人博客 · 站点

公开仓库 `windery/windery.github.io`，部署到 https://windery.github.io（GitHub Pages）。这里管「怎么展示」，只存已发布的文章。

生产流程（候选、待审稿、写作规范、飞书通知、发布工具）在隔壁私有仓库 `../内容/`。动手前先读它的 `AGENTS.md`、`GLOSSARY.md` 和 `docs/adr/`；术语以那里的 `GLOSSARY.md` 为准。

## 命令

```sh
npm ci
npm run dev       # 127.0.0.1 编辑预览；Pagefind 搜索在 dev 下不可用
npm run build     # astro build + Pagefind + starlight-links-validator，有断链就失败
npm run preview   # 看搜索和完整效果：先 build 再 preview
```

没有测试；`build` 通过就是验收线。

## 结构

- Starlight 站点，所有页面都是 `src/content/docs/` 下的 Markdown。五个栏目对应五个子目录：`news` `tools` `practice` `projects` `courses`。
- 栏目切换用 `starlight-sidebar-topics`：每个栏目有自己的侧栏，在 `astro.config.mjs` 里配置。首页 `index.mdx` 用 splash 模板，不属于任何栏目。
- **项目深读**：`projects/<项目>/<overview|usage|internals>.md`。frontmatter 必须有 `source`（仓库地址）和 `date`，缺了构建失败；标题下的来源行（仓库 · 日期）也由同一处渲染。逻辑在 `src/components/PageTitle.astro`（覆盖了 Starlight 的 PageTitle）。新增项目要在 `astro.config.mjs` 的 `projects` 列表和 `projects/index.md` 里各加一行。
- **系统课程**：`courses/<课>/<章>/<节>.md`，最多三级，侧栏按目录自动生成；章节导读写成该目录的 `index.md`。风格参考廖雪峰的 Python 教程。
- 额外的 frontmatter 字段定义在 `src/content.config.ts`。`giscus: false` 关闭本页评论，首页和「即将上线」页都关了。

## 现状（2026-10-22）

- `starlight` 分支是重写后的新站，还没合并进 main。线上仍是旧站。
- AI 快讯、工具箱、实践和系统课程只有「即将上线」页。新 Rust 课程另外做。
- Giscus 评论还没接上：仓库要先开 Discussions、装 Giscus App。

## 规则

- 仓库和网站都公开：不放本机路径、凭据、私人笔记和没批准公开的内容。
- 项目文章只写源码能证实的内容。
- 已发布文章只在这里存一份；要改已发布的文章，直接改这里。
- 推送前先 fetch：别的会话可能已经推了提交。
- 无头 Chrome 截图的宽度和暗色模式不可信，要用 DevTools 协议模拟。
