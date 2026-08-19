import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    const { voucherUrl } = await req.json();
    const userId = (session.user as any).id;
    const match = voucherUrl?.match(/v=([a-zA-Z0-9]+)/);
    const code = match ? match[1] : voucherUrl?.trim();
    if (!code) return NextResponse.json({ error: 'ลิงก์ซองไม่ถูกต้อง' }, { status: 400 });

    const existing = await prisma.transaction.findUnique({ where: { referenceNo: code } });
    if (existing) return NextResponse.json({ error: 'ซองนี้ถูกใช้งานไปแล้ว' }, { status: 400 });

    const topupAmount = 100.0;
    await prisma.$transaction([
      prisma.transaction.create({
        data: { userId, amount: topupAmount, channel: 'TRUEMONEY_VOUCHER', referenceNo: code, status: 'SUCCESS' },
      }),
      prisma.user.update({ where: { id: userId }, data: { balance: { increment: topupAmount } } }),
    ]);

    return NextResponse.json({ success: true, message: `เติมเงินสำเร็จ ${topupAmount} ฿` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}