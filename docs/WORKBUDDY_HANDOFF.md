# 上岸有期：交给 WorkBuddy 的项目说明

交接整理日期：2026-11-07。本文包含项目事实、用户约定和继续工作的入口，不包含账号密码、生产密钥或其他工具的隐藏指令。

## 1. 源码与分支

- 仓库：<https://github.com/yunjingwu23-design/shangan-youqi>
- 官网：<https://shangan-youqi.vercel.app>
- 正式代码分支：`main`，已核实的功能提交为 `d05b623804411dab9e5265be77c3c78c415cd06f`。
- **继续未完成任务请使用**：`codex/payroll-city-autofill-20261105`。
- 自动填写功能代码提交：`4c1d06dc0b9ce42d1688d20c4fc13bf43e8a8a7e`。其后的本交接文档更新不改变该功能的实现状态。

```bash
git clone --branch codex/payroll-city-autofill-20261105 https://github.com/yunjingwu23-design/shangan-youqi.git
cd shangan-youqi
```

分支 ZIP：<https://github.com/yunjingwu23-design/shangan-youqi/archive/refs/heads/codex/payroll-city-autofill-20261105.zip>

仓库含源码、官方 Logo、所需静态资源、锁文件、数据库迁移、部署配置和测试。源码 ZIP 不包含 `.git` 历史、`node_modules`、构建缓存、`.env.local`、本地 JWT、用户上传原件或数据库内容。生产数据仍留在原 Supabase，不能靠复制源码把它迁走。

## 2. 项目背景与继续工作的目标

「上岸有期」是中文求职平台，已有岗位目录、邮箱验证码登录、个人投递工作台、面经、PDF/DOCX 简历编辑与导出、运营后台和数据分析。AI 面试录音转写/复盘是独立内测功能，默认关闭，真实模型调用需要单独配置；不要把本地契约测试当作真实模型上线验收。

技术栈：Next.js 16.4.3、React 19、TypeScript、Node.js 24、npm、Supabase Auth/PostgreSQL RLS/Storage。沿用 Vercel + Supabase 部署；**用户没有要求迁往国内，也不需要因为 Codex 的联网限制而迁站。**

本次目标不是重聊需求或重写项目，而是：

> 在现有薪酬/社保计算器中完成真实城市政策自动填写。由 AI 搜索、核对并录入官方数据，用户只选择城市和输入工资；不要再让用户自己查费率、上下限或逐项填写。完成数据核验、回归验证、正式发布和可行的线上验收。

优先准备的城市是上海、北京、深圳、广州。这是当前实现选择的第一批范围，不代表已经取得其官方数据。

## 3. 用户确认的约定

- 保持「上岸有期」官方 Logo 与现代极简设计，中文界面。
- 仅保留四个一级导航：**找岗位 / 我的求职 / 面试中心 / 面经资料**，不能新增第五个。
- 「查薪资」归在找岗位下；「Offer 对比」归在我的求职下；计算器从查薪资及 Offer 对比进入。
- 不破坏现有岗位、面经、简历和 AI 面试复盘模块，不重置数据库或覆盖用户文件。
- 外部数据必须真实标注来源、年份、可信度及适用条件；不能将演示/测试数据包装为真实行情或官方政策。
- OfferShow **没有接入**。仅预留可扩展适配器；获得正式授权和接口文档后才能接 API。不能假定其有公开 API，不能破解小程序、绕过登录、盗用私有接口或批量搬运数据。
- 匿名投稿先审核，公开仅限脱敏聚合；个人 Offer 仅本人可见。继续使用内部 `app_users.user_id` 和 RLS，不把昵称或邮箱当业务身份。
- 税前月薪、年薪、年度奖金、股票归属估值与实习日薪分别处理，不能混算；至少 5 位不同投稿者才公开固定统计组，每项指标也有样本门槛。
- 用户希望实际完成开发和发布，不希望被反复要求手动配置 Token、查政策参数或进行技术排查。遇到真实权限阻碍时给出明确事实和最少必要操作；不能假装已经上线。
- 项目内 `AGENTS.md` 要求修改 Next.js 代码前阅读本机 `node_modules/next/dist/docs/` 的相应指南。优先使用锁定版本和 `npm ci`；不要擅自升级依赖或改锁文件。

这里没有用户要求的特殊文档字体、表格格式或其他排版记忆。不要将别的项目（PPT、宠物碗等）混进来。

## 4. 已完成什么，卡在哪里

### 正式分支已有的代码

