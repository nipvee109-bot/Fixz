export type DiscordEventType =
  | 'ACCOUNT_PURCHASE'
  | 'FARMING_ORDER'
  | 'OUT_OF_STOCK'
  | 'TOPUP_SUCCESS'
  | 'LUCKY_BOX_WIN';

export interface DiscordEmbedPayload {
  type: DiscordEventType;
  data: Record<string, any>;
}

// Colors for Discord Embeds
const COLORS = {
  PURPLE: 0x8b5cf6, // ACCOUNT_PURCHASE
  CYAN: 0x38bdf8,   // FARMING_ORDER
  ROSE: 0xf43f5e,   // OUT_OF_STOCK
  EMERALD: 0x10b981,// TOPUP_SUCCESS
  FUCHSIA: 0xd946ef,// LUCKY_BOX_WIN
};

export async function sendDiscordEmbed({ type, data }: DiscordEmbedPayload): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    // Graceful degradation when webhook URL is not configured
    console.log(`[Discord Webhook] Skipped (${type}): DISCORD_WEBHOOK_URL not configured`);
    return false;
  }

  try {
    let embed: any = {
      timestamp: new Date().toISOString(),
      footer: {
        text: 'NEXUS STORE • Automated Notification',
        icon_url: 'https://cdn-icons-png.flaticon.com/512/808/808439.png',
      },
    };

    switch (type) {
      case 'ACCOUNT_PURCHASE':
        embed = {
          ...embed,
          title: '🎮 NEW ACCOUNT PURCHASE',
          color: COLORS.PURPLE,
          fields: [
            { name: '👤 ผู้ซื้อ (Buyer)', value: data.buyer || 'Unknown', inline: true },
            { name: '📦 สินค้า (Product)', value: data.productTitle || 'Game Account', inline: true },
            { name: '💰 ราคา (Price)', value: `${Number(data.price || 0).toFixed(2)} ฿`, inline: true },
            { name: '🆔 รหัสคำสั่งซื้อ (Order ID)', value: `\`${data.orderId || '-'}\``, inline: true },
            { name: '📊 สต็อกคงเหลือ (Remaining Stock)', value: `${data.remainingStock ?? '-'} ชิ้น`, inline: true },
            { name: '🔑 รหัสสินค้า (Product ID)', value: `\`${data.productId || '-'}\``, inline: true },
          ],
        };
        break;

      case 'FARMING_ORDER':
        embed = {
          ...embed,
          title: '⚡ NEW FARMING SERVICE ORDER',
          color: COLORS.CYAN,
          fields: [
            { name: '👤 ลูกค้า (Customer)', value: data.customer || 'Unknown', inline: true },
            { name: '🎮 บริการ (Service)', value: data.serviceTitle || 'Farming Service', inline: true },
            { name: '💰 ราคา (Price)', value: `${Number(data.price || 0).toFixed(2)} ฿`, inline: true },
            { name: '🆔 รหัสคำสั่งซื้อ (Order ID)', value: `\`${data.orderId || '-'}\``, inline: true },
            { name: '🎮 ข้อมูลในเกม / โน้ต (Game/Notes)', value: data.notes || 'ไม่มีหมายเหตุเพิ่มเติม', inline: false },
          ],
        };
        break;

      case 'OUT_OF_STOCK':
        embed = {
          ...embed,
          title: '⚠️ PRODUCT OUT OF STOCK',
          color: COLORS.ROSE,
          description: `สินค้า **${data.productTitle}** สต็อกหมดแล้ว กรุณาเติมสต็อกโดยด่วน!`,
          fields: [
            { name: '📦 สินค้า (Product)', value: data.productTitle || 'Game Account', inline: true },
            { name: '🔑 รหัสสินค้า (Product ID)', value: `\`${data.productId || '-'}\``, inline: true },
            { name: '🔴 สถานะ (Status)', value: 'OUT OF STOCK (0 ชิ้น)', inline: true },
          ],
        };
        break;

      case 'TOPUP_SUCCESS':
        embed = {
          ...embed,
          title: '💰 TOP-UP SUCCESS',
          color: COLORS.EMERALD,
          fields: [
            { name: '👤 ผู้ใช้ (User)', value: data.username || 'Unknown', inline: true },
            { name: '💵 ยอดเงิน (Amount)', value: `+${Number(data.amount || 0).toFixed(2)} ฿`, inline: true },
            { name: '💳 ช่องทาง (Channel)', value: data.channel || 'PromptPay', inline: true },
            { name: '🧾 เลขอ้างอิง (Ref No)', value: `\`${data.referenceNo || '-'}\``, inline: true },
            { name: '🆔 User ID', value: `\`${data.userId || '-'}\``, inline: true },
          ],
        };
        break;

      case 'LUCKY_BOX_WIN':
        embed = {
          ...embed,
          title: '🎁 LUCKY BOX OPENED',
          color: COLORS.FUCHSIA,
          fields: [
            { name: '👤 ผู้เล่น (Player)', value: data.username || 'Unknown', inline: true },
            { name: '📦 กล่องสุ่ม (Lucky Box)', value: data.boxName || 'Mystery Box', inline: true },
            { name: '💰 ราคากล่อง (Price)', value: `${Number(data.price || 0).toFixed(2)} ฿`, inline: true },
            { name: '🎉 รางวัลที่ได้รับ (Reward)', value: `**${data.rewardName || 'No Prize'}**`, inline: true },
            { name: '🏷️ ประเภทรางวัล (Type)', value: data.rewardType || 'UNKNOWN', inline: true },
            { name: '🆔 Order / Spin ID', value: `\`${data.orderId || '-'}\``, inline: true },
          ],
        };
        break;

      default:
        embed = {
          ...embed,
          title: `📢 SYSTEM NOTIFICATION: ${type}`,
          color: COLORS.PURPLE,
          description: JSON.stringify(data, null, 2),
        };
    }

    const payload = {
      username: 'NEXUS STORE BOT',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/808/808439.png',
      embeds: [embed],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[Discord Webhook] Error response (${response.status}):`, errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Discord Webhook] Failed to send webhook:', error);
    return false;
  }
}
