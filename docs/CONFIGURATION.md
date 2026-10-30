# 环境变量与正式 Supabase 配置

## 环境变量

参考根目录 `.env.example`。本地开发可使用 `.env.local`；部署时使用平台的安全环境变量设置。不要在聊天、Git 或前端代码中保存密钥。

| 变量                            | 用途                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | 已有 Supabase 项目的 HTTPS API URL                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 该项目的 anon 或 publishable key；公开访问依靠 RLS 保护                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | 同项目 service_role 或 secret key；只在服务器用于限流 RPC 和本人注销                    |
| `APP_URL`                       | 唯一、精确的站点 origin，例如 `https://example.com`，不带路径；必须与浏览器访问域名一致 |
| `AUTH_RATE_LIMIT_SECRET`        | 至少 32 字符的服务端随机密钥，用 `openssl rand -hex 32` 生成；所有实例共享并保持稳定    |
| `TRUST_PROXY`                   | 默认 `false`；只有反向代理会覆盖而非透传用户伪造的 `X-Forwarded-For` 时设为 `true`      |

`NEXT_PUBLIC_` 名称下绝不能放管理员密钥。客户端本次只访问本站 API，不直接读写 Supabase；即使使用公开 anon key 绕过 API，数据库仍执行 RLS。

无可信代理时 IP 限流使用共享桶（最多 30 次发送/小时），避免信任伪造 IP。正式多用户部署应配置可信代理与真实客户端 IP。不要直接对任意来源的转发头开启信任。

## 迁移已有项目

1. 先核对项目是目标开发/生产项目，备份已有数据库。迁移使用 `app_users`、`profiles`、`workspace_entries`、`external_identities` 和 `private` schema；如已有同名表，先评估兼容性，不要覆盖运行。
2. 在 Supabase SQL Editor 中将 `supabase/migrations/202610300001_auth_and_workspace.sql` 作为一个事务执行，或用 Supabase CLI 链接目标项目并 `supabase db push`。这一步需要项目所有者操作权限；聊天中无需提供数据库密码。
3. 确认四张 public 表已启用 RLS；`private` 不在 API exposed schemas 中。表权限及策略已在迁移中显式设置。
4. 迁移会为已有 `auth.users` 建立内部 ID 和空资料，之后的新用户由数据库触发器自动建档。该迁移只执行一次；不要在正式项目运行数据库 reset。

首次建档发生在 Supabase 创建 Auth 用户时；尚未验证邮箱的用户也可能已有空资料，但拿不到已认证会话，无法读取业务数据。

## 邮箱 OTP 与 SMTP（正式发送的必要配置）

在 Supabase Authentication 设置中：

1. 启用 Email provider、允许新用户注册、保持邮箱确认开启；不启用匿名登录，不配置微信或其他 OAuth provider，不启用手动身份 linking。
2. Site URL 设置为正式 `APP_URL`。本次只使用邮箱数字验证码，没有站外回跳参数，无需通配重定向 URL。
3. 配置你拥有的 SMTP 邮件服务、发件域名和发件邮箱，并完成服务商要求的域名验证。Supabase 默认邮件服务常限制收件人或发送额度，不能作为任意公众邮箱送达的验收依据。
4. 把 **Confirm signup** 和 **Magic Link** 两类邮件正文都改为 `supabase/templates/otp.html` 的内容，确保包含完整的 `{{ .Token }}`。不要只放 `ConfirmationURL` 或截取验证码。
5. 应用前端与服务端统一接受 6–10 位数字验证码，完整提交给 Supabase 校验；现有项目发 8 位码无需修改托管项目设置。本地默认长度为 8、有效期 600 秒、同一邮箱发送间隔至少 60 秒；托管项目需独立检查实际有效期并设置项目级邮件发送和 token verification 速率上限。
6. 给两个真实测试邮箱分别发码，验证首登、再次登录、垃圾箱送达和限流。SMTP 发信失败时页面会明确提示，不能只看到 UI 就宣布邮件上线。

应用限流：每邮箱 1 次/60 秒、5 次/小时；每可信 IP（或保守共享桶）30 次/小时；验证每邮箱 10 次/10 分钟、每 IP 60 次/10 分钟。限流存储在 PostgreSQL，跨实例原子生效，故障时拒绝继续发送。不要仅依赖应用限流：Supabase Auth 是公开 API，托管项目自身的发送间隔、IP/token verification 上限也必须配置。高流量公开上线时可进一步接入 Supabase CAPTCHA（本次未实现）。

