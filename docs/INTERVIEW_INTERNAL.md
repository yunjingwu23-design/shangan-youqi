# 第一批核心功能：录音转写与 AI 面试复盘（内部测试）

本阶段：上传 → 异步转写 → 人工校对/标注说话人 → 确认 → 结构化报告 → 个人工作台历史记录。不包含实时语音模拟或录像。沿用已有内部 user_id，岗位关联现有 application 记录。

## 架构与边界

Next.js 接受经过邮箱认证的控制请求；录音使用一次性路径的签名上传凭证直接进入私有 interview-audio Storage。凭证不能覆盖已有对象。Vercel 不代理大文件、不在请求结束后偷偷启动后台任务。独立 Node Worker 使用 PostgreSQL 队列的租约和 SKIP LOCKED 领取任务，FFmpeg/FFprobe 验证媒体并按时间重编码分段，再调用 OpenAI。取消/租约丢失会中止本机处理，过期 Worker 不能写回结果。

转写模型正式接口名为 gpt-4o-transcribe；报告通过 Responses API、严格 JSON Schema、store:false 生成，默认 gpt-4.1-mini。所有模型输入都是不可信资料，不作为系统指令。报告证据必须引用确认版本中的有效段落及原文；证据不足列入 unknowns，不能推断录用结果或编造经历。自动说话人识别不作承诺：默认“未标注”，用户可以拆分段落并修改标签。时间是音频分段范围，不是逐词对齐。

上限：50 MiB/文件、120 分钟/录音；实际实现采用较保守的每段 2 分钟（最长录音 60 段），转码为单声道 16kHz/64kbps MP3，再次检查小于 24 MiB。拒绝无音轨、未知容器、播放列表、非法时长和外部协议。上传完成后核实对象大小，Worker 再核实真实文件签名和时长，不能相信客户端元数据。分段边界和听不清处仍需人工校对。

## API 与页面

GET/POST /api/interviews：历史列表、创建录音上传记录（岗位 ID、轮次、授权、可选且单独授权的 JD/简历文本）。

GET/DELETE /api/interviews/[id]：本人详情/删除。

POST /api/interviews/[id]/upload：签发限定路径上传凭证。

POST /api/interviews/[id]/transcribe：校验上传并排队。

PUT /api/interviews/[id]/transcript：保存校对版本，使用版本号防止覆盖。

POST/PUT /api/interviews/[id]/report：确认逐字稿并生成/重新生成；保存人工编辑报告。

DELETE /api/interviews/[id]/report：删除此面试全部报告版本，保留录音和逐字稿。

GET /api/interviews/[id]/audio：核对所有权后签发 5 分钟播放链接。

POST /api/interviews/[id]/cancel、retry：取消/重试。

GET /api/interviews/usage：本人月额度、调用估算费用。

页面：/workspace/interviews（历史）、/new（上传）、/[id]/progress（进度）、/[id]/transcript（校对）、/[id]/report（报告）。

## 数据与权限

public.interviews 保存内部用户 ID、岗位 ID/快照、轮次、录音路径和授权时间；interview_transcripts 保存不可变的逐字稿版本；interview_reports 保存生成/人工编辑版本与来源版本；interview_tasks 保存任务状态/租约/进度。四表启用 RLS，仅本人可读，状态变更通过校验所有权的事务函数。普通账号不能直接修改任务、用量或上传路径。

private.interview_chunks 保存完成分段的检查点；interview_usage、interview_limits、interview_calls 保存每用户额度与成本账本。开始每次付费调用前原子扣预算，失败或网络中断的调用保守计入估算，避免崩溃重试无限消费；成功后按时长/token 更新。默认每月 20 次上传、300 分钟调用音频、US$5 预算，可通过管理员 SQL 按用户调整。

文件和记录删除需一起处理；签名上传凭证默认最长两小时。删除先移除数据库访问并将音频替换为空的占位对象，阻止旧的非覆盖上传凭证重新写入，也让旧播放链接拿不到原始音频。独立清理账本在三小时宽限期后移除占位对象；Storage 暂不可用时会重试。注销/清空个人数据同样触发此机制。清理需要 Worker 常驻。OpenAI 接收授权后的音频/文本，供应商侧保留政策由项目所适用的 OpenAI 数据条款决定，应用不能承诺删除供应商已处理的数据。

## 服务端配置

保留现有 Supabase URL、公开 key、服务端 key、APP_URL；新增 INTERVIEWS_ENABLED=true 后内部页面才开放。数据库迁移与私有 Storage 必须先准备好。

Worker：OPENAI_API_KEY、OPENAI_TRANSCRIBE_MODEL（默认 gpt-4o-transcribe）、OPENAI_REVIEW_MODEL（默认 gpt-4.1-mini）、Supabase URL 和服务端 key；FFmpeg/FFprobe 必须安装。价格环境变量用于估算成本，修改时需依据实际账户价格。Worker 单独运行，不适合 Vercel 普通函数或浏览器后台。

## 预算与验收

