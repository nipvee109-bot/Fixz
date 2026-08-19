import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return false;
  }
  return true;
}

// POST /api/admin/lucky-box/rewards - Add reward to box
export async function POST(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'ต้องใช้สิทธิ์แอดมินเท่านั้น' }, { status: 403 });
    }

    const body = await req.json();
    const { boxId, name, type, value, dropRate, productId } = body;

    if (!boxId || !name || !type || dropRate === undefined) {
      return NextResponse.json({ success: false, error: 'INVALID_INPUT', message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const validTypes = ['POINT', 'CREDIT', 'ACCOUNT', 'LOSE'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ success: false, error: 'INVALID_TYPE', message: 'ประเภทรางวัลไม่ถูกต้อง (POINT, CREDIT, ACCOUNT, LOSE)' }, { status: 400 });
    }

    const reward = await prisma.luckyBoxReward.create({
      data: {
        boxId,
        name,
        type,
        value: value || '',
        dropRate: parseFloat(dropRate) || 0,
        productId: type === 'ACCOUNT' && productId ? productId : null,
      },
      include: {
        product: {
          select: { id: true, title: true, _count: { select: { stocks: { where: { isSold: false } } } } },
        },
      },
    });

    return NextResponse.json({ success: true, reward });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// PUT /api/admin/lucky-box/rewards - Update reward
export async function PUT(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'ต้องใช้สิทธิ์แอดมินเท่านั้น' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, type, value, dropRate, productId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'MISSING_ID', message: 'กรุณาระบุรหัสรางวัล' }, { status: 400 });
    }

    const updated = await prisma.luckyBoxReward.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(value !== undefined && { value }),
        ...(dropRate !== undefined && { dropRate: parseFloat(dropRate) }),
        productId: type === 'ACCOUNT' ? (productId || null) : null,
      },
      include: {
        product: {
          select: { id: true, title: true, _count: { select: { stocks: { where: { isSold: false } } } } },
        },
      },
    });

    return NextResponse.json({ success: true, reward: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/lucky-box/rewards - Delete reward
export async function DELETE(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'ต้องใช้สิทธิ์แอดมินเท่านั้น' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'MISSING_ID', message: 'กรุณาระบุรหัสรางวัล' }, { status: 400 });
    }

    await prisma.luckyBoxReward.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'ลบรางวัลสำเร็จ' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
