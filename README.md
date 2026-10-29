# 上岸有期 · Shang An You Qi

大学生一站式求职平台的可运行首版：发现岗位 → 阅读完整 JD → 加入横向工作台 → 编辑进度与下一步。

**当前为交互样品，不是已经上线的招聘服务。** 岗位与导师均为演示；工作台、收藏、资料、文字复盘及预约意向在当前浏览器 localStorage 保存，简历版本在 IndexedDB 保存，没有真实账号、云端同步或管理员写入能力。

## 运行

需要 Node.js 20.9+（当前验证 24.19.0）与 npm。

```bash
cd /workspace/shangan-youqi
npm ci
npm run dev
```

开发服务监听 3000 端口。浏览器打开本机对应的 3000 端口；云端访问方式取决于环境提供的端口访问能力。

生产运行：

```bash
npm run build
npm start
```

本环境 Turbopack 的 PostCSS 进程通信曾出现 EPERM；已使用官方支持的 Webpack 模式，并完成生产构建。无需关闭 TLS、修改校验或降低类型检查要求。不要同时在同一构建目录运行 build 和 dev。

## 已实现

- 官方 Logo 原样引用；响应式首页、导航、Footer 与品牌设计系统。
- 四类岗位切换，城市/行业/届别筛选、搜索、排序与分页。
- 岗位详情统一包含 JD、出勤要求、条件性留用原文、邮箱、标题要求、来源和核验状态。
- 全站模糊/精准搜索、公司别名和岗位词典、分类结果、空态；词典维护于 `src/lib/data.ts`。
- 本地收藏；岗位加入工作台并防止重复；外链跳转不会自动标记投递成功。
- 默认横向表格、冻结公司/岗位两列、行内编辑、日期、新增/复制/确认删除、搜索/筛选/排序。
- 自定义状态新增/改名/调色/删除，删除时迁移关联记录；名称、主题、内置或本地上传封面、列显隐、CSV 导出。
- 辅助看板与时间线预览，同一份本地数据源。
- 微信未开通页面和关闭的 API/回调预留；不生成伪二维码。
- 个人资料、头像与本地数据清除；原创面试准备示例；文字复盘保存与删除。
- 虚构导师筛选与本地预约意向流程；招聘时间线。
- 智能简历：真实 DOCX/文字型 PDF 导入、可校对模块、左右编辑/A4 分页预览、字体间距、IndexedDB 私密版本及 Chromium 文字型 PDF 导出。
- 雷达、商城明确开发中；后台展示流程与安全登录待配置状态。

## 功能边界

- 微信开放平台正式登录、Supabase Auth/数据库、跨设备同步、服务端开发认证、用户隔离验证与后台 CRUD 属后续阶段；当前不以昵称或浏览器存储冒充真实认证。
- 管理 API 尚未创建，不能用前端开关提升管理员权限。微信发起接口返回 HTTP 503，未处理 callback code。
- AI 分析、音频、提醒、真实导师服务、第三方采集及支付未接入。简历编辑和导出已实现，细节与安全边界见 [简历工具说明](docs/RESUME.md)。
- 头像/封面仅本地预览并限制图片格式和大小；简历可上传 DOCX/文字型 PDF 做服务端临时处理，版本保存在 IndexedDB。真实账号私有存储尚未接入，共享设备请使用后删除。
- 多工作台、任意自定义字段、列重排/拖动宽度、CSV 导入尚待迭代。辅助日历目前是日期时间线，不是完整月历。
- 投递邮箱全部使用 `example.com`；官网链接用于自行核验，不代表示例岗位获得官方确认。
- 浏览器空间不足或禁用存储时显示失败提示；本地存储不具备备份保障，清除浏览器数据会丢失内容。

## 架构与交付物

- [系统架构、完整路由、核心数据关系、UI 组件与 Sprint 0–2 清单](docs/ARCHITECTURE.md)
- [原始 PRD](docs/PRD.md) / [原始交互原型](docs/prototype.html)
- `public/logo.png`：交付包原始官方 Logo。
- `src/app`：App Router 页面与微信关闭接口。
- `src/components`：Shell、UI Button、岗位、工作台与其他模块。
- `src/lib/data.ts`：明确标注的演示 seed 与词典。
- `supabase/migrations/0001_foundation.sql`：核心实体、完整性约束、基础 RLS 与审计触发器。
- `.env.example`：后续服务端接入变量说明；当前不需要任何密钥。

数据库迁移**未在真实 Supabase 执行或验收**。后续接入前阅读 [数据库说明](supabase/README.md)，运行两账号越权测试与管理员发布/审计测试。账号隐私隔离不能用本地演示测试替代。

## 测试

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

E2E 默认使用 `/usr/bin/chromium`；其他环境设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指向已安装的 Chromium，或用 `npx playwright install chromium` 后让配置使用 Playwright 浏览器。测试会启动开发服务，若 3000 端口已有本站服务则复用。可先 `npm start` 对生产构建测试。

本次验证：TypeScript 通过；生产构建通过（30 个静态生成页面）；17/17 规则测试通过；10/10 Chromium 端到端测试通过，包含 390px 手机视口的 16 个主要页面。数据库迁移、真实身份认证与云端隔离未执行验收。

页面截图： [桌面首页](docs/screenshots/home-desktop.png)、[手机首页](docs/screenshots/home-mobile.png)、[桌面工作台](docs/screenshots/workspace-desktop.png)。

测试覆盖公司别名/同义词和精准模式、留用证据、工作台默认投递状态、状态删除迁移、四分类、JD 邮箱、加入防重、增删改与刷新保存、状态颜色、主题、移动导航、16 页面无溢出、微信关闭状态及 404、收藏多卡片同步与弹窗 Escape。

手工检查建议：在桌面横向滚动工作台并编辑冻结列；在手机展开导航、查看 JD 并编辑表格；禁用存储验证失败提示；下载 CSV 检查中文与备注；清除本地数据检查隐私流程。

正式发布前：完成真实认证、数据库权限、可信岗位运营、私有文件策略与目标市场适用的隐私/招聘信息服务/版权核查。本轮没有部署到公网或接入真实业务服务。

## 先在线看样品（Vercel Preview）

当前云环境没有外部端口预览能力。项目已配置 `vercel.json`、Node.js 24.x 和 CLI 上传排除规则；不需要环境变量。

下载源码并在自己的电脑进入项目目录，执行 `npx vercel@latest login` 后运行 `npx vercel@latest deploy`（不要加 `--prod`）。完成后以 CLI 输出的实际 HTTPS Preview URL 为准。

完整步骤、访问保护与 GitHub 导入注意事项见 [Vercel 预览部署指南](docs/DEPLOYMENT.md)。本项目目前未由代理部署到公网。

GitHub 初版源码分支：`preview/initial`。请使用此分支下载源码或部署；不要误选仅含初始 README 的旧分支。

## 简历工具提前交付

直接打开 `/resume`。支持最大 3MB DOCX / 文字型 PDF，PDF 最多 12 页；自动识别模块后可校对，支持多版本、实时 A4 分页和文字型 PDF 导出。当前无真实账号，版本仅私密保存在当前浏览器；文件经服务器临时解析/导出，不保存原文件。

本地默认使用 `/usr/bin/chromium`；可设置 `RESUME_CHROMIUM_EXECUTABLE_PATH`。Vercel 自动采用随依赖打包的 serverless Chromium，不需要填本机浏览器路径。中文字体与开放许可证随项目提供，运行时不向第三方发送简历文字。

验证命令与版式样本、安全边界见 [docs/RESUME.md](docs/RESUME.md)。
