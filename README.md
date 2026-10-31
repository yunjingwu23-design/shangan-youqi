# 上岸有期

主站首页、岗位目录、邮箱验证码登录、私人求职工作台、简历编辑与面试准备。技术栈：Next.js 16 / React 19 / TypeScript / Supabase Auth / PostgreSQL RLS。

主站统一为「找岗位 / 我的求职 / 面试中心 / 面经资料」四个一级模块。全站导航从根布局持续显示，具体详情、编辑、录音进度与报告页也保留导航；移动端固定四项底部入口。首页展示全站搜索、四个行动入口、精选岗位与本人近期事项。原岗位录入/发布、云端简历编辑、文字面试练习和手动复盘继续复用，旧地址兼容跳转。简历现支持 PDF/DOCX 上传、原版文字编辑和原格式导出，另有三种站内模板，不再强制套用同一 A4 版式。录音转写/AI 面试复盘为独立内测功能，真实模型验收仍需 OpenAI Key。没有实时岗位爬取、AI 结构化简历解析、真人导师排期或支付。官方 Logo 原样取自用户提供的 V1.4 交付包；旧微信登录优先级以「邮箱 OTP 优先、微信即将开放」要求为准。

## 本地启动

需要 Node.js 24、npm、Docker Compose v2；面试 Worker 和测试还需要 FFmpeg/FFprobe。

```bash
cd /workspace/shangan-youqi
npm ci
npm run db:start
npm run dev
```

`db:start` 启动真实 Supabase Auth、PostgREST、Storage、轻量 PostgreSQL 17 和 Mailpit，按本地迁移账本应用 SQL，并在不存在时生成私有的 `.env.local`。不会覆盖已有配置，也不会修改任何线上项目。所有发布端口仅绑定本机回环地址；此 Docker 栈只用于开发测试，正式环境使用托管 Supabase。邮件验证码在本地 Mailpit（54324 端口）查看。

本地数据库和录音保留在 Docker volumes 中；`npm run db:stop` 只停止服务，不删除数据。再次启动会检查未应用的迁移。正式项目仍需独立执行迁移，不受本地脚本影响。

环境已经隔离，使用现有 checkout；无需新建 Git worktree。受限云终端中的网络、Docker 和 Chromium 命令需要平台允许的执行模式。

## 已实现

- 真实邮箱 OTP（兼容 6–10 位数字）：首次注册、再次登录、错误/过期/已使用验证码拒绝、重发倒计时、退出、HTTP-only Cookie 会话恢复和刷新。
- 服务端验证 Supabase 用户，再映射到独立且稳定的 `app_users.user_id`，不以邮箱或昵称作为内部 ID。
- 自动创建资料；昵称、意向岗位、城市、简介可修改并跨设备读取。
- 投递、简历文字草稿、收藏、面试文字复盘的真实新增、编辑、删除和分页读取。工作台从这些私人记录派生。
- PDF/DOCX 原件私有保存、原版预览/文字编辑、原格式导出、不可变原件下载、独立版本与删除；Word 支持整段检索、对齐/缩进/间距/日期制表位/字号微调及自动预览。三种站内模板可另建副本，支持 Word/PDF 导出。格式支持范围见简历文档。
- 所有私人数据绑定 `user_id`；服务端按当前用户过滤，同时 PostgreSQL RLS 隔离。普通业务读写不使用管理员密钥。
- 全局数据库限流、邮箱/IP 维度限制、同源校验、输入大小和字段白名单、私有响应禁止缓存。
- 删除个人数据（账号保留）及注销账号（邮箱验证后 10 分钟内，级联删除身份与业务数据）。
- 官方 Logo、响应式登录/工作台、空状态、错误态、加载态、删除确认、基础无障碍。
- 微信按钮禁用并标注「即将开放」，没有二维码、假授权或自动账号合并。
- P0 运营后台：独立角色与安全初始化/邀请、横向 JD 表格、TXT/DOCX/文字型 PDF 私有导入、草稿与版本审核、真实发布/下架/过期、来源和操作日志。编辑、审核和发布在数据库中验证权限与版本。

跨设备同步采用登录/页面加载/切换分类/返回标签页/手动刷新时从云端重新读取；当前没有实时 WebSocket 协同。面试复盘使用持久队列和独立 Worker，默认 `INTERVIEWS_ENABLED=false`；没有 OpenAI Key 时不会返回伪造的成功转写或报告。

## 配置与数据库

- [环境变量和正式 Supabase 配置](docs/CONFIGURATION.md)
- [完整数据库迁移](supabase/migrations/202610300001_auth_and_workspace.sql)
- [测试步骤与实际权限结果](docs/TESTING.md)
- [身份模型与微信后续绑定约定](docs/SECURITY.md)
- [录音转写与 AI 复盘架构、路由、成本及内部测试部署](docs/INTERVIEW_INTERNAL.md)
- [新的站点地图、新旧路由映射、导航与移动端方案](docs/INFORMATION_ARCHITECTURE.md)
- [主站重新接入、功能边界、岗位目录迁移与运营权限](docs/SITE_RECONNECTION.md)
- [简历文件上传、原版编辑、三种模板及格式限制](docs/RESUME_FILES.md)
- [P0 后台数据库、权限矩阵、页面与验收计划](docs/P0_ADMIN_PLAN.md)
- [后台迁移、首个超级管理员初始化、API 与上线步骤](docs/ADMIN_SETUP.md)
- [QQ 通道发送邀请邮件、邮箱验证后自动进入后台及模板设置](docs/ADMIN_EMAIL_INVITATIONS.md)
- [SQL Editor 合并安装/修复脚本：自动补齐岗位与后台依赖](supabase/install-admin.sql)
- [工作台 11 个投递阶段、旧状态兼容与正式数据库升级](docs/WORKSPACE_STAGES.md)

## 验证

先启动本地数据库和应用，然后运行：

```bash
npm run typecheck
npm test
npm run test:integration
npm run test:admin
npm run test:site
npm run test:resume-files
npm run test:resume-layout
npm run test:e2e
npm run build
```

集成和浏览器测试只允许本地数据库；会创建一次性测试邮箱、发送真实邮件到本地收件箱、保存真实数据并清理账号。Playwright 默认使用 `/usr/bin/chromium`，其他机器可设置 `PLAYWRIGHT_CHROMIUM_PATH` 指向 Chromium，或安装浏览器后修改其配置。

正式部署使用 HTTPS、生产 Supabase 项目和已配置的自有 SMTP。当前验证的是本地真实 Auth/数据库，尚未验证用户的托管 Supabase、生产邮件送达或线上部署。
