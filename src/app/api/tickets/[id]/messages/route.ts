import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeString } from '@/lib/validation';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    const rateLimit = checkRateLimit(`ticket-msg:${userId}`, 15, 60000); // 15 msgs per min
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณส่งข้อความถี่เกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawMessage = sanitizeString(body.message);

    if (!rawMessage) {
      return NextResponse.json({ success: false, error: 'INVALID_INPUT', message: 'กรุณากรอกข้อความ' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND', message: 'ไม่พบคำร้องนี้' }, { status: 404 });
    }

    // Security check: Only owner or admin can post
    if (ticket.userId !== userId && role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', message: 'คุณไม่มีสิทธิ์ตอบกลับในคำร้องนี้' }, { status: 403 });
    }

    const senderRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

    // Create message and update ticket timestamp / status
    const [ticketMessage] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: userId,
          senderRole,
          message: rawMessage.slice(0, 2000),
        },
        include: {
          sender: { select: { id: true, username: true } },
        },
      }),
      prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          updatedAt: new Date(),
          status: role === 'ADMIN' ? 'WAITING_USER' : 'IN_PROGRESS',
        },
      }),
    ]);

    // If Admin replied, notify the customer
    if (role === 'ADMIN' && ticket.userId !== userId) {
      await createNotification({
        userId: ticket.userId,
        type: 'SYSTEM',
        title: `แอดมินตอบกลับคำร้อง #${ticket.id.slice(-6)}`,
        message: `มีข้อความใหม่จากทีมงานในคำร้อง: "${ticket.subject}"`,
        link: `/support/${ticket.id}`,
      });
    }

    return NextResponse.json({ success: true, message: ticketMessage });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
