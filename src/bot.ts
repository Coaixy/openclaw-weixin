// ═══════════════════════════════════════════════════════════════════════════════
//  Bot 框架核心
// ═══════════════════════════════════════════════════════════════════════════════

import fs from "fs";
import { join } from "path";

import { getUpdates, sendMessage } from "./api.js";
import { TOKEN_DIR } from "./config.js";
import { scanLogin } from "./login.js";
import { MessageItemType, MessageType } from "./types.js";
import type { TokenData, WeixinMessage } from "./types.js";

// ─── 类型 ────────────────────────────────────────────────────────────────────

export type EventName = "text" | "image" | "voice" | "file" | "video" | "message";

export interface MessageContext {
  /** 提取的纯文本 */
  readonly text:      string;
  /** 消息类型 */
  readonly type:      "text" | "image" | "voice" | "file" | "video";
  /** 发送者 ID */
  readonly from:      string;
  /** 接收此消息的 bot 账号 ID */
  readonly accountId: string;
  /** 原始微信消息（高级用途） */
  readonly raw:       WeixinMessage;
  /** 回复文本 */
  reply(text: string): Promise<void>;
}

export type Handler = (ctx: MessageContext) => Promise<void> | void;

// ─── 消息解析 ────────────────────────────────────────────────────────────────

function resolveType(msg: WeixinMessage): MessageContext["type"] {
  const first = msg.item_list?.[0];
  if (!first) return "text";
  switch (first.type) {
    case MessageItemType.IMAGE: return "image";
    case MessageItemType.VOICE: return "voice";
    case MessageItemType.FILE:  return "file";
    case MessageItemType.VIDEO: return "video";
    default:                    return "text";
  }
}

function extractText(msg: WeixinMessage): string {
  for (const item of msg.item_list ?? []) {
    if (item.type === MessageItemType.TEXT  && item.text_item?.text)  return item.text_item.text;
    if (item.type === MessageItemType.VOICE && item.voice_item?.text) return `[语音] ${item.voice_item.text}`;
    if (item.type === MessageItemType.IMAGE)                          return "[图片]";
    if (item.type === MessageItemType.FILE)                           return `[文件] ${item.file_item?.file_name ?? ""}`;
    if (item.type === MessageItemType.VIDEO)                          return "[视频]";
  }
  return "";
}

function createContext(msg: WeixinMessage, account: TokenData): MessageContext {
  return {
    text:      extractText(msg),
    type:      resolveType(msg),
    from:      msg.from_user_id ?? "",
    accountId: account.accountId,
    raw:       msg,
    reply:     async (text) => { await sendMessage(account.baseUrl, account.token, msg.from_user_id ?? "", text, msg.context_token); },
  };
}

// ─── Token 存储 ──────────────────────────────────────────────────────────────

function loadAccounts(): TokenData[] {
  if (!fs.existsSync(TOKEN_DIR)) return [];
  return fs.readdirSync(TOKEN_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => JSON.parse(fs.readFileSync(join(TOKEN_DIR, f), "utf-8")) as TokenData);
}

function saveAccount(data: TokenData): void {
  fs.mkdirSync(TOKEN_DIR, { recursive: true });
  const file = join(TOKEN_DIR, `${data.accountId}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  fs.chmodSync(file, 0o600);
  console.log(`  Bot ID  : ${data.accountId}`);
  console.log(`  Base URL: ${data.baseUrl}`);
  console.log(`  Token 已保存到 ${file}\n`);
}

// ─── Bot ─────────────────────────────────────────────────────────────────────

export class Bot {
  private handlers = new Map<EventName, Handler[]>();

  /** 注册事件处理器 */
  on(event: EventName, handler: Handler): this {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
    return this;
  }

  /** 扫码登录新账号 */
  async login(): Promise<TokenData> {
    const data = await scanLogin();
    saveAccount(data);
    return data;
  }

  /** 启动所有账号的消息轮询 */
  async start(): Promise<void> {
    if (process.argv.includes("--login")) {
      await this.login();
    }

    let accounts = loadAccounts();
    if (accounts.length === 0) {
      console.log("未找到已登录账号，开始扫码登录...");
      await this.login();
      accounts = loadAccounts();
    }

    console.log(`🚀 启动 ${accounts.length} 个账号（Ctrl+C 退出）\n`);
    for (const a of accounts) {
      console.log(`  📡 [${a.accountId}] 轮询中...`);
    }
    console.log();

    await Promise.all(accounts.map(a => this.poll(a)));
  }

  // ── 内部 ──

  private async poll(account: TokenData): Promise<void> {
    let buf = "";

    while (true) {
      try {
        const resp = await getUpdates(account.baseUrl, account.token, buf);
        if (resp.get_updates_buf) buf = resp.get_updates_buf;

        for (const msg of resp.msgs ?? []) {
          if (msg.message_type !== MessageType.USER) continue;
          await this.dispatch(msg, account);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("session timeout") || message.includes("-14")) {
          console.error(`❌ [${account.accountId}] Session 过期，请运行: pnpm dev:login`);
          return;
        }
        console.error(`⚠️  [${account.accountId}] ${message}，3秒后重试...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  private async dispatch(msg: WeixinMessage, account: TokenData): Promise<void> {
    const ctx = createContext(msg, account);
    const tag = `[${account.accountId.slice(0, 8)}]`;

    console.log(`📩 ${tag} ${ctx.from}: ${ctx.text.slice(0, 50) || `[${ctx.type}]`}`);

    // 有特定类型的 handler → 走特定 handler
    // 没有 → 走 "message" 兜底
    const specific = this.handlers.get(ctx.type) ?? [];
    const handlers = specific.length > 0
      ? specific
      : this.handlers.get("message") ?? [];

    for (const h of handlers) {
      try {
        await h(ctx);
      } catch (e) {
        console.error(`⚠️  ${tag} handler error:`, e);
      }
    }
  }
}

// ─── 工厂 ────────────────────────────────────────────────────────────────────

export function createBot(): Bot {
  return new Bot();
}
