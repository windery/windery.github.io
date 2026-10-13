# PR 预览运维与安全边界

仅为以 main 为目标的同仓库 PR 发布预览；fork PR 不自动发布。
PR HTML/JavaScript 与主站同源，不能视作浏览器安全沙箱。若开放给不可信
贡献者，应先迁移到独立预览域名。不要在此域名存放敏感登录状态。

## 执行边界

- `pull_request_target` 仅使用 main 的工作流与控制脚本。主站也始终构建 main。
- 构建 job 只有 contents/read 和 pull-requests/read，没有 Pages/OIDC/评论写权限。
- PR 的 npm lifecycle/build 仅在非 root Docker 容器内执行；禁用 capabilities、
  提权和可写根目录；不挂载 runner、令牌、Docker socket、主站或缓存。
- 源码只读挂载，工作区和 npm 缓存是每次新建的 tmpfs；输出是独立限额 tmpfs。
  时间、内存、进程数和日志缓冲均有限额。只信任 Docker/宿主内核隔离，
  不声称能抵御容器逃逸；只使用 GitHub 托管 runner。
- 容器停止后先拒绝符号链接、硬链接、特殊文件与超限产物，才重写、复制静态文件。
  PR 输出和日志不会作为命令执行。重写失败只移除该 PR 的预览。
- 只有 deploy job 有 pages/write 和 id-token/write；只有 comment job 有评论写权限。
- 主站和预览均不读写 Actions/npm 共享缓存。

## 路径与生命周期

完整重建 dist/preview：仅当前 open PR 会被包含，失败或关闭的旧预览在下一次
成功部署中删除。构建/部署失败时上一版线上站点仍存在，不能声称已清理。
构建中的 PR 更新/关闭会由后续排队运行收敛；评论标明实际部署 SHA。
并发组不取消正在进行的部署；即使 close 事件的待运行任务被后来的事件替换，
后续运行也会枚举所有 closed PR 并更新已有机器人评论。

覆盖 HTML 链接、图片、srcset、poster、跳转、CSS URL/import、Astro JS 资源，
以及当前项目 PagefindUI 的 baseUrl/bundlePath。不会通用解析任意手写 JavaScript
路由表达式；新增这类逻辑时必须扩展测试。绝对站内 URL 也会重写。

## 上线验收

1. PR 上的 `Validate preview infrastructure` 成功：测试、主站构建、实际 Docker
   PR 构建、合并目录链接检查全部通过。该检查没有发布权限。
2. 合并后 `Publish learning site` 的 build/deploy/comment 全成功。
3. 实际访问 `/preview/manifest.json`、每个 ok PR 的首页/文章/资源与搜索；
   将评论 SHA 与 manifest、PR head 比较，不能把本地构建当作线上验证。
4. PR 关闭后的成功部署中，manifest 不再包含该 PR，原 URL 返回 404，机器人
   评论标记删除。首次上线若没有关闭事件，只能记录这一步尚未实测。
5. 若评论失败，检查 Actions 的 PR 写权限策略；手动重新运行工作流会幂等补齐。

恢复：回退本次部署变更后从 main 手动运行 Publish learning site；它会重新
发布只有主站的完整 Pages artifact。不要通过关闭/重开内容 PR 测试清理。
