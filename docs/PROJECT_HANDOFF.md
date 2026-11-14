# 上岸有期 · 项目完整交接文档

> 整理日期：2026-11-14（晚）
> 用途：把整个「上岸有期」求职网站项目的现状、资产、配置、待办一次性交接给接手者（人或 AI）。
> 本文不含任何账号密码、生产密钥原文；敏感值一律以占位符/脱敏形式标注。

---

## 一、项目速览

| 项 | 内容 |
|---|---|
| 项目名 | 上岸有期（shangan-youqi） |
| 定位 | 面向求职者的中文求职网站：找岗位、投递管理、简历、面经、薪资、面试复盘、日程、反馈 |
| 会话标题 | 「上岸有期 · 求职网站」 |
| 本地路径 | `C:/Users/86158/WorkBuddy/2026-11-09-19-59-40/shangan-youqi` |
| 代码仓库 | https://github.com/yunjingwu23-design/shangan-youqi.git （public，默认分支 `main`） |
| 线上访问 | https://shangan-youqi.app.workbuddy.host/?sharecode=JIA64AIIY3 |

> 注意：本地工作分支是 `codex/payroll-city-autofill-20261105`，但正式代码以 `main` 为准；本地分支相对 `origin/main` 只领先已推送的提交，实际发布内容一致。

---

## 二、技术栈与运行环境

| 项 | 值 |
|---|---|
| 框架 | Next.js 16（App Router）+ React 19 + TypeScript |
| 后端/数据 | Supabase（Postgres + Auth + Storage + RLS） |
| Node | 22（本地 v22.22.2；云端 CI 亦用 22） |
| 包管理 | npm（`package-lock.json`，用 `npm ci`） |
| 数据库迁移 | 由用户在 Supabase SQL Editor 手动执行（无 CLI、无 access token、无 exec_sql RPC、无 DB 直连密码） |
| 发布通道 | WorkBuddy sites（`workbuddy_sites_deploy`）；`package.json` 的 `start` 脚本为 `next build && next start` |

---

## 三、线上部署与发布

- **分享链接**：`https://shangan-youqi.app.workbuddy.host/?sharecode=JIA64AIIY3`
- 分享码机制：`?sharecode=...` → 换取 `__wb_rsc` Cookie → 放行 HTML；静态资源依赖该 Cookie，Cookie 丢失会 403 白屏（微信/无痕浏览器 SameSite 易丢）。
- 重新发布会覆盖当前线上版本、**分享链接保持不变**（appId 由目录决定，自动复用）。
- 已知：该域名偶发冷启动 504（`port 3000 not ready after 30000ms`）。

---

## 四、数据库结构与数据规模（Supabase）

**项目 ref**：`lxecahdyvrdfezgtmbfp`（URL：`https://lxecahdyvrdfezgtmbfp.supabase.co`）

### 关键表与当前数据量（2026-11-14 实测）

| 表 | 用途 | 数据量 |
|---|---|---|
| `job_catalog` | 秋招岗位目录（type='autumn_recruitment'） | **437 条**（380+ 家公司、40+ 行业） |
| `interview_experiences` | 面经雷达（多平台采集 + 原创归纳） | **60 条** |
| `user_feedback` | 用户反馈（前台匿名/登录提交） | 0（表已建，待用户使用） |
| `schedule_events` | 个人日程与提醒 | 0（表已建，待用户使用） |
| `app_users` | 应用用户（独立于 auth.users 的业务 ID） | 6 账号 |
| `salary_reports` 等 | 薪资情报 / Offer 对比（匿名投稿、审核、聚合） | 见 `docs/SALARY_INTELLIGENCE.md` |
| `resume_*` | 简历原件、版本、模板 | 见 `docs/RESUME_FILES.md` |

### 关键约定
- 所有私人数据绑定 `app_users.user_id`，服务端按用户过滤 + RLS 隔离；普通业务读写不用 service_role key。
- 岗位大类（技术研发/产品/运营等）是运行时从职责关键词推导，非持久化字段。
- 找岗位页筛选维度：搜索框、城市、行业、届别、岗位类型。

