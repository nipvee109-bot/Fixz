import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

// GET /api/tickets/[id] - Get ticket details and conversation
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, username: true } },
        order: { select: { id: true, totalAmount: true, type: true, status: true } },
        messages: {
          include: { sender: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'ไม่พบคำร้องนี้' }, { status: 404 });
    }

    // Data isolation check: Only owner or admin can access
    if (ticket.userId !== userId && role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', message: 'คุณไม่มีสิทธิ์เข้าถึงคำร้องนี้' }, { status: 403 });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// PUT /api/tickets/[id] - Update ticket status / priority (Admin only)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });
    }

    const { status, priority } = await req.json();

    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
      },
    });

    // Notify ticket owner
    await createNotification({
      userId: ticket.userId,
      type: 'SYSTEM',
      title: `อัปเดตคำร้อง #${ticket.id.slice(-6)}`,
      message: `สถานะคำร้องขอความช่วยเหลือของคุณเปลี่ยนเป็น "${status || ticket.status}"`,
      link: `/support/${ticket.id}`,
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
