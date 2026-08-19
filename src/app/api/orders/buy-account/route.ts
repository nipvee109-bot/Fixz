import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { sendDiscordEmbed } from '@/lib/discord';
import { createNotification } from '@/lib/notifications';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }
    const { productId, couponCode } = await req.json();
    if (!productId) {
      return NextResponse.json({ success: false, error: 'MISSING_PRODUCT_ID', message: 'กรุณาระบุรหัสสินค้า' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const username = session.user.name || 'Unknown';

    const rateLimit = checkRateLimit(`buy-account:${userId}`, 10, 10000); // 10 per 10s
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณสั่งซื้อถี่เกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId, isActive: true },
      });
      if (!product) throw new Error('PRODUCT_NOT_FOUND');

      const stockItem = await tx.stockItem.findFirst({
        where: { productId, isSold: false },
      });
      if (!stockItem) throw new Error('OUT_OF_STOCK');

      // Calculate final price & coupon discounts Server-Side
      let finalPrice = product.price;
      let discountAmount = 0;
      let appliedCouponId: string | null = null;

      if (couponCode) {
        const now = new Date();
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.trim().toUpperCase() },
        });

        if (!coupon || !coupon.isActive) {
          throw new Error('INVALID_COUPON');
        }
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

        // Increment coupon usage counter
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.balance < finalPrice) throw new Error('INSUFFICIENT_BALANCE');

      const pointsEarned = Math.floor(finalPrice * 0.05);

      // Deduct balance and add points
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: finalPrice },
          points: { increment: pointsEarned },
        },
      });

      // Record point ledger transaction
      if (pointsEarned > 0) {
        await tx.pointTransaction.create({
          data: {
            userId,
            amount: pointsEarned,
            type: 'PURCHASE',
            description: `แต้มสะสมจากการสั่งซื้อไอดี ${product.title}`,
          },
        });
      }

      // Create completed order
      const order = await tx.order.create({
        data: {
          userId,
          productId,
          type: 'ACCOUNT_PURCHASE',
          status: 'COMPLETED',
          totalAmount: finalPrice,
          discountAmount,
          couponId: appliedCouponId,
        },
      });

      // Link coupon usage
      if (appliedCouponId) {
        await tx.couponUsage.create({
          data: {
            couponId: appliedCouponId,
            userId,
            orderId: order.id,
          },
        });
      }

      // Mark stock item as sold
      await tx.stockItem.update({
        where: { id: stockItem.id },
        data: {
          isSold: true,
          soldAt: new Date(),
          orderId: order.id,
        },
      });

      // Audit Log
      await tx.orderAuditLog.create({
        data: {
          orderId: order.id,
          adminId: userId, // System purchase
          action: 'ORDER_PURCHASE_COMPLETED',
          oldStatus: 'PENDING',
          newStatus: 'COMPLETED',
          note: `ซื้อไอดีอัตโนมัติ ยอดสุทธิ ฿${finalPrice.toFixed(2)}`,
        },
      });

      // Calculate remaining stock count
      const remainingStock = await tx.stockItem.count({
        where: { productId, isSold: false, id: { not: stockItem.id } },
      });

      return {
        orderId: order.id,
        decrypted: decrypt(stockItem.accountData),
        productTitle: product.title,
        productId: product.id,
        price: finalPrice,
        remainingStock,
        lowStockThreshold: product.lowStockThreshold,
      };
    });

    // In-App Notification
    await createNotification({
      userId,
      type: 'ORDER_COMPLETED',
      title: 'สั่งซื้อไอดีสำเร็จ!',
      message: `คุณได้สั่งซื้อ ${result.productTitle} สำเร็จเรียบร้อย สามารถตรวจสอบข้อมูลไอดีได้ทันที`,
      link: `/orders/${result.orderId}`,
    });

    // Discord Webhook for Account Purchase
    await sendDiscordEmbed({
      type: 'ACCOUNT_PURCHASE',
      data: {
        buyer: username,
        productTitle: result.productTitle,
        productId: result.productId,
        price: result.price,
        orderId: result.orderId,
        remainingStock: result.remainingStock,
      },
    });

    // Discord Out of Stock trigger
    if (result.remainingStock === 0) {
      await sendDiscordEmbed({
        type: 'OUT_OF_STOCK',
        data: {
          productId: result.productId,
          productTitle: result.productTitle,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.orderId,
        decrypted: result.decrypted,
        remainingStock: result.remainingStock,
      },
    });
  } catch (err: any) {
    if (err.message === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'PRODUCT_NOT_FOUND', message: 'ไม่พบสินค้าในระบบ' }, { status: 404 });
    }
    if (err.message === 'OUT_OF_STOCK') {
      return NextResponse.json({ success: false, error: 'OUT_OF_STOCK', message: 'สินค้าหมดชั่วคราว' }, { status: 400 });
    }
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ success: false, error: 'INSUFFICIENT_BALANCE', message: 'ยอดเงินคงเหลือไม่เพียงพอ' }, { status: 400 });
    }
    if (err.message === 'INVALID_COUPON' || err.message === 'COUPON_EXPIRED' || err.message === 'COUPON_LIMIT_REACHED' || err.message === 'USER_COUPON_LIMIT_EXCEEDED') {
      return NextResponse.json({ success: false, error: err.message, message: 'คูปองส่วนลดไม่ถูกต้องหรือถูกใช้งานเต็มแล้ว' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message || 'เกิดข้อผิดพลาด' }, { status: 400 });
  }
}