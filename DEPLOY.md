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

官方说明：

- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://developers.cloudflare.com/pages/platform/limits/

## 其他静态服务器

把本目录全部内容原样上传到站点根目录，并保持 `assets/` 内的目录结构。服务器需要能正确返回 `.html`、`.css`、`.js`、`.json`、`.png` 和 `.ttf` 文件。

不要直接双击 `index.html` 使用 `file://` 打开；字体和字形清单需要通过 HTTP 或 HTTPS 提供。

## 隐私说明

用户选择的图片只由浏览器读取并存入当前浏览器的 IndexedDB，不会发送到服务器。文字排版、图片叠加和透明 PNG 导出也全部在浏览器本地完成。
