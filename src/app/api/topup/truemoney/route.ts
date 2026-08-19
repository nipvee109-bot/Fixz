import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendDiscordEmbed } from '@/lib/discord';
import { createNotification } from '@/lib/notifications';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const username = session.user.name || 'Unknown';

    const rateLimit = checkRateLimit(`truemoney:${userId}`, 10, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณทำรายการถี่เกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    const { voucherUrl } = await req.json().catch(() => ({}));
    const match = voucherUrl?.match(/v=([a-zA-Z0-9]+)/);
    const code = match ? match[1] : voucherUrl?.trim();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'INVALID_VOUCHER', message: 'ลิงก์ซองของขวัญไม่ถูกต้อง' }, { status: 400 });
    }

    const topupAmount = 100.0;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findUnique({ where: { referenceNo: code } });
      if (existing) {
        throw new Error('VOUCHER_ALREADY_USED');
      }

      await tx.transaction.create({
        data: {
          userId,
          amount: topupAmount,
          channel: 'TRUEMONEY_VOUCHER',
          referenceNo: code,
          status: 'SUCCESS',
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: topupAmount } },
      });
    });

    await createNotification({
      userId,
      type: 'TOPUP_SUCCESS',
      title: 'เติมเงินสำเร็จ!',
      message: `ยอดเงิน ฿${topupAmount.toFixed(2)} ผ่าน TrueMoney Voucher เพิ่มเข้ากระเป๋าเรียบร้อยแล้ว`,
      link: '/topup',
    });

    await sendDiscordEmbed({
      type: 'TOPUP_SUCCESS',
      data: {
        username,
        userId,
        amount: topupAmount,
        channel: 'TrueMoney Voucher',
        referenceNo: code,
      },
    });

    return NextResponse.json({ success: true, message: `เติมเงินสำเร็จ ${topupAmount.toFixed(2)} ฿`, amount: topupAmount });
  } catch (err: any) {
    if (err.message === 'VOUCHER_ALREADY_USED' || err.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'VOUCHER_ALREADY_USED', message: 'ซองของขวัญนี้ถูกใช้งานไปแล้ว' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: 'เกิดข้อผิดพลาดในการเติมเงิน' }, { status: 500 });
  }
}