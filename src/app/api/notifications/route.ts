import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/notifications - Get latest notifications for logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// POST /api/notifications - Mark as read (specific ID or all)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const body = await req.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: 'อ่านทั้งหมดแล้ว' });
    }

    if (notificationId) {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: 'ทำเครื่องหมายว่าอ่านแล้ว' });
    }

    return NextResponse.json({ success: false, error: 'INVALID_REQUEST' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
