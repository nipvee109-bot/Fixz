import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper to check admin permission server-side
async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return false;
  }
  return true;
}

// GET /api/admin/lucky-box - List all boxes with rewards
export async function GET() {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'ต้องใช้สิทธิ์แอดมินเท่านั้น' }, { status: 403 });
    }

    const boxes = await prisma.luckyBox.findMany({
      include: {
        rewards: {
          include: {
            product: {
              select: { id: true, title: true, _count: { select: { stocks: { where: { isSold: false } } } } },
            },
          },
        },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const products = await prisma.product.findMany({
      where: { type: 'ACCOUNT_PURCHASE', isActive: true },
      select: {
        id: true,
        title: true,
        _count: { select: { stocks: { where: { isSold: false } } } },
      },
    });

    return NextResponse.json({ success: true, boxes, products });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// POST /api/admin/lucky-box - Create new lucky box
export async function POST(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'ต้องใช้สิทธิ์แอดมินเท่านั้น' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, price, thumbnail, isActive } = body;

    if (!name || price === undefined || !thumbnail) {
      return NextResponse.json({ success: false, error: 'INVALID_INPUT', message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, ราคา, รูปภาพ)' }, { status: 400 });
    }

    const newBox = await prisma.luckyBox.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price) || 0,
        thumbnail,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, box: newBox });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// PUT /api/admin/lucky-box - Update lucky box
export async function PUT(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'ต้องใช้สิทธิ์แอดมินเท่านั้น' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, description, price, thumbnail, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'MISSING_ID', message: 'กรุณาระบุรหัสกล่อง' }, { status: 400 });
    }

    const updatedBox = await prisma.luckyBox.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(thumbnail && { thumbnail }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, box: updatedBox });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/lucky-box - Delete lucky box
export async function DELETE(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'ต้องใช้สิทธิ์แอดมินเท่านั้น' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'MISSING_ID', message: 'กรุณาระบุรหัสกล่อง' }, { status: 400 });
    }

    await prisma.luckyBox.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'ลบกล่องสุ่มสำเร็จ' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
