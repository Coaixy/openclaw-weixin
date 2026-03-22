# wechat-claude-bridge

微信 iLink Bot 框架 — 几行代码搭建微信聊天机器人。

## 快速开始

```bash
pnpm install
pnpm dev        # 首次运行会提示扫码登录
```

## 用法

编辑 `app.ts`：

```ts
import "dotenv/config";
import { createBot } from "./src/index.js";

const bot = createBot();

bot.on("text", async (ctx) => {
  await ctx.reply(`你说了: ${ctx.text}`);
});

bot.on("message", async (ctx) => {
  await ctx.reply(`暂不支持 ${ctx.type} 类型消息`);
});

bot.start();
```

## 事件类型

| 事件 | 触发条件 |
|------|----------|
| `text` | 文本消息 |
| `image` | 图片消息 |
| `voice` | 语音消息 |
| `file` | 文件消息 |
| `video` | 视频消息 |
| `message` | 兜底：没有对应类型 handler 时触发 |

## MessageContext

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `ctx.text` | `string` | 提取的纯文本 |
| `ctx.type` | `string` | 消息类型 |
| `ctx.from` | `string` | 发送者 ID |
| `ctx.accountId` | `string` | 接收消息的 bot 账号 ID |
| `ctx.raw` | `WeixinMessage` | 原始消息对象 |
| `ctx.reply(text)` | `Promise<void>` | 回复文本 |

## 多账号

```bash
pnpm dev:login   # 扫码添加新账号
```

每次扫码会在 `tokens/` 目录下创建一个账号文件。`bot.start()` 自动加载所有账号并行轮询，通过 `ctx.accountId` 区分来源。

## 命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发模式 |
| `pnpm dev:login` | 添加账号 + 启动 |
| `pnpm build` | 编译 |
| `pnpm start` | 运行编译产物 |
| `pnpm typecheck` | 类型检查 |

## 项目结构

```
app.ts              # 你的业务代码
src/
├── bot.ts          # Bot 框架核心（createBot, 事件分发, 多账号轮询）
├── context.ts      # MessageContext
├── api.ts          # HTTP 通信层
├── config.ts       # 常量配置
├── login.ts        # 扫码登录
├── types.ts        # 类型定义
└── index.ts        # 导出入口
tokens/             # 账号凭证（gitignore）
```

## License

MIT
