import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { sendDiscordEmbed } from '@/lib/discord';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeString } from '@/lib/validation';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });
    }
    const adminId = (session.user as any).id;
    const adminName = session.user.name || 'Admin';

    const rateLimit = checkRateLimit(`admin-refund:${adminId}`, 20, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณทำรายการคืนเงินถี่เกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = sanitizeString(body.reason);

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: params.id },
        include: { user: true, product: true },
      });

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }

      if (order.status === 'REFUNDED') {
        throw new Error('ALREADY_REFUNDED');
      }

      const refundAmount = order.totalAmount;
      if (refundAmount <= 0) {
        throw new Error('INVALID_REFUND_AMOUNT');
      }

      const oldStatus = order.status;

      // 1. Credit user balance
      await tx.user.update({
        where: { id: order.userId },
        data: {
          balance: { increment: refundAmount },
        },
      });

      // 2. Mark order as REFUNDED
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'REFUNDED',
          adminNote: reason ? `คืนเงิน: ${reason}` : 'คืนเงินโดยแอดมิน',
        },
      });

      // 3. Create Refund Transaction
      const refNo = `REFUND_${order.id}_${Date.now()}`;
      await tx.transaction.create({
        data: {
          userId: order.userId,
          amount: refundAmount,
          channel: 'REFUND',
          referenceNo: refNo,
          status: 'SUCCESS',
        },
      });

      // 4. Order Audit Log
      await tx.orderAuditLog.create({
        data: {
          orderId: order.id,
          adminId,
          action: 'ORDER_REFUNDED',
          oldStatus,
          newStatus: 'REFUNDED',
          note: reason || 'คืนเงินให้ลูกค้าเรียบร้อยแล้ว',
        },
      });

      return {
        orderId: order.id,
        userId: order.userId,
        customerName: order.user.username,
        productTitle: order.product?.title || order.type,
        refundAmount,
        reason: reason || 'คืนเงินโดยแอดมิน',
      };
    });

    // In-App Notification to Customer
    await createNotification({
      userId: result.userId,
      type: 'REFUND',
      title: 'คืนเงินสำเร็จ!',
      message: `คำสั่งซื้อ #${result.orderId.slice(-8)} ได้รับการคืนเงินจำนวน ฿${result.refundAmount.toFixed(2)} เข้ากระเป๋าของคุณแล้ว (${result.reason})`,
      link: `/orders/${result.orderId}`,
    });

    // Discord Webhook
    await sendDiscordEmbed({
      type: 'TOPUP_SUCCESS',
      data: {
        username: result.customerName,
        userId: result.userId,
        amount: result.refundAmount,
        channel: `REFUND (${adminName})`,
        referenceNo: `ORD-${result.orderId.slice(-8)}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `คืนเงินสำเร็จจำนวน ฿${result.refundAmount.toFixed(2)}`,
    });
  } catch (err: any) {
    if (err.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND', message: 'ไม่พบคำสั่งซื้อนี้' }, { status: 404 });
    }
    if (err.message === 'ALREADY_REFUNDED') {
      return NextResponse.json({ success: false, error: 'ALREADY_REFUNDED', message: 'คำสั่งซื้อนี้ถูกคืนเงินไปแล้ว' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message || 'เกิดข้อผิดพลาดในการคืนเงิน' }, { status: 500 });
  }
}
