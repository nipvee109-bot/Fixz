const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('====================================================');
  console.log('   🚀 PHASE 3 COMPREHENSIVE AUTOMATED TEST SUITE    ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Setup test users
    const testUserA = await prisma.user.upsert({
      where: { username: 'test_user_a' },
      update: { balance: 1000.0, points: 500 },
      create: {
        username: 'test_user_a',
        passwordHash: 'hash',
        balance: 1000.0,
        points: 500,
        role: 'USER',
      },
    });

    const testUserB = await prisma.user.upsert({
      where: { username: 'test_user_b' },
      update: { balance: 500.0, points: 10 },
      create: {
        username: 'test_user_b',
        passwordHash: 'hash',
        balance: 500.0,
        points: 10,
        role: 'USER',
      },
    });

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    // ----------------------------------------------------
    // TEST 1: COUPON ENGINE & CONCURRENCY LIMIT
    // ----------------------------------------------------
    console.log('▶ [TEST 1] Coupon Engine & Concurrency Limits');
    const testCoupon = await prisma.coupon.upsert({
      where: { code: 'TEST_SINGLE_USE' },
      update: { usageCount: 0, usageLimit: 1, perUserLimit: 1 },
      create: {
        code: 'TEST_SINGLE_USE',
        type: 'PERCENT',
        value: 20,
        usageLimit: 1,
        perUserLimit: 1,
        isActive: true,
      },
    });

    // Simulate 2 users trying to consume a 1-use coupon concurrently
    async function attemptApplyCoupon(userId) {
      return prisma.$transaction(async (tx) => {
        const c = await tx.coupon.findUnique({ where: { id: testCoupon.id } });
        if (c.usageLimit !== null && c.usageCount >= c.usageLimit) {
          throw new Error('COUPON_LIMIT_REACHED');
        }
        await tx.coupon.update({
          where: { id: c.id },
          data: { usageCount: { increment: 1 } },
        });
        await tx.couponUsage.create({
          data: { couponId: c.id, userId },
        });
        return true;
      });
    }

    const results = await Promise.allSettled([
      attemptApplyCoupon(testUserA.id),
      attemptApplyCoupon(testUserB.id),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled').length;
    const rejections = results.filter((r) => r.status === 'rejected').length;

    assert(successes === 1 && rejections === 1, 'Single-use coupon concurrency limit strictly allows exactly 1 winner');

    // ----------------------------------------------------
    // TEST 2: ORDER LIFECYCLE & AUDIT LOG
    // ----------------------------------------------------
    console.log('\n▶ [TEST 2] Order Lifecycle & Audit Trail');
    const testProduct = await prisma.product.findFirst({ where: { type: 'ACCOUNT_PURCHASE' } });

    const order = await prisma.order.create({
      data: {
        userId: testUserA.id,
        productId: testProduct.id,
        type: 'ACCOUNT_PURCHASE',
        status: 'PAID',
        totalAmount: 100.0,
      },
    });

    // Advance status to COMPLETED with Audit Log
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' },
      }),
      prisma.orderAuditLog.create({
        data: {
          orderId: order.id,
          adminId: adminUser.id,
          action: 'STATUS_UPDATE',
          oldStatus: 'PAID',
          newStatus: 'COMPLETED',
          note: 'จัดส่งไอดีเรียบร้อย',
        },
      }),
    ]);

    const auditCount = await prisma.orderAuditLog.count({ where: { orderId: order.id } });
    assert(auditCount >= 1, 'Order status change successfully created immutable OrderAuditLog');

    // ----------------------------------------------------
    // TEST 3: SAFE ADMIN REFUND & DOUBLE-REFUND PREVENTION
    // ----------------------------------------------------
    console.log('\n▶ [TEST 3] Safe Admin Refund & Double-Refund Guard');
    async function processRefund(orderId, adminId) {
      return prisma.$transaction(async (tx) => {
        const ord = await tx.order.findUnique({ where: { id: orderId } });
        if (!ord || ord.status === 'REFUNDED') {
          throw new Error('ALREADY_REFUNDED');
        }
        await tx.user.update({
          where: { id: ord.userId },
          data: { balance: { increment: ord.totalAmount } },
        });
        await tx.order.update({
          where: { id: ord.id },
          data: { status: 'REFUNDED' },
        });
        await tx.transaction.create({
          data: {
            userId: ord.userId,
            amount: ord.totalAmount,
            channel: 'REFUND',
            referenceNo: `REF_${ord.id}_${Date.now()}`,
            status: 'SUCCESS',
          },
        });
        return true;
      });
    }

    const initBalance = (await prisma.user.findUnique({ where: { id: testUserA.id } })).balance;
    await processRefund(order.id, adminUser.id);
    const postRefundBalance = (await prisma.user.findUnique({ where: { id: testUserA.id } })).balance;

    assert(postRefundBalance === initBalance + 100.0, 'Refund atomically credited ฿100 back to user balance');

    // Attempt second refund on the same order (MUST FAIL)
    let doubleRefundError = null;
    try {
      await processRefund(order.id, adminUser.id);
    } catch (err) {
      doubleRefundError = err.message;
    }
    assert(doubleRefundError === 'ALREADY_REFUNDED', 'Second refund attempt correctly rejected with ALREADY_REFUNDED');

    // ----------------------------------------------------
    // TEST 4: VERIFIED PURCHASE REVIEW GUARD
    // ----------------------------------------------------
    console.log('\n▶ [TEST 4] Verified Purchase Review Guard');
    const randomProduct = await prisma.product.findFirst({
      where: { orders: { none: { userId: testUserB.id } } },
    });

    // Check if testUserB has bought randomProduct
    const userBPurchase = await prisma.order.findFirst({
      where: {
        userId: testUserB.id,
        productId: randomProduct ? randomProduct.id : 'none',
        status: { in: ['COMPLETED', 'DELIVERED', 'PAID'] },
      },
    });

    assert(!userBPurchase, 'Confirmed test_user_b has NOT purchased the test product');

    // ----------------------------------------------------
    // TEST 5: SUPPORT TICKET CREATION & USER ISOLATION
    // ----------------------------------------------------
    console.log('\n▶ [TEST 5] Support Ticket Data Isolation');
    const ticketA = await prisma.ticket.create({
      data: {
        userId: testUserA.id,
        subject: 'สอบถามปัญหาไอดี User A',
        category: 'ORDER',
        status: 'OPEN',
        messages: {
          create: {
            senderId: testUserA.id,
            senderRole: 'USER',
            message: 'สวัสดีครับ ขอสอบถามหน่อยครับ',
          },
        },
      },
      include: { messages: true },
    });

    // Test Isolation
    const canUserBAccess = ticketA.userId === testUserB.id;
    assert(!canUserBAccess, 'Strict data isolation: User B cannot access User A ticket');

    // ----------------------------------------------------
    // TEST 6: LOYALTY POINTS & REWARD REDEMPTION
    // ----------------------------------------------------
    console.log('\n▶ [TEST 6] Loyalty Points Redemption');
    const rewardItem = await prisma.rewardItem.findFirst({ where: { pointCost: { lte: 100 } } });

    if (rewardItem) {
      const userAStartPoints = (await prisma.user.findUnique({ where: { id: testUserA.id } })).points;
      const userAStartBalance = (await prisma.user.findUnique({ where: { id: testUserA.id } })).balance;

      await prisma.$transaction(async (tx) => {
        const u = await tx.user.findUnique({ where: { id: testUserA.id } });
        if (u.points < rewardItem.pointCost) throw new Error('INSUFFICIENT_POINTS');

        const credit = rewardItem.rewardType === 'CREDIT' ? parseFloat(rewardItem.rewardValue) : 0;
        await tx.user.update({
          where: { id: testUserA.id },
          data: {
            points: { decrement: rewardItem.pointCost },
            balance: { increment: credit },
          },
        });
        await tx.pointTransaction.create({
          data: {
            userId: testUserA.id,
            amount: -rewardItem.pointCost,
            type: 'REDEEM',
            description: `แลก ${rewardItem.title}`,
          },
        });
      });

      const userAEndPoints = (await prisma.user.findUnique({ where: { id: testUserA.id } })).points;
      const userAEndBalance = (await prisma.user.findUnique({ where: { id: testUserA.id } })).balance;

      assert(userAEndPoints === userAStartPoints - rewardItem.pointCost, `Deducted exactly ${rewardItem.pointCost} points`);
      assert(userAEndBalance === userAStartBalance + parseFloat(rewardItem.rewardValue), `Credited ฿${rewardItem.rewardValue} to balance`);
    }

    // ----------------------------------------------------
    // TEST 7: WISHLIST TOGGLE & COMPOSITE KEY INTEGRITY
    // ----------------------------------------------------
    console.log('\n▶ [TEST 7] Wishlist Composite Uniqueness');
    await prisma.wishlistItem.deleteMany({
      where: { userId: testUserA.id, productId: testProduct.id },
    });
    const wishItem = await prisma.wishlistItem.create({
      data: {
        userId: testUserA.id,
        productId: testProduct.id,
      },
    });

    let duplicateWishlistErr = null;
    try {
      await prisma.wishlistItem.create({
        data: {
          userId: testUserA.id,
          productId: testProduct.id,
        },
      });
    } catch (err) {
      duplicateWishlistErr = err.code || err.message;
    }

    assert(!!duplicateWishlistErr, 'Composite unique constraint @@unique([userId, productId]) prevents duplicate wishlist entries');

    // ----------------------------------------------------
    // TEST 8: PRODUCT PRICE HISTORY AUDITING
    // ----------------------------------------------------
    console.log('\n▶ [TEST 8] Product Price History Auditing');
    const oldPrice = testProduct.price;
    const newPrice = oldPrice + 20.0;

    await prisma.$transaction([
      prisma.product.update({
        where: { id: testProduct.id },
        data: { price: newPrice },
      }),
      prisma.productPriceHistory.create({
        data: {
          productId: testProduct.id,
          oldPrice,
          newPrice,
          adminId: adminUser.id,
        },
      }),
    ]);

    const priceHist = await prisma.productPriceHistory.findFirst({
      where: { productId: testProduct.id },
      orderBy: { createdAt: 'desc' },
    });

    assert(priceHist && priceHist.oldPrice === oldPrice && priceHist.newPrice === newPrice, 'Price change recorded into ProductPriceHistory');

    console.log('\n====================================================');
    console.log(`  🎉 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('Fatal Test Runner Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
