# 发布规则

- 用户要求修改本仓库时，默认在实现并验证通过后发布，除非用户明确说“不发布”。
- “发布”包括：提交相关改动、推送到 GitHub 的 `origin/main`，并部署到 Cloudflare Pages 项目 `angelina-arknights` 的 `main` 生产分支。
- 发布后检查 GitHub 远端提交和生产站关键资源，确认更新实际生效。
- Cloudflare Pages 部署包不包含 `AGENTS.md`、`.upload/`、`Update_patch_v01/` 或其他仅供协作、输入及临时使用的文件。
