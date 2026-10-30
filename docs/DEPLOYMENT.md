# Vercel 公网部署

## 从 GitHub 导入（无需编辑 Codex 云环境）

1. 登录 <https://vercel.com/new>，在 Import Git Repository 中选择 `yunjingwu23-design/shangan-youqi`。若列表中没有该仓库，使用页面中的 GitHub 授权入口授予此仓库访问权限。
2. 选择目标团队，项目名使用 `shangan-youqi`，Root Directory 保持仓库根目录。`vercel.json` 已配置 Next.js、冻结依赖安装和生产构建，Node.js 固定为已验证的 24.x。
3. 在 Vercel 项目的 Environment Variables 中填写正式 Supabase 配置，详见 CONFIGURATION.md。未填写时可以构建并查看登录页，但无法进行真实邮箱登录；不能上传本机回环地址或开发密钥。
4. 点击 Deploy，等状态变成 Ready，使用 Vercel 实际分配的公网域名。若已有关联到该 GitHub 仓库的 Vercel 项目，推送 main 通常会自动触发部署，可在该项目的 Deployments 中检查结果。
5. 将 `APP_URL` 设置为最终访问的 HTTPS origin，更新后重新部署。正式邮件登录还需在 Supabase 应用迁移、配置 SMTP 和六位验证码模板。

这条路径由 Vercel 的官方 GitHub 集成部署，不需要将 Vercel Token 写入 GitHub 仓库，也不需要编辑当前 Codex 云环境。

## 部署验证

取得实际 URL 后，检查登录页、匿名私有 API 401、真实邮箱收码、资料和投递保存、退出及跨账号隔离。只有实际出现 Ready 并完成对应检查后，才能宣称部署和登录就绪。生产密钥只能放在 Vercel 安全环境设置中，绝不能使用 `NEXT_PUBLIC_` 前缀保存管理员密钥。

`.vercelignore` 已排除本机环境文件、开发 JWT、Docker 配置和测试产物。Git 同样忽略 `.env.local`、`.local` 和生成目录。

## 当前云环境的 CLI 路径

已安装 Vercel CLI 65.8.0：`/workspace/deployment-tools/node_modules/.bin/vercel`。当前云环境网络拒绝访问 Vercel API，配置工具只能保存草稿，不能替用户将草稿应用到运行实例。因此在该限制解除前，通过以上 GitHub 导入路径部署；不要反复要求用户编辑其无法操作的云环境。