---

## 五、数据库迁移清单与执行状态

### `supabase/migrations/`（14 个，按时间序）

| 迁移文件 | 内容 |
|---|---|
| 202610300001_auth_and_workspace.sql | 认证 + 工作空间 |
| 202610310001_interviews.sql | 面试 |
| 202610310002_interview_storage.sql | 面试存储 |
| 202610310003_public_catalog.sql | 岗位目录 |
| 202610310004_resume_originals.sql | 简历原件 |
| 202610310005_admin_workflow.sql | 后台工作流 |
| 202610310006_workspace_stages.sql | 投递阶段 |
| 202611010001_admin_otp_without_time_limit.sql | 后台 OTP |
| 202611010002_site_analytics.sql | 站点分析 |
| 202611020001_salary_intelligence.sql | 薪资情报 |
| 202611020002_salary_reference_privacy.sql | 薪资来源隐私 |
| 202611070001_interview_radar.sql | 面经雷达 |
| 202611110001_schedule_events.sql | 日程提醒 |
| 202611140001_user_feedback.sql | 用户反馈（**已执行**） |

### 根目录「执行-*.sql」（供手动在 SQL Editor 执行的合并脚本）

| 文件 | 状态 |
|---|---|
| 执行-录音转写迁移.sql | 已执行（历史） |
| 执行-日程提醒迁移.sql | 已执行（用户曾确认 success） |
| 执行-用户反馈迁移.sql | **已执行（2026-11-14）** |
| 执行-面经雷达迁移.sql | 已执行（历史） |

---

## 六、定时任务（自动化）

### 云端（GitHub Actions，不依赖本机开机）

| 任务 | 文件 | 时间 | 状态 |
|---|---|---|---|
| 面经雷达 · 每日采集 | `.github/workflows/radar-collect.yml` | 每天北京 08:30 / 20:30 | ✅ 已跑通（2026-11-14 全绿） |

- 采集逻辑：`scripts/radar-collect.mjs`（五平台：牛客/掘金/CSDN/V2EX/思否 → 相关性判定 → DeepSeek 归纳 → 写库，URL/指纹/标题三重去重）。
- 自动触发：`git credential fill` 取 token → POST `/actions/workflows/radar-collect.yml/dispatches`。
- 需要的 3 个 GitHub Secrets：`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`DEEPSEEK_API_KEY`（值必须是「裸值」，不带引号/空格/换行/前缀）。

### 本地（WorkBuddy automation，依赖本机开机）

| 名称 | ID | 时间 | 状态 |
|---|---|---|---|
| 面经雷达 · 每日全网采集 | bc4533f3-d7be-470d-8367-f20ec761158b | 08:30 | ⏸ 已暂停（云端接管） |
| 面经雷达 · 晚间补采 | acafef06-5d0c-4d75-8fb8-823c540027f6 | 20:30 | ⏸ 已暂停（云端接管） |
| 每日秋招信息更新提醒 | cd0b228a-a287-48d7-99dd-391a0867b20c | 09:00 | ✅ 保持 ACTIVE（本地） |

> ⚠️ 「秋招信息更新」目前仍是**本地任务**，依赖 WebSearch（WorkBuddy 独有能力，GitHub Actions 里没有），因此暂未转云端。若要转云端，需改为「脚本抓固定校招源」或「搜索引擎 API」，工作量较大。

---

## 七、凭证与配置（脱敏）

### 本地 `.env.local`（关键项）

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | https://lxecahdyvrdfezgtmbfp.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 已配置（脱敏） |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...`（41 字符） |
| `APP_URL` | https://shangan-youqi.app.workbuddy.host |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` | 面经 AI 归纳（deepseek-flash） |
| `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY` | 面试录音转写（腾讯云一句话识别 ASR） |
| `OPENAI_API_KEY` 等 | 面试 AI 复盘（默认关闭，INTERVIEWS_ENABLED=false） |
| `AI_PROVIDER` | deepseek / hunyuan / openai 可切换 |