限流标识以 HMAC 存储，不保留原始邮箱/IP。建议以项目调度任务每天清理 `private.auth_rate_limits` 中 `expires_at < now() - interval '48 hours'` 的行；不要授予浏览器访问该表的权限。

## 构建和部署

```bash
npm ci
npm run typecheck
npm test
npm run build
npm start
```

生产 origin 必须为 HTTPS（localhost 验证例外）。Cookie 使用 HttpOnly、SameSite=Lax，HTTPS 时开启 Secure；浏览器端不保存 access token 到 localStorage。私有页面/API 不得被 CDN/反向代理缓存。会话刷新由 `proxy.ts` 执行，权限始终在服务端和数据库再次检查。

`infra/compose.yml` 的固定开发密码、对称 JWT 与邮件收件箱仅用于本机测试，严禁暴露或用作生产部署。已有 `.env.local` 不会被脚本覆盖；从本地切换到托管项目时，需要成套替换 URL、anon key 和 server key，重启 Next.js，避免混用。

## 云环境现状

本地验证使用忽略提交的开发凭证，没有直接连接或修改托管项目。用户已在 Vercel/Supabase 操作正式配置；当前执行环境未注入这些正式凭证，不代表 Vercel 未配置。新增面试内测还需要独立迁移、OpenAI Key 和 Worker，详见 `INTERVIEW_INTERNAL.md`。不需要再次编辑无法操作的 Codex 云环境。

## 验证码发送前的数据库限流故障诊断

页面提示「验证服务暂不可用，请稍后重试。」对应 `consume_auth_rate_limit` RPC 失败或响应格式异常。该路径在发邮件之前执行，不能凭此提示认定 SMTP 故障。限流失败仍拒绝发信，不能通过关闭限流或给匿名用户授予该函数权限来消除错误。

服务端会记录 `AUTH_RATE_LIMIT_RPC_FAILED`，仅带 HTTP 状态、经过白名单检查的 PostgreSQL/PostgREST 错误码、固定的权限资源标签，以及服务端凭证的类型/一致性检查结果。不记录上游错误正文、密钥、邮箱或限流标识。旧 JWT 的角色与项目标识只用于诊断，不构成认证或授权依据。

- `credentialKind` 为 `publishable` / `legacy_anon`，或 `credentialMatchesPublicKey` 为 `true`：运行中的服务端误用了公开凭证。核对生产环境变量及本次部署是否包含更新，不能通过给匿名角色开放管理函数修复。
- `credentialProjectMatches` 为 `false`：旧 service_role key 与目标 Supabase URL 不属于同一项目。新格式 key 不含可本地比较的项目标识，此值为 `null`，不代表已验证项目一致。
- `credentialHasWhitespace` 为 `true`：检查粘贴时是否混入了空格或换行。
- `permissionTarget` 为 `public_schema` / `rate_limit_function` / `rate_limit_table`：分别定位到 schema、函数或内部表权限；仅修复已确认的服务端角色权限。

- HTTP 401：检查 `SUPABASE_SERVICE_ROLE_KEY` 是否为同一个 Supabase 项目的完整服务端密钥，不能误填公开 key。
- `PGRST202`：检查函数名称/参数签名与 API schema cache；确认函数存在后可在 SQL Editor 执行 `NOTIFY pgrst, 'reload schema';` 刷新缓存。
- `42501`：检查 service_role 的函数执行权限、public schema 使用权限及实际请求的角色；不要扩大到 anon/authenticated。
- `42P01` / `42883`：分别检查所需表或函数是否已在目标项目完成迁移。
- HTTP 200、`INVALID_RPC_RESPONSE`：函数返回值必须包含布尔字段 `allowed`，不能把其他格式当成放行。

可在目标项目 SQL Editor 先执行以下只读检查，再根据错误码修复对应项：

```sql
select
  to_regclass('private.auth_rate_limits') is not null as rate_limit_table_exists,
  to_regprocedure('public.consume_auth_rate_limit(text,integer,integer)') is not null as rate_limit_function_exists,
  coalesce(has_function_privilege(
    'service_role',
    to_regprocedure('public.consume_auth_rate_limit(text,integer,integer)'),
    'EXECUTE'
  ), false) as service_role_can_execute;
```
