import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'orders';

    let csvContent = '';
    const BOM = '\uFEFF'; // UTF-8 BOM for Microsoft Excel Thai encoding

    if (type === 'orders') {
      const orders = await prisma.order.findMany({
        include: {
          user: { select: { username: true } },
          product: { select: { title: true } },
          luckyBox: { select: { name: true } },
          coupon: { select: { code: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const headers = ['OrderID', 'Customer', 'Product/Service', 'Type', 'Status', 'TotalAmount', 'Discount', 'Coupon', 'Date'];
      const rows = orders.map((o) => [
        o.id,
        o.user?.username || '',
        `"${(o.product?.title || o.luckyBox?.name || o.type).replace(/"/g, '""')}"`,
        o.type,
        o.status,
        o.totalAmount.toFixed(2),
        o.discountAmount.toFixed(2),
        o.coupon?.code || '',
        new Date(o.createdAt).toISOString(),
      ]);

      csvContent = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="orders_export_${Date.now()}.csv"`,
        },
      });
    }

    if (type === 'transactions') {
      const txs = await prisma.transaction.findMany({
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const headers = ['TransactionID', 'Username', 'Amount', 'Channel', 'ReferenceNo', 'Status', 'Date'];
      const rows = txs.map((t) => [
        t.id,
        t.user?.username || '',
        t.amount.toFixed(2),
        t.channel,
        `"${(t.referenceNo || '').replace(/"/g, '""')}"`,
        t.status,
        new Date(t.createdAt).toISOString(),
      ]);

      csvContent = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="transactions_export_${Date.now()}.csv"`,
        },
      });
    }

    return new NextResponse('Invalid export type', { status: 400 });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}
