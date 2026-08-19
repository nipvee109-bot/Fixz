import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });
    }
    const adminId = (session.user as any).id;

    const { status, priority, adminNote } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { product: true, user: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND', message: 'ไม่พบคำสั่งซื้อนี้' }, { status: 404 });
    }

    const oldStatus = order.status;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const uOrder = await tx.order.update({
        where: { id: params.id },
        data: {
          ...(status && { status }),
          ...(priority && { priority }),
          ...(adminNote !== undefined && { adminNote }),
        },
      });

      // Write Audit Log
      await tx.orderAuditLog.create({
        data: {
          orderId: order.id,
          adminId,
          action: 'STATUS_OR_PRIORITY_UPDATE',
          oldStatus,
          newStatus: status || oldStatus,
          note: adminNote ? `อัปเดตสถานะ: ${adminNote}` : `เปลี่ยนสถานะเป็น ${status || oldStatus}`,
        },
      });

      return uOrder;
    });

    // Notify customer if status changed
    if (status && status !== oldStatus) {
      await createNotification({
        userId: order.userId,
        type: 'FARMING_STATUS',
        title: `อัปเดตสถานะคำสั่งซื้อ #${order.id.slice(-8)}`,
        message: `สถานะคำสั่งซื้อของคุณเปลี่ยนเป็น "${status}"${adminNote ? ` (${adminNote})` : ''}`,
        link: `/orders/${order.id}`,
      });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
