import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const rateLimit = checkRateLimit(`redeem:${userId}`, 6, 10000); // 6 per 10s
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณทำรายการถี่เกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    const { rewardId } = await req.json();
    if (!rewardId) {
      return NextResponse.json({ success: false, error: 'MISSING_REWARD_ID' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const reward = await tx.rewardItem.findUnique({
        where: { id: rewardId, isActive: true },
      });

      if (!reward) throw new Error('REWARD_NOT_FOUND');
      if (reward.stock <= 0) throw new Error('REWARD_OUT_OF_STOCK');

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.points < reward.pointCost) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      // Deduct Points
      const creditGain = reward.rewardType === 'CREDIT' ? parseFloat(reward.rewardValue) || 0 : 0;

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          points: { decrement: reward.pointCost },
          ...(creditGain > 0 && { balance: { increment: creditGain } }),
        },
      });

      // Decrement reward stock
      await tx.rewardItem.update({
        where: { id: reward.id },
        data: { stock: { decrement: 1 } },
      });

      // Point Ledger Record
      await tx.pointTransaction.create({
        data: {
          userId,
          amount: -reward.pointCost,
          type: 'REDEEM',
          description: `แลกรับของรางวัล: ${reward.title}`,
        },
      });

      return {
        rewardTitle: reward.title,
        rewardType: reward.rewardType,
        rewardValue: reward.rewardValue,
        remainingPoints: updatedUser.points,
        newBalance: updatedUser.balance,
      };
    });

    // In-App Notification
    await createNotification({
      userId,
      type: 'SYSTEM',
      title: 'แลกของรางวัลสำเร็จ!',
      message: `คุณได้ใช้แต้มแลก "${result.rewardTitle}" สำเร็จเรียบร้อยแล้ว`,
      link: '/rewards',
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `แลกรับ "${result.rewardTitle}" สำเร็จ!`,
    });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_POINTS') {
      return NextResponse.json({ success: false, error: 'INSUFFICIENT_POINTS', message: 'แต้มสะสมของคุณไม่เพียงพอสำหรับการแลกของรางวัลนี้' }, { status: 400 });
    }
    if (err.message === 'REWARD_OUT_OF_STOCK') {
      return NextResponse.json({ success: false, error: 'REWARD_OUT_OF_STOCK', message: 'ของรางวัลนี้หมดชั่วคราว' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: err.message || 'เกิดข้อผิดพลาดในการแลกของรางวัล' }, { status: 500 });
  }
}
