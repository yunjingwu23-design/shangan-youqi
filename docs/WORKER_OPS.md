# 录音转写 Worker 运维手册

> 本文件说明「上岸有期」录音转写功能的运维事项：本地常驻 Worker、腾讯云密钥轮换、对外开放权限收敛。

---

## 一、本地常驻运行 Worker（已配好）

录音转写/复盘的异步处理由 `scripts/interview-worker.ts` 完成，它是无 HTTP 入口的后台进程，通过轮询 Supabase 领取任务。

### 前置条件

- Node 24.x（项目已在用）
- **FFmpeg**（含 `ffmpeg` + `ffprobe`）：已通过 WinGet 安装，系统 PATH 已加入：
  `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_...\ffmpeg-9.0.2-full_build\bin`

### 启动方式

双击项目根目录的 **`启动-录音转写Worker.bat`**，它会：

1. 自动加载 `.env.local` 里的 Supabase / DeepSeek / 腾讯云配置；
2. 把 FFmpeg bin 目录加入 PATH；
3. 常驻运行 Worker，按 Ctrl+C 停止。

> 命令行等效：`npm run worker:interviews`（不加 `--once` 即常驻；加 `--once` 跑一轮就退出，用于测试）。

### 验证是否就绪

- 数据库层已就绪：`interview_worker` 函数、17 张表、`interview-audio` 存储桶均已在线上执行。
- Worker 启动后**静默轮询**（无排队任务时无任何输出）即正常；报 `QUEUE_UNAVAILABLE` 说明数据库函数缺失，需重跑迁移。

---

## 二、轮换腾讯云 SecretKey（截图已泄露）

之前腾讯云 SecretKey 在截图里暴露过，建议立即轮换。

### 操作步骤

1. 登录 [腾讯云访问管理控制台](https://console.cloud.tencent.com/cam/capi)。
2. 在「API 密钥管理」找到当前正在用的那个密钥（SecretId 以 `AKIDOz...` 开头）。
3. 点该密钥右侧的 **「禁用」** → 确认。旧密钥立即失效，Worker 会因鉴权失败报错（属预期）。
4. 点 **「新建密钥」**，生成一组新的 SecretId + SecretKey。
5. 把新密钥填回项目的 `.env.local`：
   ```
   TENCENT_SECRET_ID=新SecretId
   TENCENT_SECRET_KEY=新SecretKey
   ```
6. 重启 Worker（双击 `启动-录音转写Worker.bat`）。

> 密钥只存在 `.env.local`（已被 git 忽略，未进仓库）。代码和文档中无硬编码密钥，泄露范围仅限那张截图。

---

## 三、对外开放前的权限收敛（子账号最小权限）

如果要开放给更多用户使用，不要用主账号的 API 密钥，改用**子账号 + 最小权限**，只授语音识别所需权限，避免误操作影响其他云资源。

### 操作步骤

1. 登录 [访问管理 - 用户](https://console.cloud.tencent.com/cam)，新建一个**子用户**，仅勾选「编程访问」（不勾选控制台登录）。
2. 为该子用户创建**自定义策略**，只允许调用一句话识别接口，JSON 如下：
   ```json
   {
     "version": "2.0",
     "statement": [
       {
         "effect": "allow",
         "action": ["asr:SentenceRecognition"],
         "resource": "*"
       }
     ]
   }
   ```
3. 把该策略绑定给这个子用户。
4. 在「API 密钥管理」里为这个子用户生成 SecretId/SecretKey，填入 `.env.local` 替换主账号密钥。
5. 这样即使密钥再泄露，攻击者也只能调用一句话识别，无法操作你的其他云资源。

> 一句话识别接口对应的 action 是 `asr:SentenceRecognition`；如需同时用录音文件识别（极长音频）再加 `asr:CreateRecTask`。当前项目只用 `SentenceRecognition`。
