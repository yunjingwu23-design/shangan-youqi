# 邮箱邀请管理员：验证后自动进入后台

管理员在 `/admin/system` 填写目标邮箱、选择角色，点击「创建并发送邀请」。对方收到一封包含邀请链接和邮箱验证码的邮件，打开链接、输入同一封邮件的验证码后自动加入并进入 `/admin`。页面没有单独的「领取邀请」按钮。已经登录正确且已验证邮箱的用户，打开链接后自动完成加入。

邮件发出后记录为「待验证邮箱」；正确验证、通过数据库检查后才显示「已加入后台」。发送邮件本身不为未验证的邮箱建立有效后台会话。邀请仍绑定指定邮箱、角色、48 小时有效期、单次使用及邀请人仍为启用的超级管理员。原内部 `user_id`、个人资料和求职记录保持不变。

## QQ 邮件通道配置

沿用现有 **Supabase Auth 中已经配置好的 QQ SMTP**。本次没有新增环境变量、SMTP 密钥或数据库迁移，也不需要把 QQ 授权码复制到 Vercel/Codex 或发送到聊天。

正式项目需要更新邮件内容，使现有发信通道的邮件包含邀请链接：

1. 打开 [Supabase 邮件模板](https://supabase.com/dashboard/project/lxecahdyvrdfezgtmbfp/auth/templates)。
2. 将 **Confirm signup** 和 **Magic Link** 两种模板的正文，都替换为 [otp.html 完整代码](https://github.com/yunjingwu23-design/shangan-youqi/blob/main/supabase/templates/otp.html)。新用户和已有账号分别可能使用这两类模板，需同时更新。标题可使用「上岸有期｜邮箱验证与团队邀请」。
3. 在 [URL Configuration](https://supabase.com/dashboard/project/lxecahdyvrdfezgtmbfp/auth/url-configuration) 确认 Site URL 为 `https://shangan-youqi.vercel.app`，与 Vercel 的 `APP_URL` 一致，并在 Redirect URLs 中允许 `https://shangan-youqi.vercel.app/admin/accept**`。若已有其他回调配置，保留它们。
4. 等 Vercel 包含本次代码的部署为 Ready 后，在后台试发邀请。对方应能在同一邮件中看到官方 Logo、邀请链接和完整验证码。Supabase/QQ 的发送限制继续生效，必要时检查垃圾邮件。

模板继续保留完整 `{{ .Token }}`，不截断验证码。普通登录请求不附邀请回跳地址，仍显示原邮箱验证码内容；邀请请求将本站 `/admin/accept` 地址放入 `{{ .RedirectTo }}`，模板为其显示邀请入口。若只收到数字验证码而没有邀请链接，优先检查两类模板是否都已更新，以及 Site URL/Redirect URLs 是否正确。

邀请码有效 48 小时，邮件中的验证码有效 10 分钟。10 分钟内打开邮件链接可直接输入已收到的码；之后仍可在邀请页获取新码，不必重新建立邀请。页面固定被邀请邮箱，登录了其他账号时引导切换；不会替错误账号自动加入。

## 服务端行为

- `POST /api/admin/team` 的 `action=invite` 增加 `delivery: "email" | "link"`；网页默认使用 email，旧 API 调用不传此字段时沿用只生成链接。创建和权限检查仍由原用户会话的数据库事务执行，要求超级管理员最近 15 分钟内完成 OTP 验证。
- 邮件使用独立、无持久会话的公开 Supabase Auth 客户端发送，复用现有 SMTP。不会在发起邀请的浏览器写入被邀请人的 Cookie，也不修改目标账号资料或选择角色。
- 复用邮箱每分钟 1 次、每小时 5 次的发送限制，邀请邮件另按 IP 每小时 30 次，创建邀请仍每位超级管理员每小时 20 次。发信请求最多等待 15 秒。
- 返回 `delivery.status=sent` 表示 Auth 发信请求已被服务接受，不保证最终收件箱送达；真实送达以 QQ/收件方为准。失败时明确返回 failed，已创建的邀请与备用链接保留，网页不显示发送成功。
- `/admin/accept` 仅按高熵令牌的 SHA-256 匹配单条邀请，服务端校验状态、有效期和创建人角色后提供目标邮箱。浏览器得不到服务端 key、令牌哈希或完整邀请表。
- 验证继续使用原 `/api/auth/verify`、真实 GoTrue OTP 和 HttpOnly Cookie。验证后页面自动调用原 `/api/admin/invitations/accept`，数据库再检查真实已验证邮箱与角色；普通用户、错误邮箱、过期、撤销或重放均不能获得权限。
- 已使用链接不会重新授予角色；账号被停用后再打开旧链接也不能恢复权限。保留「仅生成邀请链接」作为手工分享方式，其目标邮箱验证后同样自动进入后台。

## 验收

```bash
npm run db:start
npm run build
npm start
# 另一终端，使用本机真实 Auth / SMTP / Mailpit，先后运行：
npm run test:admin-email
npm run test:admin
npx playwright test tests/admin.e2e.ts tests/auth.e2e.ts
```

本机测试强制拒绝托管数据库，只向隔离的 Mailpit 发合成邮箱邮件。覆盖新邮箱及已有账号收信、真实链接/八位验证码、验证后分配正确角色、原 ID 与发起人会话保持、错误邮箱/限流/非同源发送失败，以及浏览器自动加入、手机布局和停用后旧链接不能恢复权限。实际结果见 [TESTING.md](TESTING.md)。

当前执行环境没有托管 Supabase 管理权限，未替你更新正式邮件模板，也未实际向 QQ/163 收件箱发送测试邮件。不要将本机 SMTP 验收等同于正式 QQ 邮件送达或 Vercel Ready。
