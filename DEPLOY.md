# “这片大地”字体包部署说明

本目录是纯静态网站，`index.html` 必须位于站点根目录。不需要 Node.js、数据库、后端接口或构建命令。

## Cloudflare Pages

这个网站包含约 7,000 个小型字形文件，超过 Cloudflare Pages 网页端拖放上传的 1,000 文件限制。请解压 ZIP 后使用 Wrangler 上传目录：

```bash
npx wrangler login
npx wrangler pages project create
npx wrangler pages deploy . --project-name=你的项目名
```

部署完成后，在 Cloudflare 控制台进入 `Workers & Pages → 你的项目 → Custom domains` 绑定域名。

## 流量统计

这是纯静态 Pages 项目，没有 Pages Functions，因此 `Functions Metrics` 不会显示普通页面访问量。本站已在 `index.html` 中手动嵌入 Cloudflare Web Analytics beacon；发布后到控制台的 `Web Analytics` 页面查看访客和页面浏览数据即可，不依赖 Pages 项目页的一键启用开关。

如果一键启用提示错误，先确认当前成员拥有 `Account Settings Write` 权限，并在账号级 `Web Analytics` 页面检查是否已有同域名的残留配置。也可以从该页面手动添加 Pages 域名，再把生成的 beacon snippet 放入 `index.html`。

官方说明：<https://developers.cloudflare.com/pages/how-to/web-analytics/>

官方说明：

- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://developers.cloudflare.com/pages/platform/limits/

## 其他静态服务器

把本目录全部内容原样上传到站点根目录，并保持 `assets/` 内的目录结构。服务器需要能正确返回 `.html`、`.css`、`.js`、`.json`、`.png`、`.webp`、`.gif` 和 `.ttf` 文件。

不要直接双击 `index.html` 使用 `file://` 打开；字体和字形清单需要通过 HTTP 或 HTTPS 提供。

## 隐私说明

用户选择的图片只由浏览器读取并存入当前浏览器的 IndexedDB，不会发送到服务器。文字排版、图片叠加、透明 PNG 和 GIF 合成导出也全部在浏览器本地完成。

本站使用 Cloudflare Web Analytics 统计匿名访问量和页面性能，不会上传用户导入的图片或制作内容。
