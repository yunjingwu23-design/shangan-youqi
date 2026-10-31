# 求职工作台：11 个投递阶段

新增投递与编辑状态统一按以下顺序显示，工作台表格和首页「近期求职事项」使用同一套标签：

| 状态     | 数据库存储值   |
| -------- | -------------- |
| 未投递   | `planned`      |
| 已投递   | `applied`      |
| 测评     | `assessment`   |
| AI 面    | `ai_interview` |
| 一面     | `interview_1`  |
| 二面     | `interview_2`  |
| 三面     | `interview_3`  |
| 四面     | `interview_4`  |
| 五面     | `interview_5`  |
| 口头 OC  | `oral_oc`      |
| 已 Offer | `offer`        |

状态真实写入已有 `workspace_entries.status` 列，继续关联原内部 `user_id` 并执行原 RLS。更新状态只修改指定字段，保留岗位 ID、公司、标题、备注和链接；刷新及另一设备登录后读取相同状态。口头 OC 与正式 Offer 分开记录。

旧记录的 `planned`、`applied`、`offer` 存储值不变，只调整展示名称。`interview` 保留并显示「面试中（未细分）」，不自动猜测轮次；`closed` 仍显示「已结束」。编辑这两类历史记录时额外保留当前旧选项，用户可只改备注，也可按实际进度选择新阶段。新建投递默认仅提供上述 11 项。

## 正式环境启用

本次没有新增环境变量。现有工作台数据库需要执行一份独立、可重复运行的状态约束迁移，与后台角色或 JD 表无依赖。

1. 打开 [完整状态迁移 SQL](https://github.com/yunjingwu23-design/shangan-youqi/blob/main/supabase/migrations/202610310006_workspace_stages.sql)，用 Copy raw file 复制全部代码。
2. 在 [目标项目 SQL Editor](https://supabase.com/dashboard/project/lxecahdyvrdfezgtmbfp/sql/new) 新建查询，以 `postgres` 执行整份代码。
3. 最后结果 `workspace_stages_ok` 应为 `true`。确认 Vercel 已部署对应代码后，刷新 [求职工作台](https://shangan-youqi.vercel.app/workspace)，编辑一条投递即可选用新阶段。

迁移只放宽状态白名单，不更新或删除任何业务记录，也不修改原 RLS；单个 DO 块中的约束变更失败时会回滚。保留老状态以兼容历史记录和旧客户端。若数据库尚未升级，旧状态仍可保存，新阶段返回可理解的升级提示。

新的 [后台合并安装脚本](../supabase/install-admin.sql) 同时包含这项状态升级；已经完成后台安装的项目只需执行上述独立状态迁移。无需重装后台或重新初始化管理员。仍需项目所有者在托管项目执行 SQL，本地测试不代表线上已应用。

## 验证

```bash
npm run db:start
npm run build
npm start
# 另一终端：
npm run test:workspace-stages
npx playwright test tests/workspace-stages.e2e.ts tests/auth.e2e.ts tests/site.e2e.ts
```

测试仅允许本地 Supabase：验证全部 11 个状态的创建、更新、实际 PostgreSQL 存储与另一设备会话读取；另一用户不能改写，未知阶段被拒绝；历史记录及重复迁移前后的记录快照相同。浏览器逐一选择、保存、刷新所有阶段，检查原备注、旧状态、手机导航和首页同步。实际执行结果追加在 [TESTING.md](TESTING.md)。
