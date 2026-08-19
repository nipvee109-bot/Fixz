import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeString } from '@/lib/validation';

// GET /api/products/[id]/reviews - List reviews
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const reviews = await prisma.productReview.findMany({
      where: { productId: params.id, isHidden: false },
      include: {
        user: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 5;

    return NextResponse.json({
      success: true,
      reviews,
      totalReviews,
      averageRating: parseFloat(avgRating.toFixed(1)),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

// POST /api/products/[id]/reviews - Submit verified review
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const rateLimit = checkRateLimit(`review:${userId}`, 6, 60000); // 6 reviews per min
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณส่งรีวิวถี่เกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawComment = sanitizeString(body.comment);
    const parsedRating = parseInt(body.rating, 10);

    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5 || !rawComment) {
      return NextResponse.json({ success: false, error: 'INVALID_INPUT', message: 'กรุณาให้คะแนน (1-5 ดาว) และเขียนข้อความรีวิว' }, { status: 400 });
    }

    // Check if user has purchased this product
    const purchasedOrder = await prisma.order.findFirst({
      where: {
        userId,
        productId: params.id,
        status: { in: ['COMPLETED', 'DELIVERED', 'PAID'] },
      },
    });

    if (!purchasedOrder) {
      return NextResponse.json({
        success: false,
        error: 'NOT_PURCHASED',
        message: 'คุณสามารถเขียนรีวิวได้เฉพาะสินค้าที่คุณเคยสั่งซื้อสำเร็จแล้วเท่านั้น',
      }, { status: 403 });
    }

    // Create review
    const review = await prisma.productReview.create({
      data: {
        productId: params.id,
        userId,
        rating: parsedRating,
        comment: rawComment.slice(0, 1000),
        isVerifiedPurchase: true,
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json({
      success: true,
      review,
      message: 'ส่งรีวิวของคุณเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็น!',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
