# Windery 学习笔记

公开学习站，包含系统课程与公开项目解读。网页以 Astro 生成静态 HTML，全文搜索使用 Pagefind，GitHub Actions 发布到 GitHub Pages。

## 本地阅读与预览

需要 Node.js 24 或满足 package.json 的工具链。

```sh
npm ci
npm run build
npm run preview
```

`npm run dev` 用于编辑预览；搜索索引在 build 后生成，请用 preview 验证全文搜索。

## 内容如何组织

- `content/catalog.json`：明确的公开目录。项目的 `articles` 列表控制发布篇目。
- `src/content/projects/<项目>/<编号>.md`：项目文章的可编辑源文件；记录来源仓库、commit 和阅读日期。
- `public/courses/rust/`：已导出的 Rust 课程、练习和示例下载。
- `src/layouts/`、`src/styles/`：共享页面与教材式样式。

## 添加 project-to-feishu 生成的文章

优先使用该技能生成的本地 Markdown 草稿作为同一份内容来源。飞书和本站是两个发布落点；不要先把整座知识库抓取并公开。

1. 明确要公开的项目和篇目。源项目必须公开，并检查草稿不含本机路径、密钥、内部链接或私人笔记。
2. 把选中的编号 Markdown 文件放入一个独立目录，如 `01-项目概览.md`、`02-使用指南.md`。
3. 使用已登录的 GitHub CLI 导入。命令会核实源仓库公开、commit 存在，并拦截部分明显敏感信息；仍需人工审阅。

```sh
npm run import:project -- \
  --dir /path/to/reviewed-public-drafts \
  --slug example-project \
  --name 'Example Project' \
  --repo owner/repository \
  --commit FULL_40_CHARACTER_COMMIT_SHA \
  --date 2026-09-29 \
  --description '这个项目解决什么问题。'
```

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

导出器只复制课程页、样式、交互和 Rust 示例；不复制学习记录、个人目标、临时截图、工具状态、完整本地 README 或凭证。站内下载包括可运行的 Rust 示例包。浏览器已读标记属于当前设备，不跨设备同步。

## 发布

main 分支推送触发 `.github/workflows/deploy.yml`。Pages 设置使用 GitHub Actions。发布产物只包含 `dist/`；无需服务器、数据库或飞书 token。

本仓库和网站均公开。不要放入私人课程记录或尚未批准公开的内容。
