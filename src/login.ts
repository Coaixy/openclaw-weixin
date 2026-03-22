// ═══════════════════════════════════════════════════════════════════════════════
//  二维码渲染 & 扫码登录
// ═══════════════════════════════════════════════════════════════════════════════

import fs from "fs";
import { spawnSync } from "child_process";
import { join } from "path";
import { tmpdir } from "os";

import { apiGet } from "./api.js";
import { DEFAULT_BASE_URL, BOT_TYPE, TOKEN_FILE, IMGCAT } from "./config.js";
import type { TokenData, QrCodeResponse, QrCodeStatusResponse } from "./types.js";

// ─── 二维码渲染 ──────────────────────────────────────────────────────────────

/** 渲染二维码：iTerm2 内联图片优先 → ASCII art → 纯 URL 降级 */
async function renderQR(url: string): Promise<void> {
  // 优先：iTerm2 内联图片
  try {
    const { default: QRCode } = await import("qrcode");
    const tmp = join(tmpdir(), `weixin-qr-${Date.now()}.png`);
    await QRCode.toFile(tmp, url, { width: 360, margin: 2 });

    const result = spawnSync(IMGCAT, [tmp], { stdio: ["ignore", "inherit", "ignore"] });
    fs.unlinkSync(tmp);

    if (result.status !== 0) throw new Error("imgcat failed");
    console.log();
    return;
  } catch {}

  // 降级：ASCII art
  try {
    const { default: qrterm } = await import("qrcode-terminal");
    await new Promise<void>((resolve) => {
      qrterm.generate(url, { small: true }, (qr: string) => { console.log(qr); resolve(); });
    });
    return;
  } catch {}

  // 最终降级：打印 URL
  console.log("  二维码 URL:", url, "\n");
}

// ─── 登录流程 ────────────────────────────────────────────────────────────────

export async function login(): Promise<TokenData> {
  console.log("\n🔐 开始微信扫码登录...\n");

  const qrResp = await apiGet<QrCodeResponse>(
    DEFAULT_BASE_URL,
    `ilink/bot/get_bot_qrcode?bot_type=${BOT_TYPE}`,
  );
  let currentQrcode    = qrResp.qrcode;
  let currentQrcodeUrl = qrResp.qrcode_img_content;

  console.log("📱 请用微信扫描以下二维码：\n");
  await renderQR(currentQrcodeUrl);

  console.log("⏳ 等待扫码...");
  const deadline     = Date.now() + 5 * 60_000;
  let   refreshCount = 0;

  while (Date.now() < deadline) {
    const statusResp = await apiGet<QrCodeStatusResponse>(
      DEFAULT_BASE_URL,
      `ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(currentQrcode)}`,
    );

    switch (statusResp.status) {
      case "wait":
        process.stdout.write(".");
        break;

      case "scaned":
        process.stdout.write("\n👀 已扫码，请在微信端确认...\n");
        break;

      case "expired": {
        if (++refreshCount > 3) throw new Error("二维码多次过期，请重新运行");
        console.log(`\n⏳ 二维码过期，刷新中 (${refreshCount}/3)...`);
        const newQr = await apiGet<QrCodeResponse>(
          DEFAULT_BASE_URL,
          `ilink/bot/get_bot_qrcode?bot_type=${BOT_TYPE}`,
        );
        currentQrcode    = newQr.qrcode;
        currentQrcodeUrl = newQr.qrcode_img_content;
        console.log("  新二维码 URL:", currentQrcodeUrl);
        break;
      }

      case "confirmed": {
        console.log("\n✅ 登录成功！\n");
        const tokenData: TokenData = {
          token:     statusResp.bot_token!,
          baseUrl:   statusResp.baseurl || DEFAULT_BASE_URL,
          accountId: statusResp.ilink_bot_id!,
          userId:    statusResp.ilink_user_id!,
          savedAt:   new Date().toISOString(),
        };
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2), "utf-8");
        fs.chmodSync(TOKEN_FILE, 0o600);
        console.log(`  Bot ID  : ${tokenData.accountId}`);
        console.log(`  Base URL: ${tokenData.baseUrl}`);
        console.log(`  Token 已保存到 ${TOKEN_FILE}\n`);
        return tokenData;
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error("登录超时");
}
