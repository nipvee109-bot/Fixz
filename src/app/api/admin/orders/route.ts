import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const priority = searchParams.get('priority') || '';

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (type && type !== 'ALL') where.type = type;
    if (priority && priority !== 'ALL') where.priority = priority;

    if (search) {
      where.OR = [
        { id: { contains: search } },
        { user: { username: { contains: search } } },
        { product: { title: { contains: search } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true } },
        product: { select: { id: true, title: true, price: true } },
        luckyBox: { select: { id: true, name: true, price: true } },
        coupon: { select: { code: true } },
        stockItem: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
