# 全网面经雷达 — 系统设计与实现文档

> 本文档是「上岸有期」面经聚合系统的架构蓝图与实现记录。它描述系统如何工作、数据如何流转、数据库如何组织、以及哪些数据源可用/不可用。实现代码以本仓库实际文件为准。

---

## 1. 产品边界与合规原则

「上岸有期」是一个**免费**面经信息聚合系统，不售卖第三方面经，不设付费墙。

核心红线（贯穿所有实现决策）：

1. **只索引、不搬运全文**。对于未获转载授权的外部作品，默认只保存合法的索引信息（标题、来源、链接、作者、发布时间）与必要的原创归纳（由运营人员或 AI 基于有权处理的文本生成的问题要点），**不复制、不公开完整原文**。
2. **不绕过访问控制**。不登录绕过、不破解验证码、不碰反爬、不调用未授权私有接口。
3. **不伪造采集能力**。没有合法自动访问能力的平台，明确标注「不支持自动获取」，通过人工提交和授权导入补充。
4. **不虚构、不推断**。AI 无法确定时返回 `null` 或「待审核」；不把「发现的帖子数」当成「已核实面经数」；不推断作者未公开的 Offer 结果。
5. **区分用户投稿与外部内容**。用户自填的体验、评分与外部抓取/导入的内容在数据层强制区分。

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Next.js App Router)                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│  │ 面经雷达   │ │ 公司主页  │ │ 岗位详情   │ │ 问题库/收藏 │        │
│  │ /resources │ │ /resources│ │ /resources│ │ /resources│        │
│  │ /radar     │ │ /company   │ │ /experience│ │ /questions │        │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘        │
│        └──────────────┴──────┬──────┴──────────────┘             │
│                              ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │              API 路由层 (app/api/interview-radar/*)         │   │
│  │  sameOrigin 校验 · actor() 鉴权 · ApiError 统一错误          │   │
│  └──────────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────────┼──────────────────────────────────┘
                                  │
┌─────────────────────────────────┼──────────────────────────────────┐
│                   服务端数据层 lib/interview-radar/                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐  │
│  │ search.ts │ │ import.ts │ │ ai.ts     │ │ server.ts (读取)   │  │
│  │ 全文/筛选 │ │ 手动URL/  │ │ AI结构化  │ │ RPC 写操作封装      │  │
│  │           │ │ CSV导入/  │ │ 识别分类  │ │ 去重/审核          │  │
│  │           │ │ 投稿      │ │           │ │                   │  │
│  └───────────┘ └───────────┘ └───────────┘ └───────────────────┘  │
└─────────────────────────────────┬──────────────────────────────────┘
                                  │
┌─────────────────────────────────┼──────────────────────────────────┐
│                    Supabase PostgreSQL (RLS + RPC)                 │
│  companies / job_roles / interview_experiences / interview_questions│
│  interview_sources / collection_tasks / user_* / moderation_logs    │
│  security definer RPC 封装写操作，private.require_admin 鉴权        │
└─────────────────────────────────┴──────────────────────────────────┘
```

**关键决策：所有写操作走数据库 RPC（`security definer`）**，与项目现有 salary 模块一致。浏览器端只有受限的 `select` 权限，写路径统一在数据库层校验角色与归属，避免绕过 API 直接写库。

---

## 3. 数据流

### 3.1 外部面经进入系统的三条合法路径

```
路径 A：手动/文件导入（运营人员）
  运营粘贴 URL 或上传 CSV → import.ts 解析 → 存 interview_source_records
  → 状态 = 待核实 → AI 结构化 → 人工审核 → 发布为 interview_experiences

路径 B：用户投稿（登录用户）
  用户填表单 → user_interview_submissions（状态=待审核）
  → 管理员审核 → 通过则生成 interview_experiences（标记 origin=user_submission）

路径 C：授权来源连接器（预留，仅实现已确认合法的）
  SourceAdapter 接口 → collection_tasks 驱动 → collection_runs 记录每次执行
  → 去重后入库。当前无已授权的第三方自动抓取接口，故此项仅保留接口与任务框架，
  不伪造「已完成采集」。
```

### 3.2 状态机（内容真实性四态）

```
发现线索 (discovered)
   │
   ▼
待核实 (pending_verification) ──核实到原文──▶ 已核实 (verified)
   │                                           │
   ├── 来自二次来源 ──▶ 二次来源 (secondary)    │
   │                                           │
   └── 链接失效/下架 ──▶ 已失效 (expired)       │
```

首页与后台统计**分别**展示：已发现来源、已核实面经、已整理问题、已覆盖公司、已覆盖岗位。`discovered_count ≠ verified_count`。

---

## 4. 数据库表结构

> 命名与项目现有约定一致：`public` schema + RLS + 显式 grant/policy；`app_users(user_id)` 是用户主表；内部 ID 用 `uuid`；写操作由 RPC 封装。

### 4.1 公司

| 表 | 字段 | 说明 |
|----|------|------|
| `companies` | `id uuid PK`、`name text UNIQUE`（规范名，如「京东集团」）、`english_name text`、`industry text`、`company_group text`（集团名，用于区分集团/子公司）、`verified_status text`（verified/unverified）、`created_at`、`updated_at` | 统一公司主体 |
| `company_aliases` | `id uuid PK`、`company_id uuid FK`、`alias text`、`created_at` | 简称/英文名/历史名，如「京东」「JD」→ 京东集团；`UNIQUE(company_id, alias)` |

### 4.2 岗位

| 表 | 字段 | 说明 |
|----|------|------|
| `job_roles` | `id uuid PK`、`company_id uuid FK`、`name text`、`category text`（product/operation/… 14 类）、`custom boolean`、`created_at` | 每个公司下的岗位；`UNIQUE(company_id, name)` |
| `role_aliases` | `id uuid PK`、`role_id uuid FK`、`alias text`、`created_at` | 岗位别名，如「京东采销」「3C 采销」 |

> 岗位**不强制全局合并**：京东采销、京东零售采销、3C 采销作为独立岗位保留细分业务方向，仅通过别名与公司关联，避免错误合并。

### 4.3 来源与原始记录

| 表 | 字段 | 说明 |
|----|------|------|
| `interview_sources` | `id uuid PK`、`name text`（小红书/牛客/知乎/脉脉/Bilibili/官方招聘社区…）、`source_type text`（community/official/…）、`supported_methods text[]`（manual_import/csv_import/user_submission/authorized_api）、`authorization_status text`（authorized/unauthorized/manual_only）、`last_sync_at timestamptz`、`sync_status text`、`error_message text`、`active boolean` | 来源目录，`source_type` 与 `supported_methods` 决定该来源能否自动抓取 |
| `interview_source_records` | `id uuid PK`、`source_id uuid FK`、`platform_post_id text`、`normalized_url text`、`title text`、`author text`、`published_at timestamptz`、`content_fingerprint text`、`raw_excerpt text`（仅有权处理时）、`status text`（discovered/pending_verification/verified/secondary/expired）、`imported_by uuid`、`created_at` | 原始帖子索引记录；`UNIQUE(source_id, platform_post_id)` 与 `normalized_url` 用于去重 |

### 4.4 面经主体

| 表 | 字段 | 说明 |
|----|------|------|
| `interview_experiences` | `id uuid PK`、`company_id uuid FK`、`job_role_id uuid FK`、`recruitment_type text`（daily_internship/conversion_internship/autumn_recruitment/spring_recruitment/**undetermined**）、`cohort text`（2026届/2027届…）、`title text`、`summary text`（原创归纳）、`source_record_id uuid FK`、`origin text`（external/user_submission）、`verification_status text`（verified/pending/secondary/expired）、`published_at timestamptz`、`created_at`、`updated_at` | 一条面经对应一篇外部帖子或一条用户投稿 |
| `interview_rounds` | `id uuid PK`、`experience_id uuid FK`、`round text`（笔试/AI面试/在线测评/群面/一面/二面/三面/专业面/HR面/终面/其他）、`sort_order int` | 一篇面经可含多个轮次 |
| `interview_questions` | `id uuid PK`、`experience_id uuid FK`、`company_id uuid FK`、`job_role_id uuid FK`、`recruitment_type text`、`round text`、`question_text text`、`question_category text`（自我介绍/实习经历/项目深挖/行业认知/专业知识/行为面试/情景问题/Case Interview/技术问题/求职动机/其他）、`confidence_level text`（verified/pending/inferred）、`source_record_id uuid FK`、`created_at` | 面试问题；`confidence_level` 默认 `pending`，仅有人工核验后才是 `verified` |
| `interview_reviews` | `id uuid PK`、`experience_id uuid FK`、`reviewer_kind text`（original_author/user）、`difficulty text`、`experience_rating int`（1-5，用户评分）、`review_text text`、`result text`（仅作者自愿公开）、`created_at` | 作者评价与用户补充评价分开（`reviewer_kind`） |
| `interview_tags` | `id uuid PK`、`experience_id uuid FK`、`tag text` | 相关标签 |

### 4.5 采集任务（预留框架，Sprint 4 填充）

| 表 | 字段 | 说明 |
|----|------|------|
| `collection_tasks` | `id uuid PK`、`company_id uuid FK`、`job_role_id uuid FK`、`recruitment_type text`、`keywords text[]`、`source_id uuid FK`、`schedule jsonb`、`enabled boolean`、`last_run_at timestamptz`、`found_count int`、`verified_count int`、`last_error text` | 检索任务，如「京东+采销+秋招+面经」 |
| `collection_runs` | `id uuid PK`、`task_id uuid FK`、`source_id uuid FK`、`status text`、`found_count int`、`verified_count int`、`error_message text`、`started_at`、`finished_at` | 每次执行记录（限速/重试/超时/失败日志） |

### 4.6 用户侧与审核

| 表 | 字段 | 说明 |
|----|------|------|
| `user_interview_submissions` | `id uuid PK`、`user_id uuid FK`、`company_name text`、`job_role_name text`、`recruitment_type text`、`rounds text[]`、`questions jsonb`、`review_text text`、`source_url text`、`status text`（pending/approved/rejected）、`moderation_note text`、`created_at` | 用户投稿，与外部内容物理分离 |
| `user_saved_interviews` | `user_id uuid FK`、`experience_id uuid FK`、`created_at`；`PK(user_id, experience_id)` | 收藏 |
| `user_source_subscriptions` | `id uuid PK`、`user_id uuid FK`、`company_id uuid FK NULL`、`job_role_id uuid FK NULL`、`created_at` | 关注公司/岗位，接收新面经提醒 |
| `moderation_logs` | `id uuid PK`、`actor_id uuid FK`、`action text`、`target_type text`、`target_id uuid`、`note text`、`created_at` | 所有管理操作留痕 |

### 4.7 索引与约束（关键）

- `companies(name)` UNIQUE；`company_aliases(alias)` 加索引用于联想
- `interview_source_records`：`UNIQUE(source_id, platform_post_id)`、`normalized_url` 加 btree 索引、`content_fingerprint` 加索引
- `interview_experiences(company_id, job_role_id, recruitment_type)` 复合索引；`published_at desc`
- `interview_questions(company_id, job_role_id, round)` 复合索引
- 全文搜索：PostgreSQL `pg_trgm`（`gist_trgm_ops`）+ `to_tsvector('simple')` 生成列（Sprint 3 增强，第一阶段先做 `ilike` + trgm 模糊匹配）

---

## 5. 页面路由与权限设计

### 5.1 前台路由（「面经资料」板块下）

| 路由 | 页面 | 权限 |
|------|------|------|
| `/resources/radar` | 页面 A：全网面经雷达（搜索+筛选+排序） | 公开 |
| `/resources/radar/company/[companyId]` | 页面 B：公司面经主页（岗位分组） | 公开 |
| `/resources/radar/experience/[experienceId]` | 页面 C：岗位面经详情（问题要点+作者评价+原帖链接+推荐+用户补充评价入口） | 公开（评价入口需登录） |
| `/resources/radar/questions` | 页面 D：问题库（按公司/岗位/轮次搜索筛选收藏） | 公开（收藏需登录） |
| `/workspace/favorites` | 页面 E：我的收藏与订阅 | 登录 |

### 5.2 后台路由（`/admin` 下「面经情报管理」）

| 路由 | 模块 | 角色 |
|------|------|------|
| `/admin/interview-radar` | 概览 + 覆盖分析（已发现/已核实/问题/公司/岗位） | super_admin/editor/reviewer |
| `/admin/interview-radar/sources` | 来源管理 | super_admin |
| `/admin/interview-radar/import` | 手动 URL / CSV 导入 | editor/super_admin |
| `/admin/interview-radar/companies` | 公司与岗位分类、别名 | editor/super_admin |
| `/admin/interview-radar/ai` | AI 自动整理（触发分类） | editor/super_admin |
| `/admin/interview-radar/review` | 待核验线索 + 人工审核 + 去重处理 | reviewer/super_admin |
| `/admin/interview-radar/submissions` | 用户投稿审核 | reviewer/super_admin |
| `/admin/interview-radar/tasks` | 定时任务管理（预留） | super_admin |

### 5.3 权限矩阵

| 操作 | super_admin | editor | reviewer | 普通用户 |
|------|:---:|:---:|:---:|:---:|
| 浏览已核实面经 | ✓ | ✓ | ✓ | ✓ |
| 搜索/筛选/收藏 | ✓ | ✓ | ✓ | ✓ |
| 提交面经/评价 | ✓ | ✓ | ✓ | ✓ |
| 导入 URL/CSV | ✓ | ✓ | ✗ | ✗ |
| AI 结构化整理 | ✓ | ✓ | ✗ | ✗ |
| 审核/去重/下架 | ✓ | ✗ | ✓ | ✗ |
| 来源/任务管理 | ✓ | ✗ | ✗ | ✗ |
| 查看后台 | ✓ | ✓ | ✓ | ✗ |

> 数据库层用 `private.require_admin(array[...])` 强制执行，浏览器端绕过 API 直接写库也会被 RLS 拦截。

---

## 6. 数据源可用性清单

> 核心立场：**当前没有任何已获官方授权的第三方自动抓取接口**。所有自动采集类连接器均「不支持自动获取」，仅保留 SourceAdapter 接口与任务框架，绝不伪装成已完成。

| 来源 | 自动抓取 | 说明 |
|------|:---:|------|
| 小红书 | ❌ 不支持自动获取 | 内容需登录、有反爬与访问控制；无公开官方 API。仅支持用户手动提交链接 + 运营人工导入 |
| 牛客网 | ❌ 不支持自动获取 | 无公开授权 API；仅手动/CSV 导入 + 用户投稿 |
| 知乎 | ⚠️ 部分 | 公开问题页可访问，但无授权内容 API；仅保存索引信息与链接，不复制全文 |
| 脉脉 | ❌ 不支持自动获取 | 需登录 + 强访问控制；仅用户投稿 |
| Bilibili | ⚠️ 部分 | 有公开 API 但受服务条款限制，面经内容多为视频；仅索引视频标题/链接 |
| 企业公开招聘社区 | ⚠️ 部分 | 官方招聘页公开可访问，但无结构化面经接口；仅人工整理 |

**当前可用（已实现）的合法数据进入方式：**
1. ✅ 手动 URL 导入（运营人员粘贴合法可访问的公开链接，仅保存索引信息）
2. ✅ CSV/Excel 导入（运营人员整理的授权或自产数据）
3. ✅ 用户投稿（登录用户提交自己的真实面经）
4. ❌ 授权 API 自动抓取 —— **无**，接口预留但标注 `authorization_status = 'unauthorized'`

---

## 7. 实现进度（Sprint 对照）

- **Sprint 1（结构与页面）**：✅ 数据库迁移、分类体系、面经首页/公司/岗位/详情页面
- **Sprint 2（导入与审核）**：✅ 手动 URL 导入、CSV 导入、用户投稿、AI 分类、后台审核、去重
- **Sprint 3（搜索与关联）**：⏳ 公司别名、岗位同义词、全文搜索、多条件筛选、收藏订阅（第一阶段用 ilike + trgm，向量搜索不立即部署）
- **Sprint 4（持续发现）**：⏳ 合法来源连接器（仅框架）、定时任务、增量同步、错误监控、覆盖报表

---

## 8. 仍需人工介入的环节

1. **数据源授权**：任何第三方平台的自动抓取，必须先取得该平台的合法授权或确认其公开索引服务条款允许，方可实现对应连接器。
2. **内容核验**：AI 结构化结果需人工复核后才能标记 `verified`；AI 无法确定时一律「待审核」。
3. **版权确认**：对任何拟展示「原文摘录」的内容，需确认授权范围；默认只展示索引信息与原创归纳。
4. **数据库迁移执行**：新的 migration SQL 需在实际 Supabase 环境执行（本地开发用 `supabase db reset` 或手动执行，生产用 `supabase db push`）。

---

## 9. 每日自动采集（2026-11-11 上线，2026-11-12 扩到五平台）

### 9.1 脚本

`scripts/radar-collect.mjs`

```bash
node scripts/radar-collect.mjs                    # 五平台自动发现 + 入库
node scripts/radar-collect.mjs --limit 8          # 本次最多入库 8 篇
node scripts/radar-collect.mjs --dry              # 只抓取不写库
node scripts/radar-collect.mjs --candidates c.json
#   c.json = [{"url":"https://...","platform":"知乎"}]
#   供定时任务把搜索引擎发现的候选链接一起送进来
```

### 9.2 平台覆盖

| 平台 | 发现方式 | 数据来源字段 | 可用性 |
|---|---|---|---|
| 牛客网 | `discuss?type=1/2/3/7` 列表页 | `og:title` / `description` / `keywords` | ✅ 可用，高频请求会返回空壳页（需重试） |
| 掘金 | `api.juejin.cn/search_api/v1/search` 公开搜索 | 接口直接给标题 + 摘要 + ctime | ✅ 最好用 |
| CSDN | `so.csdn.net/api/v3/search` 公开搜索 | 接口给标题 + 描述 + `create_time` | ✅ 可用，老帖多，需要时效过滤 |
| 思否 | `segmentfault.com/search` SSR 页 | 只取链接，标题回落到 `og:title` | ✅ 可用，量少 |
| V2EX | `v2ex.com/api/topics/show.json?node_name=jobs` | 接口给标题 + 正文 | ⚠️ 接口通，但 jobs 节点多是招聘帖，面经命中率极低 |
| 知乎 | — | — | ❌ 直接 403，必须登录，不采集 |
| 小红书 / 脉脉 | — | — | ❌ 需登录 + 反爬，只登记索引 |
| 看准网 / 掘金标签页 | — | — | ❌ 返回 JS 空壳页，不做浏览器渲染 |

候选按平台轮流取（每平台上限 10 条、按发布时间倒序），避免一次运行的配额全被牛客吃掉。

### 9.3 数据流

```
发现（牛客列表页 / 掘金搜索 / CSDN搜索 / 思否搜索 / V2EX API / 外部候选 JSON）
  → 平台侧已有标题+摘要的直接用；其余匿名抓详情页 og:title / description / keywords
  → 过滤：噪声词（求面经、内推码、简历模板…）、过旧（2023 年前）、时效性
  → 相关性与公司判定（必须命中面经/面试/一面/二面…，且能确定公司；不收 offer 开奖、速成指南）
  → AI 原创归纳（DeepSeek，输入只有摘要，禁止推断）
  → 三重去重（URL / 内容指纹 / 同名标题）
  → 写入 interview_source_records / interview_experiences / rounds / questions / tags
```

写入策略：
- 页面公开可读 + 能确定公司 + 标题或关键词明确指向面试记录 + AI 产出原创归纳 → `verification_status = 'verified'`、`published_at = now()`，直接上线。
- 只有索引、拿不到可用摘要，或 AI 归纳不足 60 字 → 只写 `interview_source_records`（`pending_verification`），不出面经条目，避免把平台摘要当本站摘要公开。
- 题目置信度沿用 AI 判断：材料里明确以提问形式出现的标 `verified`，其余 `inferred`（后者不进入公开问题库）。
- 公司简称归一：字节→字节跳动、阿里→阿里巴巴、华子→华为、B站→哔哩哔哩等；AI 给出「头条、微信、Shopee…」这类多公司串时，从词库取第一个可识别公司。
- 无 AI 摘要的帖子一律不发布；抓取失败的页面只记录原因，不编造。

### 9.4 已知限制

| 限制 | 说明 |
|---|---|
| 牛客列表页不稳 | 高频请求会返回约 5KB 空壳页（无帖子链接）。脚本对列表页重试 4 次、详情页重试 3 次。 |
| 详情页无正文 | 牛客详情页已不再服务端渲染正文，只能用平台分享摘要（`og:description`，约 300-700 字）+ 关键词做归纳，所以题目数偏少。 |
| 小红书/脉脉/知乎 | 需登录或反爬（知乎直接 403），不做采集（红线 2），只登记索引待人工核实。 |
| CSDN 噪音大 | 搜索结果里大量通用技术博客与 2015-2020 年老帖，靠「命中面试关键词 + 2023 年后 + 能确定公司」三层过滤，命中率仍只有 2%。 |
| 边际递减 | 一次性跑 3-4 轮后（约 66 条候选池），当天可新增的基本采完，继续跑只会全部命中「已存在/无关」。靠每日刷新累积。 |
| 单次产出不稳定 | 一次运行新增 1-12 条，取决于列表页是否刷新、搜索接口返回是否新鲜。 |

### 9.5 首次采集结果（2026-11-12）

从 5 条种子数据扩到 **35 条已发布面经 / 28 家公司 / 70 道题目 / 53 条索引记录**。
来源分布：牛客 37、掘金 11、CSDN 2、思否 2、V2EX 0（索引记录口径）。

### 9.6 定时任务

| 任务名 | automation id | 时间 | 作用 |
|---|---|---|---|
| 面经雷达 · 每日全网采集 | `bc4533f3-d7be-470d-8367-f20ec761158b` | 每天 08:30 | 主采集：跑五平台脚本 + WebSearch 补其他平台候选，再跑一次，输出简报 |
| 面经雷达 · 晚间补采 | `acafef06-5d0c-4d75-8fb8-823c540027f6` | 每天 20:30 | 补位采集：早上没开机时补上，早上跑过则做增量补充 |

为什么设两个：定时任务在本机执行，到点时电脑关机或客户端未运行就不会跑。早上 08:30 那次在 2026-11-12 首日就没有产生任何入库记录，为保住「每天都抓」加了晚间补位。脚本有 URL / 指纹 / 同名标题三重去重，两次都成功也不会重复入库。

### 9.7 运行日志

每次执行会往 `logs/radar-collect.log` 追加两行（开始 / 完成），异常时追加堆栈：

```
[2026-11-12 14:31:38] ===== 开始运行（dry 空跑，limit=3）=====
[2026-11-12 14:32:34] 完成：发现 47 · 发布 1 · 仅索引 2 · 已存在跳过 0 · 无关跳过 3 · 过旧跳过 0 · 失败 0
```

判断「今天到底抓没抓」，直接看这个文件有没有当天的记录，比翻数据库 `created_at` 更直接。`logs/` 已在 `.gitignore` 中忽略。

