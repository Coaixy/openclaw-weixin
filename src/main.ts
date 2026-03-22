// ═══════════════════════════════════════════════════════════════════════════════
//  微信 iLink Bot API 桥接器
//
//  用法:
//    npm start         # 首次扫码登录，收消息后自动回复
//    npm run login     # 强制重新扫码登录
//    npm run dev       # 开发模式（tsx 直接运行）
// ═══════════════════════════════════════════════════════════════════════════════

import "dotenv/config";
import fs from "fs";

import { getUpdates, sendMessage } from "./api.js";
import { TOKEN_FILE } from "./config.js";
import { login } from "./login.js";
import { extractText } from "./messaging.js";
import { generateReply } from "./ai.js";
import { MessageType } from "./types.js";
import type { TokenData } from "./types.js";

// ─── 主循环 ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const forceLogin = process.argv.includes("--login");

  // 加载或获取 token
  let session: TokenData;
  if (!forceLogin && fs.existsSync(TOKEN_FILE)) {
    session = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")) as TokenData;
    console.log(`✅ 已加载 token（Bot: ${session.accountId}，保存于 ${session.savedAt}）`);
    console.log(`   如需重新登录，运行: npm run login\n`);
  } else {
    session = await login();
  }

  const { token, baseUrl } = session;

  // 消息轮询
  console.log("🚀 开始长轮询收消息（Ctrl+C 退出）...\n");
  let getUpdatesBuf = "";

  while (true) {
    try {
      const resp = await getUpdates(baseUrl, token, getUpdatesBuf);

      if (resp.get_updates_buf) {
        getUpdatesBuf = resp.get_updates_buf;
      }

      for (const msg of resp.msgs ?? []) {
        if (msg.message_type !== MessageType.USER) continue;

        const from         = msg.from_user_id!;
        const text         = extractText(msg);
        const contextToken = msg.context_token;

        console.log(`📩 [${new Date().toLocaleTimeString()}] 收到消息`);
        console.log(`   From: ${from}`);
        console.log(`   Text: ${text}`);

        process.stdout.write("   🤔 思考中...");
        const reply = await generateReply(text);
        process.stdout.write(" 完成\n");

        await sendMessage(baseUrl, token, from, reply, contextToken);
        console.log(`   ✅ 已回复: ${reply.slice(0, 60)}${reply.length > 60 ? "…" : ""}\n`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("session timeout") || message.includes("-14")) {
        console.error("❌ Session 已过期，请重新登录: npm run login");
        process.exit(1);
      }
      console.error(`⚠️  轮询出错: ${message}，3 秒后重试...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main().catch((err: Error) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
