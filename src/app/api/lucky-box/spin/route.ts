import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { sendDiscordEmbed } from '@/lib/discord';
import { createNotification } from '@/lib/notifications';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const { boxId } = await req.json();
    if (!boxId) {
      return NextResponse.json({ success: false, error: 'MISSING_BOX_ID', message: 'กรุณาระบุรหัสกล่องสุ่ม' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const username = session.user.name || 'Unknown';

    const rateLimit = checkRateLimit(`lucky-spin:${userId}`, 10, 10000); // 10 spins per 10s
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณกดสุ่มบ่อยเกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    // Execute atomic transaction for the spin
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch active LuckyBox and rewards
      const box = await tx.luckyBox.findUnique({
        where: { id: boxId, isActive: true },
        include: { rewards: true },
      });

      if (!box) {
        throw new Error('BOX_NOT_FOUND');
      }

      const activeRewards = box.rewards.filter((r) => r.dropRate > 0);
      if (activeRewards.length === 0) {
        throw new Error('NO_REWARDS_AVAILABLE');
      }

      // 2. Fetch User and verify balance
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      if (user.balance < box.price) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // 3. Weighted Random Algorithm
      const totalWeight = activeRewards.reduce((sum, r) => sum + r.dropRate, 0);
      if (totalWeight <= 0) {
        throw new Error('INVALID_WEIGHTS');
      }

      const randomRoll = Math.random() * totalWeight;
      let cumulativeWeight = 0;
      let selectedReward = activeRewards[0];

      for (const reward of activeRewards) {
        cumulativeWeight += reward.dropRate;
        if (randomRoll <= cumulativeWeight) {
          selectedReward = reward;
          break;
        }
      }

      // 4. Handle Reward logic
      let decryptedAccountData: string | null = null;
      let stockItemToLink: string | null = null;
      let remainingStockCount: number | null = null;
      let outOfStockProductId: string | null = null;
      let outOfStockProductTitle: string | null = null;

      let balanceDelta = -box.price; // Deduct box price
      let pointsDelta = 0;

      if (selectedReward.type === 'ACCOUNT') {
        if (!selectedReward.productId) {
          throw new Error('ACCOUNT_CONFIG_ERROR');
        }

        const product = await tx.product.findUnique({
          where: { id: selectedReward.productId, isActive: true },
        });

        if (!product) {
          throw new Error('ACCOUNT_PRODUCT_NOT_FOUND');
        }

        // Find available unsold stock
        const stockItem = await tx.stockItem.findFirst({
          where: { productId: selectedReward.productId, isSold: false },
        });

        if (!stockItem) {
          // If no accounts left in stock, abort safely WITHOUT charging the user
          throw new Error('STOCK_EMPTY');
        }

        stockItemToLink = stockItem.id;
        decryptedAccountData = decrypt(stockItem.accountData);

        // Check remaining stock count
        const remaining = await tx.stockItem.count({
          where: { productId: selectedReward.productId, isSold: false, id: { not: stockItem.id } },
        });
        remainingStockCount = remaining;
        if (remaining === 0) {
          outOfStockProductId = product.id;
          outOfStockProductTitle = product.title;
        }
      } else if (selectedReward.type === 'CREDIT') {
        const creditValue = parseFloat(selectedReward.value) || 0;
        balanceDelta += creditValue;
      } else if (selectedReward.type === 'POINT') {
        const pointValue = parseInt(selectedReward.value, 10) || 0;
        pointsDelta += pointValue;
      }

      // 5. Update user balance & points
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: balanceDelta },
          points: { increment: pointsDelta },
        },
      });

      // Record point transaction if points rewarded
      if (pointsDelta > 0) {
        await tx.pointTransaction.create({
          data: {
            userId,
            amount: pointsDelta,
            type: 'LUCKY_BOX',
            description: `แต้มรางวัลจากการสุ่ม ${box.name}`,
          },
        });
      }

      // 6. Create Order record for history
      const order = await tx.order.create({
        data: {
          userId,
          luckyBoxId: box.id,
          type: 'LUCKY_BOX',
          status: 'COMPLETED',
          totalAmount: box.price,
          customerInput: JSON.stringify({
            rewardId: selectedReward.id,
            rewardName: selectedReward.name,
            rewardType: selectedReward.type,
            rewardValue: selectedReward.value,
          }),
        },
      });

      // 7. If ACCOUNT reward, update StockItem
      if (stockItemToLink) {
        await tx.stockItem.update({
          where: { id: stockItemToLink },
          data: {
            isSold: true,
            soldAt: new Date(),
            orderId: order.id,
          },
        });
      }

      return {
        orderId: order.id,
        boxName: box.name,
        boxPrice: box.price,
        reward: {
          id: selectedReward.id,
          name: selectedReward.name,
          type: selectedReward.type,
          value: selectedReward.value,
        },
        accountData: decryptedAccountData,
        newBalance: updatedUser.balance,
        newPoints: updatedUser.points,
        outOfStockProductId,
        outOfStockProductTitle,
      };
    });

    // In-App Notification
    await createNotification({
      userId,
      type: 'LUCKY_BOX_WIN',
      title: `เปิดกล่องสุ่ม ${result.boxName}!`,
      message: `คุณได้รับรางวัล: ${result.reward.name} (${result.reward.type})`,
      link: `/orders/${result.orderId}`,
    });

    // Send Discord Webhook for Lucky Box Spin
    await sendDiscordEmbed({
      type: 'LUCKY_BOX_WIN',
      data: {
        username,
        boxName: result.boxName,
        price: result.boxPrice,
        rewardName: result.reward.name,
        rewardType: result.reward.type,
        orderId: result.orderId,
      },
    });

    // If account stock was exhausted, notify OUT_OF_STOCK
    if (result.outOfStockProductId && result.outOfStockProductTitle) {
      await sendDiscordEmbed({
        type: 'OUT_OF_STOCK',
        data: {
          productId: result.outOfStockProductId,
          productTitle: result.outOfStockProductTitle,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.orderId,
        reward: result.reward,
        accountData: result.accountData,
        newBalance: result.newBalance,
        newPoints: result.newPoints,
      },
    });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ success: false, error: 'INSUFFICIENT_BALANCE', message: 'ยอดเงินคงเหลือไม่เพียงพอสำหรับการสุ่ม' }, { status: 400 });
    }
    if (err.message === 'STOCK_EMPTY') {
      return NextResponse.json({ success: false, error: 'STOCK_EMPTY', message: 'ไอดีของรางวัลในระบบหมดชั่วคราว (ไม่ถูกหักเงิน)' }, { status: 400 });
    }
    if (err.message === 'BOX_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'BOX_NOT_FOUND', message: 'ไม่พบกล่องสุ่มนี้ หรือกล่องยังไม่เปิดใช้งาน' }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: 'SERVER_ERROR',
      message: err.message || 'เกิดข้อผิดพลาดในการสุ่มรางวัล',
    }, { status: 500 });
  }
}
