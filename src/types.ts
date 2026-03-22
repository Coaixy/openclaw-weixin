// ═══════════════════════════════════════════════════════════════════════════════
//  微信 iLink Bot API 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/** 本地持久化的登录凭证 */
export interface TokenData {
  token:     string;
  baseUrl:   string;
  accountId: string;
  userId:    string;
  savedAt:   string;
}

/** 消息内容项类型 */
export const enum MessageItemType {
  TEXT  = 1,
  IMAGE = 2,
  VOICE = 3,
  FILE  = 4,
  VIDEO = 5,
}

/** 消息类型 */
export const enum MessageType {
  USER = 1,
  BOT  = 2,
}

/** 消息状态 */
export const enum MessageState {
  NEW        = 0,
  GENERATING = 1,
  FINISH     = 2,
}

/** 单条消息内容项 */
export interface MessageItem {
  type:        MessageItemType;
  text_item?:  { text: string };
  image_item?: { media?: { encrypt_query_param?: string; aes_key?: string } };
  voice_item?: { text?: string; media?: { encrypt_query_param?: string; aes_key?: string } };
  file_item?:  { file_name?: string; media?: { encrypt_query_param?: string; aes_key?: string } };
  video_item?: { media?: { encrypt_query_param?: string; aes_key?: string } };
  ref_msg?:    { message_item?: MessageItem };
}

/** 微信消息 */
export interface WeixinMessage {
  seq?:            number;
  message_id?:     number;
  from_user_id?:   string;
  to_user_id?:     string;
  create_time_ms?: number;
  session_id?:     string;
  message_type?:   MessageType;
  message_state?:  MessageState;
  item_list?:      MessageItem[];
  context_token?:  string;
}

/** getUpdates 响应 */
export interface GetUpdatesResponse {
  ret:                    number;
  errcode?:               number;
  errmsg?:                string;
  msgs:                   WeixinMessage[];
  get_updates_buf:        string;
  longpolling_timeout_ms?: number;
}

/** 二维码接口响应 */
export interface QrCodeResponse {
  qrcode:            string;
  qrcode_img_content: string;
}

/** 扫码状态响应 */
export interface QrCodeStatusResponse {
  status:         "wait" | "scaned" | "expired" | "confirmed";
  bot_token?:     string;
  baseurl?:       string;
  ilink_bot_id?:  string;
  ilink_user_id?: string;
}
