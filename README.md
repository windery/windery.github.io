# Windery

个人博客，部署在 https://windery.github.io 。用 Astro 的文档主题 Starlight 生成静态网站，GitHub Actions 发布到 GitHub Pages。

本仓库只存已发布的文章；选题、写稿、审稿在私有的内容仓库里进行。

## 本地预览

需要 Node.js 24。

```sh
npm ci
npm run dev       # 编辑预览
npm run build     # 构建，含站内链接检查和搜索索引
npm run preview   # 看构建结果；全文搜索只在这里可用
```

## 栏目

| 栏目 | 网址 | 目录 |
|---|---|---|
| AI 快讯 | /news/ | `src/content/docs/news/` |
| AI 工具箱 | /tools/ | `src/content/docs/tools/` |
| AI 实践 | /practice/ | `src/content/docs/practice/` |
| 项目深读 | /projects/ | `src/content/docs/projects/<项目>/<文章>.md` |
| 系统课程 | /courses/ | `src/content/docs/courses/<课>/<章>/<节>.md` |

## 发布

推送到 main 触发 `.github/workflows/deploy.yml`，构建后发布 `dist/`。
