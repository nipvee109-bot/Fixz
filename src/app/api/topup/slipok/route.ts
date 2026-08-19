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
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const username = session.user.name || 'Unknown';

    const rateLimit = checkRateLimit(`slipok:${userId}`, 10, 60000); // 10 attempts per min
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณส่งตรวจสอบสลิปบ่อยเกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('slip') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'MISSING_FILE', message: 'กรุณาอัปโหลดรูปภาพสลิป' }, { status: 400 });
    }

    // Validate MIME type
    const validMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'INVALID_FILE_TYPE', message: 'รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) เท่านั้น' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'FILE_TOO_LARGE', message: 'ขนาดไฟล์ต้องไม่เกิน 5 MB' }, { status: 400 });
    }

    const apiKey = process.env.SLIPOK_API_KEY;
    const branchId = process.env.SLIPOK_BRANCH_ID;

    if (!apiKey || !branchId) {
      return NextResponse.json({
        success: false,
        error: 'CONFIG_MISSING',
        message: 'ระบบยังไม่ได้ตั้งค่า SlipOK API (SLIPOK_API_KEY / SLIPOK_BRANCH_ID)',
      }, { status: 500 });
    }

    // Prepare FormData for SlipOK API
    const slipokFormData = new FormData();
    slipokFormData.append('files', file);

    const slipokUrl = `https://api.slipok.com/api/line/apikey/${branchId}`;
    let slipokRes: Response;
    try {
      slipokRes = await fetch(slipokUrl, {
        method: 'POST',
        headers: {
          'x-authorization': apiKey,
        },
        body: slipokFormData,
        signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
      });
    } catch (fetchErr: any) {
      return NextResponse.json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'ระบบตรวจสอบสลิปขัดข้องชั่วคราวหรือใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง',
      }, { status: 503 });
    }

    const slipokData = await slipokRes.json().catch(() => ({}));

    if (!slipokRes.ok || !slipokData.success) {
      const errMsg = slipokData.message || 'ไม่สามารถตรวจสอบสลิปได้ หรือสลิปไม่ถูกต้อง';
      return NextResponse.json({
        success: false,
        error: 'SLIP_VERIFICATION_FAILED',
        message: errMsg,
      }, { status: 400 });
    }

    const verifiedResult = slipokData.data;
    const transRef = verifiedResult?.transRef || verifiedResult?.transref;
    const verifiedAmount = parseFloat(verifiedResult?.amount);

    if (!transRef) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_TRANS_REF',
        message: 'ไม่พบเลขอ้างอิงสลิปจากผลการตรวจสอบ',
      }, { status: 400 });
    }

    if (isNaN(verifiedAmount) || verifiedAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'ยอดเงินในสลิปไม่ถูกต้อง',
      }, { status: 400 });
    }

    // Check duplicate slip beforehand
    const existingTx = await prisma.transaction.findUnique({
      where: { referenceNo: transRef },
    });

    if (existingTx) {
      return NextResponse.json({
        success: false,
        error: 'SLIP_ALREADY_USED',
        message: 'สลิปนี้ถูกใช้งานไปแล้วในระบบ ไม่สามารถเติมซ้ำได้',
      }, { status: 400 });
    }

    // Execute atomic transaction
    await prisma.$transaction(async (tx) => {
      // Re-check duplicate inside transaction lock
      const duplicateCheck = await tx.transaction.findUnique({
        where: { referenceNo: transRef },
      });
      if (duplicateCheck) {
        throw new Error('SLIP_ALREADY_USED');
      }

      // 1. Credit balance
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: verifiedAmount },
        },
      });

      // 2. Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          amount: verifiedAmount,
          channel: 'PROMPTPAY',
          referenceNo: transRef,
          status: 'SUCCESS',
        },
      });
    });

    // In-App Notification
    await createNotification({
      userId,
      type: 'TOPUP_SUCCESS',
      title: 'เติมเงินสำเร็จ!',
      message: `ยอดเงิน ฿${verifiedAmount.toFixed(2)} ผ่าน PromptPay (SlipOK) เพิ่มเข้ากระเป๋าเรียบร้อยแล้ว`,
      link: '/topup',
    });

    // Send Discord Webhook notification
    await sendDiscordEmbed({
      type: 'TOPUP_SUCCESS',
      data: {
        username,
        userId,
        amount: verifiedAmount,
        channel: 'PromptPay (SlipOK)',
        referenceNo: transRef,
      },
    });

    return NextResponse.json({
      success: true,
      amount: verifiedAmount,
      referenceNo: transRef,
      message: `เติมเงินสำเร็จจำนวน ฿${verifiedAmount.toFixed(2)}`,
    });
  } catch (err: any) {
    if (err.message === 'SLIP_ALREADY_USED') {
      return NextResponse.json({
        success: false,
        error: 'SLIP_ALREADY_USED',
        message: 'สลิปนี้ถูกใช้งานไปแล้วในระบบ ไม่สามารถเติมซ้ำได้',
      }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      error: 'SERVER_ERROR',
      message: err.message || 'เกิดข้อผิดพลาดในการประมวลผล',
    }, { status: 500 });
  }
}