预算参考（非实时价格保证）：转写 US$0.006/分钟；gpt-4.1-mini 输入/输出 US$0.40/US$1.60 每百万 token。60 分钟录音 + 2 万输入/4 千输出 token 约 US$0.3744；120 分钟约 US$0.74。额外重试、重新生成、Storage、下载流量、Worker 主机另计。账本是可审计估算，最终账单以供应商为准。

用户当前没有 OpenAI Key。不得将契约替身测试写成真实 OpenAI 验收；上线前仍需真实录音、真实模型与费用核对。内部测试须覆盖跨用户 REST/Storage 隔离、音频分段、取消、重试、租约过期、预算并发扣减、逐字稿版本与证据引用、数据删除。

## 本地启动和独立部署

本地需 Node.js 24、Docker、FFmpeg/FFprobe。先 `npm ci && npm run db:start`；本地引导包括官方 Storage API、Storage 默认角色权限、只允许 localhost:3000 的 CORS 和按文件名记录的迁移账本。现有账号和记录保留，不 reset 数据库。

```bash
# 终端一：内部页面（配置始终留在服务端）
INTERVIEWS_ENABLED=true npm run dev
# 终端二：设置好服务端 OPENAI_API_KEY 后运行 Worker
npm run worker:interviews
# 无 OpenAI Key 时 Worker 只清理文件，不伪造转写或报告
```

正式项目已有账号迁移时，只依次应用 `202610310001_interviews.sql`、`202610310002_interview_storage.sql`。不要重新运行旧账号迁移或数据库 reset。Storage 的 bucket 必须为私有、项目文件上限至少容纳 50 MiB；较低的项目级上限仍会拒绝文件。Web 的 CSP 仅允许当前 Supabase origin 的直传和音频播放。

Vercel 配置 `INTERVIEWS_ENABLED=true` 并重新部署后开放入口；先保持 false，直到数据库、Worker、Key 和真实模型验收完成。页面使用 `/workspace/interviews`。只给 Vercel 添加 OpenAI Key 不会启动 Worker。

Worker 可在支持常驻 Node/Docker 与 FFmpeg 的服务器运行：使用 `infra/worker.Dockerfile` 构建，运行时通过平台 Secret/环境文件注入 Supabase URL、服务端 key 和 OpenAI Key，设置自动重启、CPU/内存限制。不要把密钥写进镜像或 Git；不要对外开放 Worker 监听端口（它不提供 HTTP 入口）。Worker 独立于 Vercel，实例重启后可恢复已完成的音频分段。

默认租约 90 秒、每 15 秒续租；供应商请求超时 180 秒、下载超时 5 分钟、单次 Worker 处理超时 30 分钟。供应商 429/5xx 或临时存储错误自动重试，最多 3 次，退避 30/60 秒；其他错误供用户查看并手动重试。已发出的外部请求无法保证撤回或不计费，记录为 started 的费用会保守保留估算，不能当作供应商确已成功扣款。

申请 API Key：<https://platform.openai.com/api-keys>。参考模型/报价：<https://platform.openai.com/docs/models/gpt-4o-transcribe>、<https://platform.openai.com/docs/models/gpt-4.1-mini>、<https://openai.com/api/pricing/>。本环境未实时核实该账户的可用模型、地区和价格。

## 用量调整与监控

管理员可在 Supabase SQL Editor 查看当前用户的月用量（不含已注销账号，已注销账号的个人账本会被级联删除）：

```sql
select u.user_id,u.period,u.uploads,u.audio_seconds/60 as audio_minutes,
  u.estimated_usd,u.input_tokens,u.output_tokens,l.monthly_usd,l.monthly_uploads
from private.interview_usage u join private.interview_limits l using(user_id)
order by u.period desc,u.estimated_usd desc;

select model,status,count(*) as requests,sum(estimated_usd) as estimated_usd
from private.interview_calls group by model,status;
```

按用户调整 `private.interview_limits` 的 monthly_usd、monthly_audio_seconds、monthly_uploads；只允许管理员 SQL/可信后台修改，浏览器没有写权限。不要直接改用量数值来回避限流或预算。与 OpenAI 账单核对时，注意计费单位/模型、网络失败、重试以及个人数据删除造成的账本范围变化。

## 重跑与真实模型验收

```bash
npm run typecheck
npm test
npm run test:interviews
INTERVIEWS_ENABLED=true npm run test:e2e
npm run test:integration
npm run build
```

面试集成测试使用真实本地 Auth、PostgreSQL、Storage、FFmpeg 和 HTTP 模型契约替身；浏览器流程使用明确命名的模型替身。测试不能访问托管数据库，未调用 OpenAI，不验证实际语音识别率或语义分析质量。

面试专项测试与浏览器测试共用本地全局任务队列，必须串行运行；测试期间不要另外启动消费同一队列的 Worker。不能让不同的模型替身抢到彼此任务后把结果当作通过。

有 Key 后：选一份已获授权、无敏感信息的短录音，验证真实转写及中文/说话人校对；确认后生成报告，逐条核对证据、无法确定项和岗位关联；检查账本与供应商用量；再用长录音验证分段衔接、取消/重试、另一账号隔离和删除。先小额测试，不把合成音频的替身报告当成质量验收。
