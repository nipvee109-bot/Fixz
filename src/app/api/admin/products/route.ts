import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') return null;
  return (session.user as any).id;
}

// GET /api/admin/products - List all products & categories
export async function GET() {
  try {
    const adminId = await checkAdmin();
    if (!adminId) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });

    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        include: {
          category: true,
          stocks: { where: { isSold: false } },
          priceHistories: {
            include: { admin: { select: { username: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return NextResponse.json({
      success: true,
      products: products.map((p) => ({
        ...p,
        stockCount: p.stocks.length,
      })),
      categories,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// POST /api/admin/products - Create product
export async function POST(req: Request) {
  try {
    const adminId = await checkAdmin();
    if (!adminId) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });

    const body = await req.json();
    const { title, description, price, originalPrice, categoryId, thumbnail, type, lowStockThreshold } = body;

    if (!title || price === undefined || !categoryId || !thumbnail) {
      return NextResponse.json({ success: false, error: 'INVALID_INPUT', message: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วน' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        title: title.trim(),
        description: description || null,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        categoryId,
        thumbnail: thumbnail.trim(),
        type: type || 'ACCOUNT_PURCHASE',
        lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold, 10) : 3,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// PUT /api/admin/products - Update product with price history tracking
export async function PUT(req: Request) {
  try {
    const adminId = await checkAdmin();
    if (!adminId) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });

    const body = await req.json();
    const { id, title, description, price, originalPrice, categoryId, thumbnail, type, lowStockThreshold, isActive } = body;

    if (!id) return NextResponse.json({ success: false, error: 'MISSING_ID' }, { status: 400 });

    const currentProduct = await prisma.product.findUnique({ where: { id } });
    if (!currentProduct) return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });

    const newPrice = price !== undefined ? parseFloat(price) : currentProduct.price;
    const priceChanged = currentProduct.price !== newPrice;

    const updated = await prisma.$transaction(async (tx) => {
      if (priceChanged) {
        await tx.productPriceHistory.create({
          data: {
            productId: id,
            oldPrice: currentProduct.price,
            newPrice,
            adminId,
          },
        });
      }

      return tx.product.update({
        where: { id },
        data: {
          ...(title && { title: title.trim() }),
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price: newPrice }),
          ...(originalPrice !== undefined && { originalPrice: originalPrice ? parseFloat(originalPrice) : null }),
          ...(categoryId && { categoryId }),
          ...(thumbnail && { thumbnail: thumbnail.trim() }),
          ...(type && { type }),
          ...(lowStockThreshold !== undefined && { lowStockThreshold: parseInt(lowStockThreshold, 10) }),
          ...(isActive !== undefined && { isActive }),
        },
      });
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/products - Delete product
export async function DELETE(req: Request) {
  try {
    const adminId = await checkAdmin();
    if (!adminId) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'MISSING_ID' }, { status: 400 });

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'ลบสินค้าสำเร็จ' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