1. **薪资情报 / Offer 对比**：公开搜索、结构展示、匿名投稿及本人修改删除、审核、举报、来源维护、异常/重复提示、私有对比表。
2. 核心表：`salary_reports`、`salary_companies`、`salary_role_aliases`、`salary_verifications`、`salary_moderation_logs`、`personal_offers`；另有 `salary_sources`、`salary_complaints`。
3. **通用薪酬/社保计算器**：到手工资、个人与单位缴费、缴费上下限、年终奖两种计税、累计预扣逐月明细、公积金双边入账及单位成本，输入仅在浏览器计算。正式分支这一版的城市参数仍需自定义，默认比例标记为演示。
4. 薪资升级 SQL 最初错误地要求可选 AI 面试表存在，已修正。现版保留官网原有个人数据清理逻辑，只在其前增加薪资清理；缺失的身份/角色辅助函数可恢复，不新建或提升管理员。

### 生产数据库与发布证据

用户已在原 Supabase 执行修正版 `supabase/install-salary.sql`，并提供以下六项全部为 `true` 的截图：

- `salary_tables_rls_ok`
- `aggregation_ok`
- `moderation_ok`
- `statistics_ok`
- `anonymous_details_blocked`
- `licensing_notes_private`

因此**不要让用户再次安装薪资表，更不要删表重装**；需要检查时只运行脚本末尾的只读检查。

Codex 已将薪资及通用计算器代码推送到远程 `main`。这是代码发布证据；由于工作环境无法访问官网/Vercel API，**未独立确认 Vercel Ready、生产登录和线上页面行为**。WorkBuddy 应用自己可用的浏览器/网络验证，不能把此前“已推 main”写成“线上功能全验收通过”。

### 最新开发分支：自动城市填写

已实现但尚未合入 `main`：

- 城市和政策月份选择、政策快照 API、自动填写与来源展示。
- 官方域名与具体文档 URL 校验、原文 SHA-256/摘录/核验日期、版本有效期与重叠检查。
- 不同险种分别使用基数上下限，避免养老限额误套到医疗。
- 自动模式缺少已核验版本时不生成结果，不借用别的城市或过期数据；自定义为可选模式。
- 按所选月份政策估算全年，明确不回算年内调标。公积金比例、工伤行业类别等单位可变条件必须明确列为假设。

**尚未完成的关键项：`lib/salary/city-policy-data.json` 仍是 `[]`。没有真实城市政策数值，没有完成真实自动填写。**

此前 Codex 访问官方人社网站时，Cloud 代理在 CONNECT 阶段返回 403，运行白名单只放行包管理/Git 等域名。所需官方域名已保存在原云环境的配置草稿，但不等于已应用。这是原 Codex 执行环境的限制，不是官网部署地的问题；**WorkBuddy 请先用自己的正常联网能力访问官方来源，不要沿用“必须换国内部署”或“用户必须编辑 Codex 设置”的结论。**

此外，OfferShow 只有官方小程序搜索指引，未核验可直达的官方分享链接，未接入数据源。

## 5. WorkBuddy 下一步应做什么

1. 检出上述自动填写开发分支，先读本文件、`AGENTS.md`、`docs/PAYROLL_CITY_AUTOFILL.md` 和现有模型，不要从零重建。
2. 使用 WorkBuddy 的正常搜索/浏览能力，取得上海、北京、深圳、广州官方人社、医保、公积金具体政策原文；记录发布/生效/失效日期、来源 URL、获取日期、原文摘录及 SHA-256。
3. 按政策交集填写真实数据文件。若适用原文来自省级人社/医保或国家部委，确认其适用城市后同步扩充 `cityDirectory` 官方域名名单，不要为了通过校验改用第三方页面。只录入已经核验的版本；有多档医保、行业浮动工伤费率、单位自定公积金比例时明确适用对象和默认估算条件，不能编造唯一“城市统一值”。不要复制测试夹具的数值或 URL。
4. 检查每个城市、月份是否被完整覆盖；不能把 2025 年旧数值直接套给 2026/2027 年。可以先交付已核验城市，其余明确待核验，不用虚构数据凑齐。
5. 运行下述单元、构建、浏览器测试，并抽查实际城市公式、工资变化重算、来源和日期显示。
6. 检查远程 `main` 是否新增改动，保留其他更新后再合并、发布到既有 Vercel 项目，并查看真实部署状态及页面。原站可继续 Vercel + Supabase，无需新建生产库，也无需为这一功能再跑 SQL。

## 6. 关键文件

