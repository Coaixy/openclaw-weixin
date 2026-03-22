// ═══════════════════════════════════════════════════════════════════════════════
//  AI 对话（TODO: 接入你的 AI 后端）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 根据用户消息生成 AI 回复
 *
 * 可选方案:
 *   - Claude Agent SDK:  import { query } from "@anthropic-ai/claude-agent-sdk"
 *   - Claude API:        通过 @anthropic-ai/sdk 直接调用
 *   - OpenAI 兼容接口:   任何实现了 /v1/chat/completions 的服务
 *   - 自定义后端:        调用你自己的 HTTP 服务
 */
export async function generateReply(userText: string): Promise<string> {
  // TODO: 在这里实现你的 AI 对话逻辑
  return "JCY牛逼";
}
