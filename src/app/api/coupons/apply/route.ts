import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const rateLimit = checkRateLimit(`coupon:${userId}`, 15, 60000); // 15 checks per min
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณตรวจสอบคูปองถี่เกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    const { code, cartAmount } = await req.json();
    if (!code || typeof cartAmount !== 'number' || cartAmount <= 0) {
      return NextResponse.json({ success: false, error: 'INVALID_INPUT', message: 'ข้อมูลคูปองหรือยอดสั่งซื้อไม่ถูกต้อง' }, { status: 400 });
    }

    const now = new Date();
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ success: false, error: 'COUPON_NOT_FOUND', message: 'ไม่พบคูปองส่วนลดนี้ หรือคูปองปิดใช้งานแล้ว' }, { status: 404 });
    }

    // Check Start Date & Expiry
    if (coupon.startsAt && coupon.startsAt > now) {
      return NextResponse.json({ success: false, error: 'COUPON_NOT_STARTED', message: 'คูปองนี้ยังไม่ถึงเวลาเริ่มใช้งาน' }, { status: 400 });
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      return NextResponse.json({ success: false, error: 'COUPON_EXPIRED', message: 'คูปองส่วนลดนี้หมดอายุแล้ว' }, { status: 400 });
    }

    // Check Global Usage Limit
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ success: false, error: 'COUPON_LIMIT_REACHED', message: 'สิทธิ์การใช้งานคูปองนี้เต็มแล้ว' }, { status: 400 });
    }

    // Check Per-User Limit
    const userUsageCount = await prisma.couponUsage.count({
      where: { couponId: coupon.id, userId },
    });
    if (userUsageCount >= coupon.perUserLimit) {
      return NextResponse.json({ success: false, error: 'USER_LIMIT_EXCEEDED', message: `คุณใช้สิทธิ์คูปองนี้ครบ ${coupon.perUserLimit} ครั้งแล้ว` }, { status: 400 });
    }

    // Check Min Spend
    if (coupon.minSpend !== null && cartAmount < coupon.minSpend) {
      return NextResponse.json({
        success: false,
        error: 'MIN_SPEND_NOT_MET',
        message: `ยอดสั่งซื้อขั้นต่ำสำหรับคูปองนี้คือ ฿${coupon.minSpend.toFixed(2)}`,
      }, { status: 400 });
    }

    // Calculate Discount Server-side
    let discountAmount = 0;
    if (coupon.type === 'PERCENT') {
      discountAmount = (cartAmount * coupon.value) / 100;
      if (coupon.maxDiscount !== null && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      // FIXED
      discountAmount = Math.min(coupon.value, cartAmount);
    }

    const finalAmount = Math.max(0, cartAmount - discountAmount);

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      originalAmount: cartAmount,
      discountAmount,
      finalAmount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