| 用途                                 | 文件                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 入口和启动                           | `README.md`、`package.json`、`AGENTS.md`                                                                |
| 计算器页面                           | `app/(site)/jobs/salary/calculator/page.tsx`                                                            |
| 计算器界面                           | `components/salary/calculator.tsx`                                                                      |
| 金额/税务/社保计算                   | `lib/salary/calculator.ts`                                                                              |
| 城市目录、来源及有效期校验、自动套用 | `lib/salary/city-policies.ts`                                                                           |
| **待填真实官方政策数据**             | `lib/salary/city-policy-data.json`                                                                      |
| 公开政策快照接口                     | `app/api/salary/policies/route.ts`                                                                      |
| 计算器和自动填写说明                 | `docs/PAYROLL_CALCULATOR.md`、`docs/PAYROLL_CITY_AUTOFILL.md`                                           |
| 薪资与对比前端                       | `components/salary/explorer.tsx`、`personal.tsx`、`editor.tsx`、`admin.tsx`                             |
| 薪资 API                             | `app/api/salary/`、`app/api/admin/salary/route.ts`                                                      |
| 薪资数据库                           | `supabase/migrations/202611020001_salary_intelligence.sql`、`202611020002_salary_reference_privacy.sql` |
| 已执行过的合并升级入口               | `supabase/install-salary.sql`、`scripts/build-salary-installer.mjs`                                     |
| 导航                                 | `lib/navigation.ts`、`components/site-navigation.tsx`                                                   |
| 生产配置和部署                       | `.env.example`、`vercel.json`、`docs/CONFIGURATION.md`、`docs/DEPLOYMENT.md`                            |
| 本地服务                             | `scripts/local.mjs`、`infra/compose.yml`                                                                |

## 7. 本地启动、验证与已知限制

需要 Node.js 24、npm、Docker Compose v2；部分面试/简历测试需要 FFmpeg/FFprobe、Chromium。原本地脚本使用 Linux Docker socket `/var/run/docker.sock`；若 WorkBuddy 运行在 Windows，建议使用 WSL2/Linux，而不是修改生产应用来适配此路径。

```bash
npm ci
npm run db:start
npm run build
npm start
```

`db:start` 启动隔离本地 Auth/Postgres/Storage/Mailpit、应用迁移并在不存在时生成私有 `.env.local`；不会配置生产库。仅做前端开发时也可在完成本地配置后运行 `npm run dev`。集成/浏览器验收优先用构建后的服务，避免 Next 开发浮层拦截移动端点击。

服务运行后，在另一个终端执行：

```bash
npm run typecheck
npm test
npm run test:calculator
npm run test:city-policies
npx playwright test tests/city-policies.e2e.ts tests/payroll-calculator.e2e.ts
```

登录/薪资等真实本地集成：`npm run test:integration`、`npm run test:salary`。这些测试会创建和清理隔离账号/记录，只允许本地数据库，不能在生产绕过目标保护。Playwright 默认 `/usr/bin/chromium`，其他安装路径设置 `PLAYWRIGHT_CHROMIUM_PATH`。

此前实际结果：

- 自动填写分支：6 项城市政策逻辑 + 11 项工资计算测试，共 17 项通过；4 条 Chromium 流程通过；生产构建、格式检查通过。
- 城市浏览器流程使用**仅测试时拦截的虚构政策响应**，不证明已经抓到真实官方数据。测试文件 `tests/fixtures/city-policy.ts` 不得导入生产数据目录。
- 之前薪资/对比阶段：13 项薪资测试、2 条薪资浏览器流程通过；原认证/隔离 19 项、原单元 17 项通过。
- SQL 兼容修复：3 项一次性数据库安装器测试通过，覆盖缺少可选 AI 表、保留自定义清理和角色校验、缺失必要基础表时完整停止。
- 以上为历史本地验证，不是本次交接时重新跑过全部套件，更不是生产验收。

## 8. 凭证与生产环境

源码不含生产凭证。缺少本地 Token 不代表用户的 Vercel/Supabase 未配置。先读 `docs/DEPLOYMENT.md`，优先复用现有 GitHub → Vercel 连接，不要反复要求用户填部署 Token。

需要的应用变量名见 `.env.example`：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`APP_URL`、`AUTH_RATE_LIMIT_SECRET`、`TRUST_PROXY`。生产值只在原部署平台的安全设置中使用；不要把 localhost、开发 JWT 或 `.env.local` 上传到官网。

城市政策采集是公开资料读取，不需要用户提供社保参数或数据 API 密钥。若新环境确实还有访问障碍，报告实际请求结果并使用新环境支持的授权方式，不绕过网络或 TLS 校验。
