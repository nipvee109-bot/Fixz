import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/rewards - List active reward items and user points
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;

    const [rewardItems, user, pointHistory] = await Promise.all([
      prisma.rewardItem.findMany({
        where: { isActive: true },
        orderBy: { pointCost: 'asc' },
      }),
      userId
        ? prisma.user.findUnique({
            where: { id: userId },
            select: { points: true, balance: true },
          })
        : null,
      userId
        ? prisma.pointTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : [],
    ]);

    return NextResponse.json({
      success: true,
      rewardItems,
      points: user?.points || 0,
      pointHistory,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
