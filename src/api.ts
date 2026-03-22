// ═══════════════════════════════════════════════════════════════════════════════
//  HTTP 通信层 & 微信 API 封装
// ═══════════════════════════════════════════════════════════════════════════════

import crypto from "crypto";
import { CHANNEL_VERSION } from "./config.js";
import type { GetUpdatesResponse, MessageState, MessageType } from "./types.js";

// ─── 底层 HTTP ───────────────────────────────────────────────────────────────

/** X-WECHAT-UIN: 随机 uint32 → 十进制字符串 → base64 */
function randomWechatUin(): string {
  const uint32 = crypto.randomBytes(4).readUInt32BE(0);
  return Buffer.from(String(uint32), "utf-8").toString("base64");
}

function buildHeaders(token?: string, body?: unknown): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type":    "application/json",
    AuthorizationType: "ilink_bot_token",
    "X-WECHAT-UIN":   randomWechatUin(),
  };
  if (body !== undefined) {
    headers["Content-Length"] = String(Buffer.byteLength(JSON.stringify(body), "utf-8"));
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiGet<T = unknown>(baseUrl: string, path: string): Promise<T> {
  const url = `${baseUrl.replace(/\/$/, "")}/${path}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text) as T;
}

export async function apiPost<T = unknown>(
  baseUrl:   string,
  endpoint:  string,
  body:      Record<string, unknown>,
  token?:    string,
  timeoutMs = 15_000,
): Promise<T | null> {
  const url = `${baseUrl.replace(/\/$/, "")}/${endpoint}`;
  const payload = { ...body, base_info: { channel_version: CHANNEL_VERSION } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: buildHeaders(token, payload),
      body:    JSON.stringify(payload),
      signal:  controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
    return JSON.parse(text) as T;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") return null;
    throw err;
  }
}

// ─── 业务 API ────────────────────────────────────────────────────────────────

/** 长轮询获取新消息 */
export async function getUpdates(
  baseUrl: string,
  token:   string,
  buf:     string,
): Promise<GetUpdatesResponse> {
  const resp = await apiPost<GetUpdatesResponse>(
    baseUrl,
    "ilink/bot/getupdates",
    { get_updates_buf: buf || "" },
    token,
    38_000, // 服务器最多 hold 35s
  );
  return resp ?? { ret: 0, msgs: [], get_updates_buf: buf };
}

/** 发送文本消息 */
export async function sendMessage(
  baseUrl:      string,
  token:        string,
  toUserId:     string,
  text:         string,
  contextToken?: string,
): Promise<string> {
  const clientId = `bridge-${crypto.randomUUID()}`;
  await apiPost(
    baseUrl,
    "ilink/bot/sendmessage",
    {
      msg: {
        from_user_id:  "",
        to_user_id:    toUserId,
        client_id:     clientId,
        message_type:  2 as MessageType,
        message_state: 2 as MessageState,
        context_token: contextToken,
        item_list:     [{ type: 1, text_item: { text } }],
      },
    },
    token,
  );
  return clientId;
}
