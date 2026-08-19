import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user && (session.user as any).role === 'ADMIN';
}

// GET /api/admin/promotions - List all coupons and flash sales
export async function GET() {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });

    const [coupons, promotions, products] = await Promise.all([
      prisma.coupon.findMany({
        include: { _count: { select: { usages: true, orders: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.promotion.findMany({
        include: { products: { include: { product: { select: { id: true, title: true, price: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, title: true, price: true, type: true },
      }),
    ]);

    return NextResponse.json({ success: true, coupons, promotions, products });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// POST /api/admin/promotions - Create coupon or flash sale
export async function POST(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    if (action === 'CREATE_COUPON') {
      const { code, type, value, minSpend, maxDiscount, usageLimit, perUserLimit, startsAt, expiresAt } = body;
      if (!code || value === undefined) {
        return NextResponse.json({ success: false, error: 'INVALID_INPUT', message: 'กรุณากรอกรหัสและมูลค่าส่วนลด' }, { status: 400 });
      }

      const existing = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
      if (existing) {
        return NextResponse.json({ success: false, error: 'CODE_EXISTS', message: 'รหัสคูปองนี้มีอยู่ในระบบแล้ว' }, { status: 400 });
      }

      const coupon = await prisma.coupon.create({
        data: {
          code: code.trim().toUpperCase(),
          type: type || 'PERCENT',
          value: parseFloat(value) || 0,
          minSpend: minSpend ? parseFloat(minSpend) : null,
          maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
          usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
          perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : 1,
          startsAt: startsAt ? new Date(startsAt) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true,
        },
      });
      return NextResponse.json({ success: true, coupon });
    }

    if (action === 'CREATE_PROMOTION') {
      const { title, description, discountPercent, startsAt, endsAt, productIds } = body;
      if (!title || !startsAt || !endsAt) {
        return NextResponse.json({ success: false, error: 'INVALID_INPUT', message: 'กรุณากรอกชื่อและช่วงเวลาโปรโมชั่น' }, { status: 400 });
      }

      const promo = await prisma.promotion.create({
        data: {
          title,
          description: description || null,
          discountPercent: parseFloat(discountPercent) || 10,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
          isActive: true,
          products: {
            create: (productIds || []).map((pId: string) => ({
              productId: pId,
            })),
          },
        },
      });
      return NextResponse.json({ success: true, promotion: promo });
    }

    return NextResponse.json({ success: false, error: 'UNKNOWN_ACTION' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/promotions - Delete coupon or promotion
export async function DELETE(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'MISSING_ID' }, { status: 400 });

    if (type === 'COUPON') {
      await prisma.coupon.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'ลบคูปองสำเร็จ' });
    }

    if (type === 'PROMOTION') {
      await prisma.promotion.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'ลบโปรโมชั่นสำเร็จ' });
    }

    return NextResponse.json({ success: false, error: 'INVALID_TYPE' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
