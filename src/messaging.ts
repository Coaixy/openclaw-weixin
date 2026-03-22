// ═══════════════════════════════════════════════════════════════════════════════
//  消息解析
// ═══════════════════════════════════════════════════════════════════════════════

import { MessageItemType } from "./types.js";
import type { WeixinMessage } from "./types.js";

/** 从消息 item_list 提取纯文本 */
export function extractText(msg: WeixinMessage): string {
  for (const item of msg.item_list ?? []) {
    if (item.type === MessageItemType.TEXT  && item.text_item?.text)  return item.text_item.text;
    if (item.type === MessageItemType.VOICE && item.voice_item?.text) return `[语音] ${item.voice_item.text}`;
    if (item.type === MessageItemType.IMAGE)                          return "[图片]";
    if (item.type === MessageItemType.FILE)                           return `[文件] ${item.file_item?.file_name ?? ""}`;
    if (item.type === MessageItemType.VIDEO)                          return "[视频]";
  }
  return "[空消息]";
}
