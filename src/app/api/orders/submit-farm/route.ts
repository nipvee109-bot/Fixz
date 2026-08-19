import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { sendDiscordEmbed } from '@/lib/discord';
import { createNotification } from '@/lib/notifications';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeString } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const username = session.user.name || 'Unknown';

    const rateLimit = checkRateLimit(`submit-farm:${userId}`, 10, 10000); // 10 per 10s
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณส่งคำสั่งบริการถี่เกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { productId, gamePassword, couponCode } = body;
    const gameUsername = sanitizeString(body.gameUsername);
    const notes = sanitizeString(body.notes);

    if (!productId || !gameUsername) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS', message: 'กรุณากรอกข้อมูลไอดีเกมให้ครบถ้วน' }, { status: 400 });
    }

    // Atomic transaction for balance deduction and farming order creation
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId, isActive: true },
      });

      if (!product || product.type !== 'FARMING_SERVICE') {
        throw new Error('INVALID_FARMING_PRODUCT');
      }

      // Calculate final price & coupon discounts Server-Side
      let finalPrice = product.price;
      let discountAmount = 0;
      let appliedCouponId: string | null = null;

      if (couponCode) {
        const now = new Date();
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.trim().toUpperCase() },
        });

        if (!coupon || !coupon.isActive) throw new Error('INVALID_COUPON');
        if (coupon.startsAt && coupon.startsAt > now) throw new Error('COUPON_NOT_STARTED');
        if (coupon.expiresAt && coupon.expiresAt < now) throw new Error('COUPON_EXPIRED');
        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
          throw new Error('COUPON_LIMIT_REACHED');
        }

        const userUsageCount = await tx.couponUsage.count({
          where: { couponId: coupon.id, userId },
        });
        if (userUsageCount >= coupon.perUserLimit) {
          throw new Error('USER_COUPON_LIMIT_EXCEEDED');
        }
        if (coupon.minSpend !== null && product.price < coupon.minSpend) {
          throw new Error('MIN_SPEND_NOT_MET');
        }

        if (coupon.type === 'PERCENT') {
          discountAmount = (product.price * coupon.value) / 100;
          if (coupon.maxDiscount !== null && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount;
          }
        } else {
          discountAmount = Math.min(coupon.value, product.price);
        }

        finalPrice = Math.max(0, product.price - discountAmount);
        appliedCouponId = coupon.id;

        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.balance < finalPrice) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const pointsEarned = Math.floor(finalPrice * 0.05);

      // Deduct balance and add reward points
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: finalPrice },
          points: { increment: pointsEarned },
        },
      });

      if (pointsEarned > 0) {
        await tx.pointTransaction.create({
          data: {
            userId,
            amount: pointsEarned,
            type: 'PURCHASE',
            description: `แต้มสะสมจากบริการรับฟาร์ม ${product.title}`,
          },
        });
      }

      // Securely store encrypted customer credentials in database
      const credentialsPayload = JSON.stringify({
        gameUsername,
        encryptedPassword: gamePassword ? encrypt(gamePassword) : '',
        notes: notes || '',
      });

      const order = await tx.order.create({
        data: {
          userId,
          productId: product.id,
          type: 'FARMING_SERVICE',
          status: 'PAID',
          priority: 'NORMAL',
          totalAmount: finalPrice,
          discountAmount,
          couponId: appliedCouponId,
          customerInput: credentialsPayload,
        },
      });

      if (appliedCouponId) {
        await tx.couponUsage.create({
          data: {
            couponId: appliedCouponId,
            userId,
            orderId: order.id,
          },
        });
      }

      await tx.orderAuditLog.create({
        data: {
          orderId: order.id,
          adminId: userId,
          action: 'FARMING_ORDER_CREATED',
          oldStatus: 'PENDING',
          newStatus: 'PAID',
          note: `ลูกค้าส่งคำสั่งฟาร์ม ยอดสุทธิ ฿${finalPrice.toFixed(2)}`,
        },
      });

      return {
        orderId: order.id,
        serviceTitle: product.title,
        price: finalPrice,
        sanitizedNotes: `ชื่อในเกม: ${gameUsername}${notes ? ` | หมายเหตุ: ${notes}` : ''}`,
      };
    });

    // In-App Notification
    await createNotification({
      userId,
      type: 'ORDER_PAID',
      title: 'ส่งคำสั่งฟาร์มเรียบร้อยแล้ว',
      message: `บริการ ${result.serviceTitle} ได้รับคำสั่งซื้อแล้ว แอดมินกำลังเริ่มดำเนินการให้คุณ`,
      link: `/orders/${result.orderId}`,
    });

    // Send Discord FARMING_ORDER notification (CRITICAL: NEVER send game passwords)
    await sendDiscordEmbed({
      type: 'FARMING_ORDER',
      data: {
        customer: username,
        orderId: result.orderId,
        serviceTitle: result.serviceTitle,
        price: result.price,
        notes: result.sanitizedNotes,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.orderId,
        message: 'ส่งคำสั่งฟาร์มสำเร็จ! ทีมงานจะดำเนินการให้เร็วที่สุด',
      },
    });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ success: false, error: 'INSUFFICIENT_BALANCE', message: 'ยอดเงินคงเหลือไม่เพียงพอสำหรับการสั่งบริการ' }, { status: 400 });
    }
    if (err.message === 'INVALID_FARMING_PRODUCT') {
      return NextResponse.json({ success: false, error: 'INVALID_FARMING_PRODUCT', message: 'ไม่พบบริการฟาร์มนี้ในระบบ' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message || 'เกิดข้อผิดพลาด' }, { status: 400 });
  }
}
