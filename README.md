# Windery 学习笔记

公开学习站，包含系统课程与获授权公开的项目解读。网页以 Astro 生成静态 HTML，全文搜索使用 Pagefind，GitHub Actions 发布到 GitHub Pages。

## 本地阅读与预览

需要 Node.js 24 或满足 package.json 的工具链。

```sh
npm ci
npm run build
npm run preview
```

`npm run dev` 用于编辑预览；搜索索引在 build 后生成，请用 preview 验证全文搜索。

## 内容如何组织

- `content/catalog.json`：明确的公开目录。`tracks` 定义学习方向（`java` Java 与架构、`ai` AI 开发、`extra` 语言与工具），可随学习重点增删或调整顺序；课程与项目用 `track` 归入某个方向，未写或写错时归入最后一个。课程可选 `status`（`planned` 筹备中、`writing` 连载中、`done` 已完结），未写 `href` 的课程只展示不链接。项目的 `articles` 列表控制发布篇目；`createdAt` 记录创建时间，供首页「最近更新」排序。
- `content/reading.json`：按项目 slug、文章 slug 维护目录短摘要 `summary` 与 H2 显示标签 `headings`；导入器不会覆盖该文件。
- `src/content/projects/<项目>/<编号>.md`：项目文章的可编辑源文件；记录来源仓库、commit 和阅读日期。
- `public/courses/rust/`：已导出的 Rust 课程、练习和示例下载。
- `src/layouts/`、`src/styles/`：共享页面与教材式样式。

首页按学习方向分组：每个方向列出课程，以及归入该方向的项目解读；没有课程的方向显示「筹备中」。方向之后是「最近更新」，取课程与项目按 `createdAt` 倒序的前 6 条，同时间条目采用反向插入顺序。`/courses/` 用同样的方向分组，只列课程。旧条目的创建时间已根据首次入库的 Git commit 时间补齐；项目导入器在首次导入时生成 `createdAt`，后续更新保留该值。排序仅作用于首页，项目目录、课程目录及其他入口保持原有组织方式。

项目阅读只有两层：从 `/projects/` 的纵向篇目进入 `/projects/:slug/:article/`。项目名称直接打开首篇，旧 `/projects/:slug/` 静态重定向到首篇，不再展示独立落地页。文章侧栏仅显示本文 H2 目录；桌面本文目录上方、手机文章顶部的“返回”固定回到项目总目录并恢复列表滚动位置与焦点，文末提供具名的上一篇／下一篇。手机端的本文目录位于标题下方，默认折叠，点击章节锚点后自动关闭。

编辑 `content/reading.json` 时，`headings` 的键必须与正文原始 H2 文本一致，值是目录中显示的短标签；正文标题与原有锚点保持不变。没有配置 `summary` 时回退到文章的 `description`，没有配置 H2 标签时显示原始标题。导入更新文章后，如 H2 有变化，应同步检查这些显示标签。

## 添加项目文章

使用独立的 `project-to-pages` 技能从源码生成文章，也可导入 `project-to-feishu` 的已有 Markdown。飞书和本站各自发布。GitHub 项目默认以 `owner/repository` 展示，新项目路径采用 `owner-repository`；更新已有项目保留网址。发布前应用本地配置中用户指定的排除项。

1. 明确要公开的项目和篇目。文档须获公开授权，并检查草稿不含本机路径、密钥、内部链接或私人笔记。
2. 把选中的编号 Markdown 文件放入一个独立目录，如 `01-项目概览.md`、`02-使用指南.md`。
3. 使用已登录的 GitHub CLI 导入。命令会核实源仓库公开、commit 存在，并拦截部分明显敏感信息；仍需人工审阅。

```sh
npm run import:project -- \
  --dir /path/to/reviewed-public-drafts \
  --slug owner-repository \
  --name 'owner/repository' \
  --repo owner/repository \
  --commit FULL_40_CHARACTER_COMMIT_SHA \
  --date 2026-09-29 \
  --description '这个项目解决什么问题。' \
  --track ai
```

`--track` 可选，取 `content/catalog.json` 中某个方向的 slug；更新已有项目时省略会保留原来的方向。

私有仓库的文档已获公开授权时，在上述命令增加 `--allow-private-source`；页面标注「私有源码 · 文档公开」，不生成不可访问的源码按钮，也不改变源仓库权限。导入器会拒绝用另一来源覆盖已有项目路径。

4. 运行 build 与 preview，核对文章、来源、代码块和链接；检查 Git diff。
5. 确认内容后提交并推送到 main，网站自动重新发布。

导入只写本地文件，不自动提交、不推送、不更新飞书。同项目按文章编号覆盖选定稿件，因此先保留人工修改。目录未列出的旧稿不会生成公开网页。网页构建阶段不调用飞书，也不保存飞书凭证。

若文章只存在于飞书，先通过 `lark-cli docs +fetch --doc <指定文档> --doc-format markdown` 读取选定文档，将正文整理成上述草稿格式，检查后再导入。不要把 CLI 返回的身份、评论、权限或配置元数据发布到网站。

## 更新 Rust 课程

在原课程工作区完成内容生成与核验，再导出公开副本：

```sh
python3 scripts/import-rust.py /path/to/rust-course
npm run build
```

导出器只复制课程页、样式、交互和 Rust 示例，并在每页 `course.css` 之后加载站点主题 `public/course-theme/rust.css`，让课程与全站风格一致而不改原课程工作区；不复制学习记录、个人目标、临时截图、工具状态、完整本地 README 或凭证。站内下载包括可运行的 Rust 示例包。浏览器已读标记属于当前设备，不跨设备同步。

## 发布

main 分支推送触发 `.github/workflows/deploy.yml`。Pages 设置使用 GitHub Actions。发布产物只包含 `dist/`；无需服务器、数据库或飞书 token。

本仓库和网站均公开。不要放入私人课程记录或尚未批准公开的内容。
