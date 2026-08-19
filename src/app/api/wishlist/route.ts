import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/wishlist - Get user's wishlist
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            stocks: { where: { isSold: false } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        product: {
          id: item.product.id,
          title: item.product.title,
          price: item.product.price,
          thumbnail: item.product.thumbnail,
          categoryName: item.product.category?.name || 'ทั่วไป',
          type: item.product.type,
          stockCount: item.product.stocks.length,
        },
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// POST /api/wishlist - Toggle wishlist item
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ success: false, error: 'MISSING_PRODUCT_ID' }, { status: 400 });
    }

    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      await prisma.wishlistItem.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ success: true, isWishlisted: false, message: 'ลบออกจากรายการโปรดแล้ว' });
    }

    await prisma.wishlistItem.create({
      data: {
        userId,
        productId,
      },
    });

    return NextResponse.json({ success: true, isWishlisted: true, message: 'เพิ่มเข้ารายการโปรดแล้ว' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
