# 薪资情报与 Offer 对比

入口：找岗位 → 查薪资 `/jobs/salary`；我的求职 → Offer 对比 `/workspace/offers`；后台 → 薪资审核与来源 `/admin/salary`。保留原四个一级模块、官方 Logo 和原模块。

## 生产发布入口

官网资料记录为 `https://shangan-youqi.vercel.app`，生产 Supabase 项目为 `lxecahdyvrdfezgtmbfp`。实际部署前仍需通过生产控制台核实二者绑定关系。

- 单次数据库升级：[install-salary.sql](../supabase/install-salary.sql)，将两个增量迁移合并为一个事务。复制全文到目标项目 SQL Editor，以 postgres 运行。依赖或已有结构冲突时完整回滚，不删除用户数据。已安装时只运行末尾的只读检查，不要删除表重装。
- SQL Editor：`https://supabase.com/dashboard/project/lxecahdyvrdfezgtmbfp/sql/new`。先完成数据库升级，再将发布提交部署到现有 Vercel 项目，复用原生产环境变量；不上传 `.env.local`。
- 线上验收：`/jobs/salary` 和 `/api/salary` 可正常读取；`/workspace/offers` 未登录时跳转登录；`/api/salary/reports` 未登录时返回 401；四个一级导航与旧岗位、简历、面经路径继续可用。不要在生产运行会创建账号、投稿和删除数据的本地测试套件。
- 发布前记录 Vercel 当前生产部署 ID，以便应用部署失败时回退代码。新增数据库表保留；不要通过删表回退，避免丢失投稿。可单独核验 `node scripts/build-salary-installer.mjs --check`，确保 SQL 与已测试迁移一致。

## 上线顺序

1. 在目标数据库备份并应用 `supabase/migrations/202611020001_salary_intelligence.sql`、`202611020002_salary_reference_privacy.sql`（按顺序）（依赖现有账号、后台角色和面试迁移）；本地 `npm run db:start` 自动应用。部署新版应用。不会导入示例薪资或改变已有岗位、简历、面经。
2. 审核员 / 超级管理员先维护公开标准公司；用户提交真实 Offer 后逐条脱敏、检查年份、薪资口径、重复和异常，再批准。编辑员可查看但不能审核。审核员不能批准自己的投稿。仅用户自述不能标成官方已证实。
3. 合作数据必须另行获得书面授权、接口文档和有效期限后实现 `SalaryDataAdapter`。当前没有启用的适配器、OfferShow API 地址、抓取器或外部薪资数据。登记来源不代表接入 API，也不代表来源已被系统自动验证。

OfferShow：当前提供微信搜索官方小程序、核对主体的查询指引。运行环境的网络策略阻止核验其网站，故没有猜测网站或小程序私有链接。获得可核验的官方深链后可补充跳转，不影响自建模块运行。

## 数据、口径与隐私

- 六张核心表：salary_reports、salary_companies、salary_role_aliases、salary_verifications、salary_moderation_logs、personal_offers；另有 salary_sources、salary_complaints 供来源与举报管理。
- 自建投稿和个人 Offer 都属于 app_users.user_id，数据库 RLS 限制本人读写；后台读取投稿需启用的运营角色；普通业务不使用 service_role。
- 投稿只含结构化字段，不收姓名、联系方式、精确团队、Offer 文件。审核将公司映射到标准公司并重写公开岗位、城市，移除可能识别人的标签。原始投稿不对公众开放。个人对比表不自动投稿。
- 固定分组：公开公司、岗位、城市、毕业届别、学历、数据年份、计薪口径。按人去重，至少 5 位不同投稿者才释放统计组；搜索仅过滤已聚合固定组，不对原始记录做任意筛选。每项指标不足 5 人时也不披露。
- 样本数量只显示 5 人区间；基本工资四分位及年度结构金额按千元取整，日薪按 50 元取整。没有公开逐条明细、最小最大值、精确投稿时间或投稿者标识。年份、日薪/月薪/年薪不混用。
- 金额单位为人民币税前；固定年薪 = 月基本工资 × 固定月数，或直接填写的年基本工资；年度总包 = 固定年薪 + 年度奖金 + 年度股票归属估值 + 年度补贴。未知与 0 不同；任一结构项未知则不计算该记录总包。日薪不推算年包。股票估值和奖金不保证兑现。各结构项中位数不相加冒充总包中位数。
- 同一用户、公司、岗位、城市、届别、学历、年份、口径禁止重复投稿；后台提示同待遇的相似投稿和金额异常，人工核验，不自动删除极值。后台列表为最近 200 条，日志与举报为最近 100 条。
- 每人最多保留 100 条投稿、100 个个人 Offer，每天最多 100 条举报，数据库触发器和事务锁限制绕过 API 的写入。
- 修改已审核投稿立即退回待审核、撤销公开字段；版本号阻止覆盖并发更新。删除、个人数据清理、注销会从后续聚合中移除，账号删除同时级联清理。审计日志保留操作说明，禁止写身份信息。

## 验收

本地数据库和应用运行后：`npm run test:salary`。覆盖真实 RLS / 跨账号访问、CSRF、状态注入、重复、审核角色、4 人隐藏 / 5 人展示、投稿修改撤回、个人对比数据隔离、举报与个人数据清理；`tests/salary.e2e.ts` 检查查询空态、登录、个人 Offer 编辑比较删除、匿名投稿和移动布局。

其他回归：`npm run typecheck`、`npm test`、`npm run build`、`npm run test:integration`。浏览器请先 `npm run build && npm start`，避免 Next 开发浮层拦截移动导航。运行 `npx playwright test tests/salary.e2e.ts`。测试使用明确命名的临时本地账号及数据并清理；不是用户真实投稿或外部来源。
