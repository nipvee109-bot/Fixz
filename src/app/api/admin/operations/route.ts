import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });
    }

    const [pendingFarming, lowStockProducts, openTickets] = await Promise.all([
      // 1. Pending & In-Progress Farming Jobs
      prisma.order.findMany({
        where: {
          type: 'FARMING_SERVICE',
          status: { in: ['PAID', 'PROCESSING'] },
        },
        include: {
          user: { select: { username: true } },
          product: { select: { title: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 20,
      }),

      // 2. Low Stock Products
      prisma.product.findMany({
        where: {
          type: 'ACCOUNT_PURCHASE',
          isActive: true,
        },
        include: {
          category: true,
          stocks: { where: { isSold: false } },
        },
      }),

      // 3. Open Support Tickets
      prisma.ticket.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_USER'] },
        },
        include: {
          user: { select: { username: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);

    const filteredLowStock = lowStockProducts
      .map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category.name,
        price: p.price,
        currentStock: p.stocks.length,
        lowStockThreshold: p.lowStockThreshold,
        isLow: p.stocks.length <= p.lowStockThreshold,
      }))
      .filter((p) => p.isLow);

    return NextResponse.json({
      success: true,
      pendingFarming,
      lowStockProducts: filteredLowStock,
      openTickets,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
