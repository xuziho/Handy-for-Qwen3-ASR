# Handy

这是我基于上游项目 [cjpais/Handy](https://github.com/cjpais/Handy) 做的一个中文使用场景定制版本。

它仍然是一个本地离线语音转文字桌面应用，核心能力是：

- 按快捷键开始录音
- 本地完成语音识别
- 将结果自动粘贴到当前输入框
- 支持术语纠错、AI 后处理、历史记录、桌面悬浮状态条

这个仓库主要保留我自己实际会用到的能力说明，不再完整复述上游 README。若你想了解原项目的完整背景、社区讨论和官方说明，请直接查看上游仓库：

- 上游项目：[https://github.com/cjpais/Handy](https://github.com/cjpais/Handy)

## 我这边新增或调整的内容

相较于上游版本，这个版本目前主要做了这些定制：

### 1. AI 后处理可参考术语纠错词典

在原有后处理链路上，新增了一个独立开关，可以控制是否把“术语纠错”里的启用规则一并作为上下文提交给 AI。

当前行为是：

- 原始转录先经过本地术语纠错
- 如果开启 AI 后处理，并且开启“附带术语纠错上下文”
- Handy 会把启用中的术语规则整理成提示词上下文，再发给 AI
- AI 返回后，再对结果重跑一次术语纠错，作为兜底

这样做的目的，是让 AI 不只是机械清理文本，还能参考你定义的“正确术语”和“常见误识别样本”来修正 ASR 错字。

### 2. 术语纠错提示模板可编辑

原本这部分提示词是写死在代码里的。现在已经改成：

- 用户可在设置里直接编辑
- 支持 `${term_corrections}` 占位符
- 可保存
- 可一键重置为默认模板

这意味着你可以按自己的模型特性去调整提示策略，而不是被固定 prompt 限死。

### 3. 支持调试查看完整 AI 后处理请求

为了排查本地模型行为，我加了一个临时调试开关。开启后可以在日志里看到完整的后处理请求内容，包括：

- provider
- model
- messages
- system prompt
- user content

这样在接 LM Studio 或其他本地 OpenAI-compatible 服务时，更容易确认到底发了什么给模型。

### 4. Custom provider 改为使用 `system + user` 结构

针对本地模型接口的兼容性，我把 `custom provider` 的后处理请求调整成：

- `system`: 后处理规则与术语上下文
- `user`: 原始转录文本

而不是把所有内容拼成一整段单条 user prompt。  
这通常会让模型更容易遵守指令，尤其是本地 chat 模型。

### 5. `language Chinese` 之类的脏标记在 AI 前清理

原本这类奇怪短语是在 AI 后处理之后再删。现在已经改成：

- 在送给 AI 之前先清理

这样可以避免模型把这些脏标记改造成新的半残文本，导致后面更难清掉。

### 6. Overlay UI 做了简化

底部黑色状态条做过一轮轻量化调整，目前更偏向低干扰风格：

- 更小巧
- 中间只保留简短英文状态
- 去掉了占空间但信息量不高的点阵显示

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
