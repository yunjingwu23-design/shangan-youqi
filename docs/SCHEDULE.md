# 个人日程与提醒（`/workspace/schedule`）

把投递截止、笔试、面试、复盘排进同一张日历。全部数据属于当前账号，仅本人可见。

## 功能

| 能力 | 说明 |
| --- | --- |
| 月历 / 列表双视图 | 月历按周一起始渲染 6×7 网格；列表按时间正序，未完成的排在前面 |
| 六种日程类型 | 投递截止、笔试 / 测评、面试、复盘、跟进 / 沟通、其他，类型带颜色区分，可筛选 |
| 时间与时长 | 精确到分钟，可选 30 分钟 – 3 小时（不填则不占时段） |
| 关联工作台岗位 | 选择后自动带出公司与岗位，并在列表中给出「查看对应的投递记录」入口 |
| 站内提醒 | 每条日程可设「当天 / 提前 1–7 天」提醒；进入提醒窗口后页面顶部出现提醒条，不会发短信或邮件 |
| 完成与删除 | 一键标记完成 / 恢复待办，删除需二次确认 |
| 概览 | 待办、今天、提醒期内、已完成四项计数 |

## 数据库

表 `public.schedule_events`，迁移文件 `supabase/migrations/202611110001_schedule_events.sql`。
根目录的 `执行-日程提醒迁移.sql` 是同一份脚本，可直接整段粘贴到 Supabase → SQL Editor 运行（可重复执行）。

- 行级权限：四条策略全部基于 `private.current_user_id()`，只有本人能读写自己的日程
- 外键 `(job_entry_id, user_id) → workspace_entries(id, user_id)`：只能关联到自己工作台里的岗位，删除投递记录时日程保留、关联置空
- `public.delete_my_personal_data()` 同步清理 `schedule_events`，注销即清空

表未创建时，页面不会报错，而是显示「需要一次初始化」卡片并给出三步操作指引；`GET /api/schedule` 返回 `{ events: [], setupRequired: true }`。

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/schedule` | 返回本人全部日程（按开始时间升序，上限 500 条） |
| POST | `/api/schedule` | 新建，校验见 `lib/validation.ts` 的 `scheduleEventSchema` |
| PATCH | `/api/schedule/[id]` | 局部更新（`schedulePatchSchema` 全部字段可选，无默认值，避免误清空） |
| DELETE | `/api/schedule/[id]` | 删除 |

所有写操作走 `sameOrigin` 校验，错误统一由 `lib/api.ts` 的 `api()` 包装；表缺失 / 外键失效 / 约束冲突在 `lib/schedule-server.ts` 里分别给出可读提示。

## 已知边界

- 提醒是「打开网站时看到」，没有邮件、短信、Web Push；设计上如此，页面对用户明示
- 月历视图在 560px 以下只显示颜色点，手机端默认切到列表视图
- 单账号上限 500 条日程
