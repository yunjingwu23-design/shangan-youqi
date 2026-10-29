# Vercel 预览部署指南

## 当前检查结果

- 云端内部 3000 端口服务正常：首页、岗位广场、工作台返回 HTTP 200。
- 当前云环境未提供端口转发、网页预览工具或外部预览地址。`0.0.0.0:3000` 是监听地址，不是可以从个人电脑直接访问的网址。
- 项目使用 Next.js App Router，可由 Vercel 自动构建；不需要长期运行云环境里的 3000 端口进程。
- 类型检查先运行 `next typegen`，因此全新解压、没有 `.next` 缓存时也能运行。
- 这是本地数据演示：无需 Supabase、微信、OpenAI 或其他密钥。登录仍为未开通状态。
- 本次初版源码使用 GitHub 的 `preview/initial` 分支；请选中该分支。`main` 可能仍只有最初 README，不能用它部署此样品。

## 推荐：CLI 创建临时 Preview，不需要先推送 Git

在你自己的电脑执行，使用自己的 Vercel 账号授权。不要把登录令牌发到聊天中。

1. 下载本次提供的 `shangan-youqi-vercel-preview.zip` 并解压。
2. 安装 Node.js 24 LTS，打开终端，进入包含 `package.json` 与 `vercel.json` 的 `shangan-youqi` 文件夹。
3. 运行：

```bash
npm ci
npm run typecheck
npx vercel@latest login
npx vercel@latest deploy
```

`deploy` 不加 `--prod`，默认创建 **Preview**。首次运行按提示选择：

- Scope：你的个人或团队账号。
- 如果已有项目，关联对应项目；否则创建 `shangan-youqi` 项目。
- 代码目录：当前目录 `./`。
- Framework：Next.js（应自动识别）。
- Build Command：`npm run build`。
- Install Command：`npm ci --no-audit --no-fund`。
- Output Directory：保留 Next.js 默认值，不填写 `out` 或 `.next`。
- Node.js：24.x（`package.json` 已声明）。
- Environment Variables：当前全部留空，不需要导入 `.env.example`。

构建完成后 CLI 会输出实际的 **Preview HTTPS URL**，形如 `https://<本次部署生成的名称>.vercel.app`。这是格式说明，不是已经创建的网址；以 Vercel 输出为准。复制该 URL 即可在浏览器打开。

如果构建失败：打开 CLI 输出的 Inspect 链接查看 Build Logs。不要关闭类型检查。先确认当前文件夹包含 `src/app`、`public/logo.png`、`package-lock.json`，且没有把外层解压目录当作项目根目录。

## Preview 的访问权限

Preview 是临时部署，但也会有真实 HTTPS 网址。Vercel 的 Deployment Protection 可能默认要求登录：

- 仅自己预览：保留保护，用登录了同一 Vercel 账号的浏览器打开。
- 希望手机、无痕窗口或其他人无需 Vercel 登录即可打开：在项目的 Settings → Deployment Protection 中检查 Preview 的保护设置，按账号/套餐可用功能开放该预览，或使用 Vercel 提供的分享访问链接。
- 关闭保护会让拿到 URL 的人访问样品；当前无服务器存储的真实个人数据或真实服务。

`vercel.json` 为全站添加 `X-Robots-Tag: noindex, nofollow, noarchive`，用于阻止搜索引擎收录本轮样品。它不是访问密码，不能代替 Deployment Protection。以后正式上线时再有意识地调整。

## 可选：GitHub 持续预览

如果希望每次修改自动生成 Preview：

1. 使用 `yunjingwu23-design/shangan-youqi` 的 `preview/initial` 分支。不要选择仅有 README 的旧分支，不要提交 `.env.local`、令牌或 `.vercel`。
2. 在 Vercel 的 Add New → Project 中导入该仓库。
3. Framework 选择 Next.js；仓库根目录包含 `package.json` 时 Root Directory 为 `./`。只有源码实际存放在子目录时才选择该子目录。
4. 保持上述构建设置，环境变量全部留空。
5. Vercel 的首次项目部署可能创建 Production 部署。若只想临时预览，优先采用上面的 CLI `deploy`；后续开发分支推送/PR 可生成 Preview。

初版源码由 `preview/initial` 分支提供。Vercel 项目、账号绑定与实际部署仍需通过你的 Vercel 账号完成，尚未生成网站 HTTPS 地址。

## 环境变量和后续能力

`.env.example` 仅列出以后接入服务时的变量名，本轮没有任何必需变量。不填写假值，也不要因为留空去申请微信或 AI 密钥。

| 未来变量                                                 | 暴露范围                               | 本轮是否需要 |
| -------------------------------------------------------- | -------------------------------------- | ------------ |
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY | 浏览器可见，必须配合 RLS               | 否           |
| SUPABASE_SERVICE_ROLE_KEY                                | 仅服务端，不能用 NEXT*PUBLIC* 前缀     | 否           |
| WECHAT_APP_ID / WECHAT_APP_SECRET / WECHAT_REDIRECT_URI  | 服务端 OAuth，正式域名与资质准备后配置 | 否           |
| OPENAI_API_KEY                                           | 仅服务端，AI 阶段再配置                | 否           |

添加环境变量时需在 Vercel 分别选择 Preview / Production 范围并重新部署；仅添加值并不会实现尚未编写的认证或业务逻辑。

## 部署后的验收

使用 Vercel 实际返回的 HTTPS URL 检查：

1. `/` 与 `/jobs` 正常打开，官方 Logo 显示，四类岗位可切换。
2. `/search?q=CICC` 模糊搜索有结果；精准模式不扩展公司英文别名。
3. `/jobs/tencent-finance` 展示完整 JD、演示邮箱与留用原文。
4. 加入工作台，新增和编辑行、自定义状态颜色，刷新后仍保留当前浏览器的数据。
5. `/login` 明确微信暂未开通；`/api/auth/wechat` 返回 503 是预期行为。
6. 手机和桌面导航可用，无页面整体横向溢出（工作台表格本身允许横向滚动）。
7. 使用无痕窗口检查访问保护是否符合你的预期。

不同浏览器、设备及每次不同 Preview 域名的 localStorage 相互独立，不会同步数据。Vercel 提供 HTTPS 托管，不会自动把本地演示变成云端数据库产品。

## 简历编辑器更新

`/resume` 已具备实际导入、编辑与 PDF 导出。Vercel 使用 Node.js 函数和随包 Chromium；不需 AI、Supabase 或字体服务密钥。函数最长 60 秒，限制文件 3MB。部署后请上传自己的脱敏 DOCX 测试预览、编辑与 PDF 下载。若报错，保留响应状态与错误提示即可，不要把原始简历放进公开日志。当前源码使用 `preview-initial` 无斜杠分支导入，避免 Vercel 把斜杠误判为子目录。详见 [简历工具部署说明](RESUME.md)。