### 缺失项（影响自动化能力）

- **无 Supabase personal access token（`sbp_`）**：导致无法通过 Management API 自动建表/改表，DDL 只能用户手动在 SQL Editor 执行。
- **无 supabase CLI、无 DB 直连密码**：同理，迁移靠手动。

---

## 八、核心功能清单

| 模块 | 说明 |
|---|---|
| 找岗位 | 秋招岗位目录，搜索/城市/行业/届别/类型筛选 |
| 我的求职 | 投递工作台（11 阶段）、Offer 对比、私人 Offer 管理 |
| 面试中心 | 录音转写 + AI 复盘（内测，默认关） |
| 面经资料 | 面经雷达（五平台采集，`/resources/radar`） |
| 查薪资 | 薪资情报、薪酬/社保计算器 |
| 简历 | PDF/DOCX 上传、原版编辑、3 站内模板 + 自有模板、原格式导出 |
| 日程 | 个人日程与提醒（`/schedule`） |
| 反馈 | 前台「意见反馈」入口 + 后台处理台（`/admin/feedback`） |
| 后台 | P0 运营后台（岗位审核发布、薪资审核、反馈处理等） |

---

## 九、文档索引（`docs/` 19 份）

| 文档 | 内容 |
|---|---|
| ADMIN_SETUP.md / ADMIN_EMAIL_INVITATIONS.md | 后台初始化与管理员邀请 |
| CONFIGURATION.md / DEPLOYMENT.md | 环境变量与部署 |
| SECURITY.md | 身份模型与安全约定 |
| INTERVIEW_RADAR.md / INTERVIEW_INTERNAL.md | 面经雷达与 AI 面试复盘 |
| SCHEDULE.md | 日程提醒 |
| SALARY_INTELLIGENCE.md / PAYROLL_CALCULATOR.md / PAYROLL_CITY_AUTOFILL.md | 薪资/计算器 |
| RESUME_FILES.md | 简历文件与模板 |
| P0_ADMIN_PLAN.md | 后台方案 |
| INFORMATION_ARCHITECTURE.md / SITE_RECONNECTION.md | 信息架构与路由 |
| ANALYTICS.md / TESTING.md / WORKSPACE_STAGES.md / WORKER_OPS.md | 分析/测试/阶段/Worker |
| WORKBUDDY_HANDOFF.md | （旧版交接说明，针对薪酬计算器任务，部分过时） |

---

## 十、待办与遗留问题

| # | 事项 | 状态 |
|---|---|---|
| 1 | **管理端权限**：现有 6 账号均无运营权限，`/admin` 进不去 | 待处理 |
| 2 | **手机端打不开**：静态资源 403 白屏（`__wb_rsc` Cookie 丢失），具体现象待定位 | 待处理 |
| 3 | 秋招信息更新转云端（可选，依赖 WebSearch 暂不宜） | 待决策 |
| 4 | 面经采集云端任务刚上线，需观察 cron 稳定性（免费版有排队延迟） | 观察中 |

---

## 十一、接手步骤（新环境从零启动）

### 只想看成品
- 直接打开：https://shangan-youqi.app.workbuddy.host/?sharecode=JIA64AIIY3

### 要看/改代码
```bash
git clone https://github.com/yunjingwu23-design/shangan-youqi.git
cd shangan-youqi
npm ci
# 需要一份本地 .env.local（从 .env.example 复制，填入 Supabase URL / anon key / service_role key）
npm run dev
```

### 要跑面经采集
```bash
node scripts/radar-collect.mjs --limit 12   # 需 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + DEEPSEEK_API_KEY
```

### 要建表/改表
- 只能到 Supabase SQL Editor 手动执行对应 SQL（无自动建表途径）。
- 直链：https://supabase.com/dashboard/project/lxecahdyvrdfezgtmbfp/sql/new
