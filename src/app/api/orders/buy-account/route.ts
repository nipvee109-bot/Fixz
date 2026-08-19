import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    const { productId } = await req.json();
    const userId = (session.user as any).id;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId, isActive: true } });
      if (!product) throw new Error('ไม่พบสินค้า');
      const stockItem = await tx.stockItem.findFirst({ where: { productId, isSold: false } });
      if (!stockItem) throw new Error('สินค้าหมดชั่วคราว');
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.balance < product.price) throw new Error('ยอดเงินไม่เพียงพอ');

      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: product.price }, points: { increment: Math.floor(product.price * 0.05) } },
      });

      const order = await tx.order.create({
        data: { userId, productId, type: 'ACCOUNT_PURCHASE', status: 'COMPLETED', totalAmount: product.price },
      });

      await tx.stockItem.update({
        where: { id: stockItem.id },
        data: { isSold: true, soldAt: new Date(), orderId: order.id },
      });

      return { orderId: order.id, decrypted: decrypt(stockItem.accountData) };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}