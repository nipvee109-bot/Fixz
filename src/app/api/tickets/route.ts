import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeString } from '@/lib/validation';

// GET /api/tickets - List user's tickets or all tickets if admin
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const isAdminView = role === 'ADMIN' && searchParams.get('admin') === 'true';

    const where: any = {};
    if (!isAdminView) {
      where.userId = userId;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        user: { select: { id: true, username: true } },
        order: { select: { id: true, totalAmount: true, type: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, tickets });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// POST /api/tickets - Create new support ticket
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const rateLimit = checkRateLimit(`ticket-create:${userId}`, 5, 60000); // 5 tickets per min
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณสร้างคำร้องบ่อยเกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawSubject = sanitizeString(body.subject);
    const rawMessage = sanitizeString(body.message);
    const category = body.category || 'OTHER';
    const priority = body.priority || 'NORMAL';
    const orderId = body.orderId || null;

    if (!rawSubject || !rawMessage) {
      return NextResponse.json({ success: false, error: 'INVALID_INPUT', message: 'กรุณากรอกหัวข้อและรายละเอียดปัญหา' }, { status: 400 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId,
        subject: rawSubject.slice(0, 150),
        category,
        priority,
        status: 'OPEN',
        orderId,
        messages: {
          create: {
            senderId: userId,
            senderRole: 'USER',
            message: rawMessage.slice(0, 2000),
          },
        },
      },
    });

    // Notify user
    await createNotification({
      userId,
      type: 'SYSTEM',
      title: 'เปิดคำร้องช่วยเหลือสำเร็จ',
      message: `คำร้อง #${ticket.id.slice(-6)} (${ticket.subject}) ได้รับการบันทึกแล้ว ทีมงานจะตอบกลับโดยเร็วที่สุด`,
      link: `/support/${ticket.id}`,
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
