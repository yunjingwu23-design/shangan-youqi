# P0 运营后台：配置与验收

本次交付复用现有邮箱 OTP、内部 `user_id` 和岗位广场，增加真实角色、私有 JD 原件、版本审核、发布与审计。数据库结构、权限矩阵和页面清单见 [P0_ADMIN_PLAN.md](P0_ADMIN_PLAN.md)。AI 解析、Excel/CSV 批量导入继续列入后续阶段；手动录入与 TXT/DOCX/文字型 PDF 的发布闭环已实现。

## 在现有正式项目启用

当前执行环境只有本地开发凭证，尚未修改你的托管数据库，也未核验 Vercel Ready。不要重配已有邮箱、密钥或 Codex 云环境。以下步骤由已有 Supabase 项目所有者在 SQL Editor 完成，不向聊天发送任何密钥。

1. 打开 [此项目 SQL Editor](https://supabase.com/dashboard/project/lxecahdyvrdfezgtmbfp/sql/new)。确认已有 `app_users` 与 `job_catalog`。如果尚未安装岗位目录，先运行 [202610310003_public_catalog.sql](../supabase/migrations/202610310003_public_catalog.sql)。不要重跑账号迁移，不要 reset 数据库。
2. 打开新增的 [202610310005_admin_workflow.sql](../supabase/migrations/202610310005_admin_workflow.sql)，复制**整份 SQL**到一个新查询中，以项目所有者身份作为一个事务执行。它保留原用户 ID、投递记录与已有岗位；首次创建后台表、私有桶和受控函数。已经成功执行后不要重复运行该迁移。后续升级使用新迁移。
3. 在同一项目的新查询中执行下面的一次性初始化。此邮箱由项目所有者指定，且必须已在本网站完成真实邮箱验证：

```sql
select public.bootstrap_site_admin('876901712@qq.com');
```

成功返回内部 `user_id` 和 `role: super_admin`。若提示 `ADMIN_VERIFIED_ACCOUNT_REQUIRED`，先用该邮箱在网站完成验证码登录，再执行；若提示 `ADMIN_BOOTSTRAPPED`，表示已经初始化，后续通过既有超级管理员邀请，不能反复执行以恢复或提升任意账号。

4. 在 Vercel 确认包含本次提交的生产部署为 Ready。打开 [正式后台](https://shangan-youqi.vercel.app/admin)，用 `876901712@qq.com` 邮箱 OTP 登录。首次初始化后可重新打开后台；涉及邀请或角色管理时，须在最近一次邮箱验证的 15 分钟内操作。
5. 按下方验收步骤发布自己拥有授权的真实岗位，并在 [岗位广场](https://shangan-youqi.vercel.app/jobs) 检查。不要把本地验收生成的公司/JD 当作正式招聘信息。

可选：在可信服务端通过 `npm run admin:bootstrap -- --email 876901712@qq.com` 调用相同的一次性初始化函数。脚本只使用已有服务端环境变量，不提供公开初始化 HTTP 接口。

只读检查（初始化后应全部为 true）：

```sql
select
  to_regclass('public.admin_memberships') is not null as admin_table_ok,
  to_regclass('public.job_sources') is not null as sources_ok,
  to_regprocedure('public.admin_transition_job(uuid,integer,text,text,boolean)') is not null as workflow_ok,
  exists(select 1 from storage.buckets where id='jd-originals' and not public) as private_bucket_ok,
  exists(
    select 1 from public.admin_memberships m
    join public.app_users a on a.user_id=m.user_id
    join auth.users u on u.id=a.auth_user_id
    where lower(u.email)='876901712@qq.com' and m.role='super_admin' and m.active
  ) as owner_admin_ok;
```

## 环境变量与部署

本次**没有新增环境变量、没有 OpenAI 调用费用**。沿用 [CONFIGURATION.md](CONFIGURATION.md) 中的现有配置：

| 配置                                                        | 用途                                                                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同项目认证及用户会话数据库访问，继续由 RLS 控制。                                                                |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | 仅可信服务端操作 JD 私有原件、清理或一次性初始化；浏览器不得获得。岗位和权限业务写入始终使用当前用户会话的 RPC。 |
| `APP_URL`                                                   | 正式为 `https://shangan-youqi.vercel.app`；同源检查与邀请链接以此为准，不带 `/admin` 或其他路径。                |
| `AUTH_RATE_LIMIT_SECRET`、`TRUST_PROXY`                     | 沿用现有限流配置；JD 上传每人每小时 20 次，邀请创建每位超级管理员每小时 20 次。                                  |

JD 单文件限制 3 MiB，支持 UTF-8 TXT、DOCX、20 页以内文字型 PDF，提取原文上限 50,000 字。PDF 解析 WASM 随构建追踪打包；无需外部解析服务。扫描件不冒充文字提取成功。原件保存在非公开 `jd-originals` 桶，通过本站鉴权下载，不生成公开地址。来源校订不改写上传原件。

长时间未保存到岗位的上传文件，由可信服务端每日运行 `npm run admin:cleanup-jd` 清理。只领取超过 24 小时且没有岗位/来源引用的文件，先设为不可关联再删文件与记录；失败可以重试。此版本提供清理命令，**没有在生产代为配置定时任务**。已关联的来源原件继续作为运营审核记录保留。

## API 与事务

所有 `/api/admin/*` 使用服务端 `getUser()` 验证登录和启用角色；写请求要求本站 Origin、大小上限和字段白名单。数据库再次验证实际角色，浏览器不能直接写岗位、角色、邀请、来源或日志表。

| API                                    | 权限与行为                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/admin/overview`              | 三种管理员读实际状态数量；有效公开数扣除已到期记录。                                                                     |
| `POST /api/admin/overview`             | reviewer/super_admin 将已到期岗位归档；每批最多 500 条。                                                                 |
| `GET /api/admin/jobs`                  | 管理员分页、关键词、状态、类型筛选；`?id=` 返回岗位、当前来源和近期历史。                                                |
| `POST /api/admin/jobs`                 | editor 编辑本人草稿/驳回稿，super_admin 编辑全部；创建 201、修改 200。只保存草稿，不接受客户端 state、owner 或审核标记。 |
| `POST /api/admin/jobs/[id]/transition` | 按角色和当前状态提交、撤回、批准、驳回、发布、下架、到期处理或开始修订。                                                 |
| `POST /api/admin/jd-import?name=...`   | editor/super_admin 实际上传、提取并私有存储 TXT/DOCX/PDF。                                                               |
| `GET /api/admin/jd-files/[id]`         | 管理员读取已关联原件，未关联原件限上传者/超级管理员；校验大小及 SHA-256。                                                |
| `GET/POST /api/admin/team`             | super_admin 读团队和邀请记录；创建/撤销邀请，变更角色或启用状态。写入要求 15 分钟内 OTP。                                |
| `POST /api/admin/invitations/accept`   | 已认证目标邮箱领取；验证 48 小时有效期、单次使用、原邀请人仍为启用的超级管理员。                                         |
| `GET /api/admin/logs`                  | 岗位日志三角色可读；系统权限日志仅 super_admin 可读；50 条分页。                                                         |

原有 `/api/jobs/[id]/save` 继续将公开岗位加入个人投递/收藏，按内部 `user_id` 去重；加入工作台不代表已向招聘方投递。

每次保存增加内容 revision 和 version，保留来源快照；每次状态操作增加 version。写入都提交 `expectedVersion`，冲突返回 409。审批绑定明确的内容 revision；编辑已发布岗位须先撤回修订，并重新通过审核。一般审核员不能审核本人创建的岗位；个人开发者可由 super_admin 明确填写至少 10 字核验说明并勾选来源检查，自审会留 `self_review` 标记。数据库事务同时保存状态与审核/操作日志。

## 手工端到端验收

1. 以超级管理员在 `/admin/system` 邀请 editor 和 reviewer。分别使用指定邮箱登录并领取链接。错误邮箱、过期、重复或已撤销邀请应拒绝；普通注册不产生后台角色。
2. editor 在 `/admin/jobs/new` 上传合法来源的 JD 或粘贴原文，人工填写公司、岗位、类型、城市、职责、要求、HTTPS 来源和投递方式。转正实习填写 JD 中招聘方的留用原文。邮箱、投递说明和 JD 保存在同一条记录。
3. 保存草稿并刷新；在另一设备的同一账号读取相同岗位。游客岗位列表和详情均看不到草稿；普通用户访问后台和原件失败。
4. editor 提交审核后表单锁定，不能直接批准或发布。reviewer 下载原件、核对来源及投递信息，填写说明并确认核验，先批准再发布。
5. 游客打开前台岗位广场和详情，能看到该条正式岗位、正确邮箱、标题要求和投递说明，不能看到后台来源原文或草稿。登录用户加入工作台后刷新仍有投递记录。
6. 旧标签页保存返回 409；内容修订使原审批失效。下架后前台详情不再可读；到截止时间由 RLS 立即隐藏，即使尚未点击归档也不接受新投递/收藏。已有个人投递记录仍保留。
7. 检查 `/admin/logs` 和岗位审核历史。停用管理员后，其已有会话也不能继续操作。最后一位启用的超级管理员不能降权、停用或注销；先安全授权另一位超级管理员，再处理账号。
8. 在 390px 手机检查：四个后台分区与具体页面导航保留，JD 表格在自身区域横向滚动，编辑表单为单栏。退出后台可返回原四模块前台。

## 自动化验证

只在本机真实 Supabase 上运行；测试会创建和删除一次性账号、文件与岗位，强制拒绝托管数据库。P0 测试用可信本地 SQL 清理自己的超级管理员夹具；此能力不是网站公开接口，不用于生产账号。

```bash
npm run db:start
INTERVIEWS_ENABLED=true npm run build
INTERVIEWS_ENABLED=true npm start
# 另一个终端；先结束后台/岗位数据测试，再跑浏览器，避免公开岗位夹具影响样品断言：
npm run test:admin
npm run test:site
npm run test:integration
INTERVIEWS_ENABLED=true npm run test:e2e
```

实际通过结果见 [TESTING.md](TESTING.md)。本机验收不能代替正式项目的 SQL、QQ 邮件送达和 Vercel 公网验收。
