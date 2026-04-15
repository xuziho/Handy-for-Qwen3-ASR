# Handy for Qwen3-ASR

这是我基于上游项目 [cjpais/Handy](https://github.com/cjpais/Handy) 做的一个中文使用场景定制版本，核心方向是增强对 **本地 Qwen3-ASR 服务** 的接入与适配。

它仍然是一个本地离线语音转文字桌面应用，核心能力是：

- 按快捷键开始录音
- 本地完成语音识别
- 将结果自动粘贴到当前输入框
- 支持术语纠错、AI 后处理、历史记录、桌面悬浮状态条

这个仓库主要保留我自己实际会用到的能力说明，不再完整复述上游 README。若你想了解原项目的完整背景、社区讨论和官方说明，请直接查看上游仓库：

- 上游项目：[https://github.com/cjpais/Handy](https://github.com/cjpais/Handy)

## 个人说明 / 免责声明

- 我本人并不是专业程序员，也不会系统性写代码
- 这个仓库中的改动、调试过程、README 说明等内容，主要都由 AI 辅助完成
- 这些修改更偏向我自己的实际使用需求，不保证适合所有人的环境或工作流
- 如果你打算继续修改这个项目，或者遇到调用/部署问题，我非常建议你先把源码和报错信息一起交给 AI 帮你阅读和排查
- 但即使有 AI 辅助，也仍然建议你自己核对关键配置、部署路径、许可证和发布内容

## 相对上游的主要改动

对照上游仓库当前代码，这个版本目前最主要的差异大致可以概括为下面几类。

### 1. 新增本地 Qwen3 ASR HTTP 调用链路

这是我这边最核心的一项改动。

相较于上游版本，这个仓库新增了基于 HTTP 的 Qwen ASR 后端支持，可以把本地部署的 Qwen3 ASR 服务接进 Handy，而不是只依赖原有的本地模型路径。

目前这部分包含：

- 新增 `qwen_http` 作为可选 ASR backend
- 新增 `qwen_base_url`
- 新增 `qwen_model_id`
- 新增对应设置项、前端配置入口和 Tauri bindings
- 新增 `transcribe_via_qwen_http(...)` 识别链路

这意味着现在可以直接把 Handy 接到你自己部署的本地 Qwen3 ASR 服务上，例如：

- 本地 OpenAI-compatible `/v1/audio/transcriptions`
- 局域网里的 Qwen ASR 服务
- 自己封装过的 ASR API

对我自己的使用场景来说，这一项比单纯换 UI 更重要，因为它直接改变了底层语音识别来源。

#### 这件事要特别注意

Handy 并不会帮你自动下载、自动启动或自动部署 Qwen3 ASR。  
如果你要使用这条链路，**Qwen3 ASR 需要你自己另外在本地或局域网中部署好**，然后把服务地址填到 Handy 里。

也就是说，Handy 在这里扮演的是“调用方”，不是 “Qwen3 ASR 一键部署器”。

#### 哪一种 Qwen3 ASR 部署方式最适配这个项目

我对照了上游 [QwenLM/Qwen3-ASR](https://github.com/QwenLM/Qwen3-ASR) 的 README 和当前 Handy 的代码实现，这个项目最适配的是：

- **把 Qwen3 ASR 部署成一个本地 HTTP API 服务**
- **最好是 `qwen-asr-serve` / vLLM backend 这一类服务化方式**

原因很简单：Handy 当前的 Qwen 接入方式不是 Python 直接 import 模型，而是通过 HTTP 发请求。

当前代码实际走的是：

- `POST {qwen_base_url}/audio/transcriptions`
- 使用 multipart 上传音频文件
- 携带 `model`、`language` 等字段

所以从适配性上看：

- **最适配**：服务化部署，能提供 OpenAI-compatible 音频转写接口的方式
- **次适配**：Docker，但前提仍然是容器里最终跑起来的是 HTTP 服务，并且把端口映射出来
- **不适配**：上游 README 里那种“Python 代码里直接 `Qwen3ASRModel.from_pretrained(...)` 调模型”的 quick inference 方式

后面这一种虽然能跑模型，但它不是 Handy 现在这条接入方式，因为 Handy 不是直接嵌进 Python 解释器里调用 Qwen3 ASR。

#### 推荐的理解方式

如果你只是想让 Handy 能稳定调用 Qwen3 ASR，我建议优先使用这种思路：

1. 自己先把 Qwen3 ASR 按服务方式部署好
2. 确认它本地可访问
3. 确认它能响应类似 `/v1/audio/transcriptions` 的请求
4. 再把 `qwen_base_url` 和 `qwen_model_id` 配到 Handy

这样和 Handy 当前实现最匹配，踩坑也最少。

#### 不建议用户误用的方式

为了避免调用不上，README 里也特别说明一下：

- 如果你只是按上游示例在 Python 脚本里直接跑推理，但**没有启动一个 HTTP 服务**
- 那么 Handy 是连不上的

因为 Handy 需要的是“可访问的 ASR 服务地址”，不是“某台机器上已经装了模型代码”这个事实本身。

### 2. 在上游现有 AI 后处理基础上，增加术语词典上下文注入

上游本身已经有 AI 后处理能力。  
这个版本不是重新发明了一套后处理，而是在上游已有链路上继续增强。

新增点主要是：

- 增加独立开关，控制是否把术语纠错规则提交给 AI
- 仅提交启用中的术语规则
- AI 返回后，再对结果重跑一次术语纠错作为兜底

当前行为是：

- 原始转录先经过本地术语纠错
- 如果开启 AI 后处理，并且开启“附带术语纠错上下文”
- Handy 会把启用中的术语规则整理成提示词上下文，再发给 AI
- AI 返回后，再对结果重跑一次术语纠错，作为兜底
这样做的目的，是让 AI 不只是机械清理文本，还能参考你定义的“正确术语”和“常见误识别样本”来修正 ASR 错字。

### 3. 术语纠错提示模板可编辑

原本这部分提示词是写死在代码里的。现在已经改成：

- 用户可在设置里直接编辑
- 支持 `${term_corrections}` 占位符
- 可保存
- 可一键重置为默认模板
这意味着你可以按自己的模型特性去调整提示策略，而不是被固定 prompt 限死。

### 4. 增加完整 AI 后处理请求调试日志

为了排查本地模型行为，我加了一个临时调试开关。开启后可以在日志里看到完整的后处理请求内容，包括：

- provider
- model
- messages
- system prompt
- user content
这样在接 LM Studio 或其他本地 OpenAI-compatible 服务时，更容易确认到底发了什么给模型。

### 5. `custom provider` 改为使用 `system + user` 结构

针对本地模型接口的兼容性，我把 `custom provider` 的后处理请求调整成：

- `system`: 后处理规则与术语上下文
- `user`: 原始转录文本
而不是像上游那样把所有内容拼成一整段单条 user prompt。  
这通常会让模型更容易遵守指令，尤其是本地 chat 模型。

### 6. `language Chinese` 之类的脏标记改为在 AI 前清理

原本这类奇怪短语是在 AI 后处理之后再删。现在已经改成：

- 在送给 AI 之前先清理
这样可以避免模型把这些脏标记改造成新的半残文本，导致后面更难清掉。

### 7. Overlay UI 做了简化

底部黑色状态条做过一轮轻量化调整，目前更偏向低干扰风格：

- 更小巧
- 中间只保留简短英文状态
- 去掉了占空间但信息量不高的点阵显示

## 一句话总结这些差异

如果只用一句话概括这个版本和上游的关系，那就是：

> 它不是完全重写的 Handy，而是一个围绕“本地 Qwen3 ASR + 中文口述场景 + 本地模型二次后处理”做了定向增强的分支版本。

## 当前项目定位

这个版本依然是一个 **本地优先、桌面优先、中文口述场景友好** 的语音输入工具。

比较适合这些使用方式：

- 日常口述输入
- 需要术语纠错的专业表达
- 用本地模型做二次润色
- 对隐私和本地部署有要求的场景

## 技术栈

- 前端：React + TypeScript + Vite + Tailwind
- 桌面壳：Tauri 2.x
- 后端：Rust
- 本地语音识别：Whisper / Parakeet / Qwen HTTP 等
- 状态管理：Zustand
- 国际化：i18next

## 开发与运行

### 安装依赖

```bash
bun install
```

### 开发模式

```bash
bun run tauri dev
```

### 前端单独运行

```bash
bun run dev
```

### 打包

```bash
bun run tauri build
```

Windows 当前默认会生成 NSIS 安装包。

## Qwen3 ASR 使用说明

如果你准备使用这个仓库里的 `qwen_http` 能力，建议把它理解成两部分：

### 第一部分：先把 Qwen3 ASR 服务部署起来

推荐优先参考上游项目：

- 上游仓库：[QwenLM/Qwen3-ASR](https://github.com/QwenLM/Qwen3-ASR)

从当前适配性来看，最推荐的是：

- `qwen-asr-serve`
- 或其他最终能暴露出 OpenAI-compatible 音频转写接口的部署方式

不推荐把上游“仅 Python 脚本内直接推理”的方式误当成 Handy 可直接接入的方案。

### 第二部分：再在 Handy 里配置

你至少需要配置：

- `ASR Backend` 选择 `qwen_http`
- `Qwen Base URL` 指向你的服务，例如 `http://127.0.0.1:8000/v1`
- `Qwen Model ID` 填写你部署服务时实际使用的模型标识

只有这两部分都成立，Handy 才能成功调用 Qwen3 ASR。

## 打包产物

当前 Windows 打包成功后，主要产物在：

- 安装包：`src-tauri/target/release/bundle/nsis/Handy_0.8.2_x64-setup.exe`
- 可执行文件：`src-tauri/target/release/handy.exe`

如果本地打包最后提示 updater 签名失败，但安装包已经生成，通常是因为没有配置 `TAURI_SIGNING_PRIVATE_KEY`。这种情况下安装包本身仍然可以正常使用。

## 上游项目说明

本仓库并不是上游官方仓库，而是基于以下项目进行修改：

- 上游仓库：[cjpais/Handy](https://github.com/cjpais/Handy)

如果你想：

- 查看原作者的完整路线图
- 关注官方发布
- 提交与上游通用能力有关的 issue / PR

建议直接去上游仓库。

## License

本仓库基于上游项目的 MIT License 分发。

- 原许可证见：[LICENSE](LICENSE)
- 上游版权归原作者所有
- 本仓库保留对原项目的来源说明，并包含我自己的定制修改
