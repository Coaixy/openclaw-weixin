import "dotenv/config";
import { createBot } from "./src/index.js";

const bot = createBot();

// 文本消息
bot.on("text", async (ctx) => {
  // TODO: 接入你的 AI 后端
  await ctx.reply(`收到: ${ctx.text}`);
});

// 其他类型消息（图片、语音、文件、视频）兜底
bot.on("message", async (ctx) => {
  await ctx.reply(`暂不支持 ${ctx.type} 类型消息`);
});

bot.start();
