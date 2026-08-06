# “这片大地”字体包

一个以《明日方舟》2026 年夏日活动「直到大地变成一颗酸橙」为主题的非官方二创文字生成器，帮助大家快速制作活动风格的字标与图片。

在线使用：<https://angelina-arknights.pages.dev>

## 功能

- 自定义中英文文字、配色、间距、位置、大小、旋转角度和标题阴影
- 使用 Angelina 官方角色贴纸、动态贴纸与 UI 装饰，或一次添加多张本地图片
- 文字、图片、贴纸和多个 GIF 可同时存在；支持图层选择、显隐、锁定、复制、删除与拖动排序
- 支持透明、浅色和深色画布
- 导出高清 PNG 图片
- 导出循环 GIF，并提供 640 / 800 / 1024 px 三档体积控制
- 桌面端采用全屏三栏画布（图层 / 预览 / 属性），并提供紧凑的手机纵向布局
- 所有文字排版、图片合成和导出均在浏览器内完成

## 本地运行

项目是纯静态前端，不需要安装依赖或执行构建命令。在项目目录启动任意静态文件服务器即可：

```bash
python3 -m http.server 8976
```

然后访问 <http://localhost:8976>。

不要直接通过 `file://` 打开 `index.html`，否则浏览器可能阻止字形清单和字体资源加载。

## Windows 字体

仓库同时提供由风格字形 PNG 图集自动描摹生成的实验性 TrueType 字体：

- 字体文件：[下载 TTF](./assets/fonts/ZhePianDaDiFanmade-Regular.ttf)
- Windows 字体名：`Zhe Pian Da Di Fanmade`
- 覆盖范围：约 6,800 个中文、拉丁字母、数字和常用符号

在 Windows 10/11 中右键字体文件并选择“安装”或“为所有用户安装”即可。该字体是自动矢量化结果，细节、字距和网页生成器的渲染效果可能存在差异。

如需从当前字形图集重新生成字体：

```bash
python -m pip install -r tools/requirements-font-build.txt
python tools/build_windows_font.py
```

可通过 `SOURCE_DATE_EPOCH` 固定字体时间戳；未设置时使用项目预设时间戳，以确保相同输入生成相同二进制文件。

## 部署

项目可直接部署到 Cloudflare Pages 等静态托管平台。由于字形图集包含约 7,000 个文件，Cloudflare Pages 建议使用 Wrangler 命令行部署。详见 [DEPLOY.md](./DEPLOY.md)。

## 开源许可

项目原创 HTML、CSS 和 JavaScript 源码采用 [MIT License](./LICENSE)。字体、第三方库、活动美术背景、官方 Angelina 素材和风格字形 PNG 不属于项目 MIT 授权范围，具体说明见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

自动生成的 `ZhePianDaDiFanmade-Regular.ttf` 继承风格字形图集的权利限制，不属于项目 MIT License 授权范围。使用或再分发前请自行确认使用场景及相关权利要求。

本项目为非官方同人二创，与鹰角网络、Hypergryph、哔哩哔哩及《明日方舟》官方无隶属或背书关系。相关名称、商标与美术素材的权利归各自权利人所有。
