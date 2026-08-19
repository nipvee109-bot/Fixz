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

    const [orders, transactions, totalUsers, categories] = await Promise.all([
      prisma.order.findMany({
        include: {
          product: { include: { category: true } },
          luckyBox: true,
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.findMany({
        where: { status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
      prisma.category.findMany(),
    ]);

    // Financial Metrics
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED');
    const totalOrderRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalTopup = transactions
      .filter((t) => t.channel !== 'REFUND')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalRefunds = transactions
      .filter((t) => t.channel === 'REFUND')
      .reduce((sum, t) => sum + t.amount, 0);

    const averageOrderValue =
      completedOrders.length > 0 ? totalOrderRevenue / completedOrders.length : 0;

    // Sales by Category
    const categorySales: { [key: string]: number } = {};
    completedOrders.forEach((o) => {
      const catName = o.product?.category?.name || (o.type === 'LUCKY_BOX' ? 'กล่องสุ่ม' : 'ทั่วไป');
      categorySales[catName] = (categorySales[catName] || 0) + o.totalAmount;
    });

    // Top Selling Products
    const productSales: { [key: string]: { title: string; count: number; revenue: number } } = {};
    completedOrders.forEach((o) => {
      const id = o.productId || o.luckyBoxId || 'unknown';
      const title = o.product?.title || o.luckyBox?.name || 'รายการอื่นๆ';
      if (!productSales[id]) {
        productSales[id] = { title, count: 0, revenue: 0 };
      }
      productSales[id].count += 1;
      productSales[id].revenue += o.totalAmount;
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      summary: {
        totalOrderRevenue,
        totalTopup,
        totalRefunds,
        totalCompletedOrders: completedOrders.length,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        totalUsers,
      },
      categorySales,
      topProducts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
