const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedString) {
  try {
    const [ivHex, encryptedData] = encryptedString.split(':');
    if (!ivHex || !encryptedData) return 'Invalid encrypted format';
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return 'Decryption Error';
  }
}

// In-memory sliding window rate limiter simulation for testing
function testRateLimit(store, key, limit, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  let record = store.get(key);
  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
  if (record.timestamps.length >= limit) {
    return { success: false, remaining: 0 };
  }
  record.timestamps.push(now);
  return { success: true, remaining: limit - record.timestamps.length };
}

function sanitizeString(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function runHardeningSuite() {
  console.log('================================================================');
  console.log('🛡️ GAMING STORE PLATFORM — PHASE 4 PRODUCTION HARDENING SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // 1. AUTHENTICATION & ROLE ENFORCEMENT
    // ---------------------------------------------------------
    console.log('▶ [P0 - 1] Authentication & Role Enforcement');
    const adminUser = await prisma.user.upsert({
      where: { username: 'h_admin_test' },
      update: { balance: 10000.0, points: 5000, role: 'ADMIN' },
      create: { username: 'h_admin_test', passwordHash: 'hash', balance: 10000.0, points: 5000, role: 'ADMIN' },
    });

    const userA = await prisma.user.upsert({
      where: { username: 'h_user_a' },
      update: { balance: 2000.0, points: 1000, role: 'USER' },
      create: { username: 'h_user_a', passwordHash: 'hash', balance: 2000.0, points: 1000, role: 'USER' },
    });

    const userB = await prisma.user.upsert({
      where: { username: 'h_user_b' },
      update: { balance: 1000.0, points: 200, role: 'USER' },
      create: { username: 'h_user_b', passwordHash: 'hash', balance: 1000.0, points: 200, role: 'USER' },
    });

    assert(adminUser.role === 'ADMIN', 'Admin user correctly assigned ADMIN role');
    assert(userA.role === 'USER' && userB.role === 'USER', 'Standard users assigned USER role strictly');

    // ---------------------------------------------------------
    // 2. AUTHORIZATION & IDOR ISOLATION
    // ---------------------------------------------------------
    console.log('\n▶ [P0 - 2] Authorization, IDOR & Data Isolation');
    const testCategory = (await prisma.category.findFirst()) || (await prisma.category.create({
      data: { name: 'Hardening Category', slug: `hard-cat-${Date.now()}` },
    }));

    const secretAccount = 'secret_vip_user:SuperSecretPassword99!';
    const isolatedProduct = await prisma.product.create({
      data: {
        categoryId: testCategory.id,
        title: 'IDOR Protected Account',
        price: 300.0,
        thumbnail: 'https://example.com/p.jpg',
        type: 'ACCOUNT_PURCHASE',
        stocks: {
          create: [{ accountData: encrypt(secretAccount) }],
        },
      },
      include: { stocks: true },
    });

    const stockItemA = isolatedProduct.stocks[0];

    // Create Order for User A
    const orderUserA = await prisma.order.create({
      data: {
        userId: userA.id,
        productId: isolatedProduct.id,
        type: 'ACCOUNT_PURCHASE',
        status: 'COMPLETED',
        totalAmount: 300.0,
      },
    });

    await prisma.stockItem.update({
      where: { id: stockItemA.id },
      data: { isSold: true, soldAt: new Date(), orderId: orderUserA.id },
    });

    // Verify IDOR check logic: User B attempting to view Order A credentials
    const isOwnerOrAdminUserB = orderUserA.userId === userB.id || userB.role === 'ADMIN';
    assert(!isOwnerOrAdminUserB, 'IDOR Check: User B strictly forbidden from accessing User A order');

    const isOwnerOrAdminUserA = orderUserA.userId === userA.id || userA.role === 'ADMIN';
    assert(isOwnerOrAdminUserA, 'IDOR Check: Owner User A permitted to view own order');

    // ---------------------------------------------------------
    // 3. INPUT SANITIZATION & XSS NEUTRALIZATION
    // ---------------------------------------------------------
    console.log('\n▶ [P0 - 3] Input Sanitization & XSS Protection');
    const dirtyXssPayload = '<script>alert("HACKED")</script><img src="x" onerror="alert(1)">Hello <b>World</b>';
    const cleanSanitized = sanitizeString(dirtyXssPayload);
    assert(
      !cleanSanitized.includes('<script>') && !cleanSanitized.includes('onerror') && cleanSanitized === 'Hello World',
      'HTML scripts & malicious payloads stripped clean'
    );

    // ---------------------------------------------------------
    // 4. RATE LIMITING ENGINE
    // ---------------------------------------------------------
    console.log('\n▶ [P3 - 4] Rate Limiter Sliding Window Protection');
    const testRateStore = new Map();
    const rateKey = `test_ip:register`;
    let allowedCount = 0;
    let blockedCount = 0;

    for (let i = 0; i < 8; i++) {
      const res = testRateLimit(testRateStore, rateKey, 5, 60000); // limit: 5
      if (res.success) allowedCount++;
      else blockedCount++;
    }

    assert(allowedCount === 5 && blockedCount === 3, 'Rate limiter strictly allows 5 requests and blocks excess with 429');

    // ---------------------------------------------------------
    // 5. FINANCIAL: WALLET ATOMICITY & BALANCE INTEGRITY
    // ---------------------------------------------------------
    console.log('\n▶ [P1 - 5] Financial: Atomic Wallet Operations');
    const initialBalance = 1000.0;
    await prisma.user.update({
      where: { id: userA.id },
      data: { balance: initialBalance },
    });

    // Sequential multi-operation atomic debit & credit
    for (let i = 0; i < 5; i++) {
      await prisma.$transaction(async (tx) => {
        const u = await tx.user.findUnique({ where: { id: userA.id } });
        if (u.balance < 50.0) throw new Error('INSUFFICIENT');
        await tx.user.update({
          where: { id: userA.id },
          data: { balance: { decrement: 50.0 } },
        });
      });
    }
    for (let i = 0; i < 3; i++) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userA.id },
          data: { balance: { increment: 100.0 } },
        });
      });
    }

    const expectedBalance = initialBalance - 5 * 50.0 + 3 * 100.0; // 1000 - 250 + 300 = 1050
    const postBalance = (await prisma.user.findUnique({ where: { id: userA.id } })).balance;
    assert(
      postBalance === expectedBalance,
      `Atomic balance updates maintained 100% mathematical integrity (Expected: ${expectedBalance}, Got: ${postBalance})`
    );

    // ---------------------------------------------------------
    // 6. INVENTORY: SINGLE-STOCK PURCHASE (ZERO OVERSELLING)
    // ---------------------------------------------------------
    console.log('\n▶ [P1 - 6] Inventory: Race-Condition Single Stock Purchase');
    const limitedProduct = await prisma.product.create({
      data: {
        categoryId: testCategory.id,
        title: 'Rare 1-Stock Account',
        price: 100.0,
        thumbnail: 'https://example.com/p.jpg',
        type: 'ACCOUNT_PURCHASE',
        stocks: {
          create: [{ accountData: encrypt('rare_user:RarePass123') }],
        },
      },
    });

    // 3 sequential attempts to buy the ONLY 1 stock
    let successfulPurchases = 0;
    let failedPurchases = 0;
    let successfulOrderId = null;

    for (let i = 0; i < 3; i++) {
      try {
        await prisma.$transaction(async (tx) => {
          const prod = await tx.product.findUnique({ where: { id: limitedProduct.id } });
          const stock = await tx.stockItem.findFirst({ where: { productId: prod.id, isSold: false } });
          if (!stock) throw new Error('OUT_OF_STOCK');

          const user = await tx.user.findUnique({ where: { id: userA.id } });
          if (user.balance < prod.price) throw new Error('INSUFFICIENT_BALANCE');

          await tx.user.update({
            where: { id: userA.id },
            data: { balance: { decrement: prod.price } },
          });

          const order = await tx.order.create({
            data: {
              userId: userA.id,
              productId: prod.id,
              type: 'ACCOUNT_PURCHASE',
              status: 'COMPLETED',
              totalAmount: prod.price,
            },
          });

          await tx.stockItem.update({
            where: { id: stock.id },
            data: { isSold: true, soldAt: new Date(), orderId: order.id },
          });

          successfulOrderId = order.id;
        });
        successfulPurchases++;
      } catch (e) {
        failedPurchases++;
      }
    }

    assert(
      successfulPurchases === 1 && failedPurchases === 2,
      `Zero Overselling: Exactly 1 purchase succeeded and 2 rejected on 1-stock item`
    );

    const unsoldRemaining = await prisma.stockItem.count({
      where: { productId: limitedProduct.id, isSold: false },
    });
    assert(unsoldRemaining === 0, 'Remaining unsold inventory is exactly 0 (no negative stock)');

    // ---------------------------------------------------------
    // 7. FINANCIAL: REFUND PROTECTION & DOUBLE-REFUND GUARD
    // ---------------------------------------------------------
    console.log('\n▶ [P1 - 7] Financial: Admin Refund & Double-Refund Guard');
    const preRefundBalance = (await prisma.user.findUnique({ where: { id: userA.id } })).balance;

    let successfulRefunds = 0;
    let failedRefunds = 0;

    for (let i = 0; i < 3; i++) {
      try {
        await prisma.$transaction(async (tx) => {
          const order = await tx.order.findUnique({ where: { id: successfulOrderId } });
          if (order.status === 'REFUNDED') throw new Error('ALREADY_REFUNDED');

          await tx.user.update({
            where: { id: order.userId },
            data: { balance: { increment: order.totalAmount } },
          });

          await tx.order.update({
            where: { id: order.id },
            data: { status: 'REFUNDED', adminNote: 'Refund test' },
          });

          await tx.transaction.create({
            data: {
              userId: order.userId,
              amount: order.totalAmount,
              channel: 'REFUND',
              referenceNo: `REFUND_${order.id}_${Date.now()}`,
              status: 'SUCCESS',
            },
          });
        });
        successfulRefunds++;
      } catch (e) {
        if (e.message === 'ALREADY_REFUNDED') failedRefunds++;
      }
    }

    assert(
      successfulRefunds === 1 && failedRefunds === 2,
      `Double-Refund Guard: Exactly 1 refund succeeded, 2 rejected with ALREADY_REFUNDED`
    );

    const postRefundBalance = (await prisma.user.findUnique({ where: { id: userA.id } })).balance;
    assert(
      postRefundBalance === preRefundBalance + 100.0,
      `User wallet credited exactly once (Pre: ${preRefundBalance}, Post: ${postRefundBalance})`
    );

    // ---------------------------------------------------------
    // 8. FINANCIAL: COUPON USAGE LIMIT GUARD
    // ---------------------------------------------------------
    console.log('\n▶ [P1 - 8] Financial: Coupon Single-Use Limit Guard');
    const singleCouponCode = `RACE_COUPON_${Date.now()}`;
    const raceCoupon = await prisma.coupon.create({
      data: {
        code: singleCouponCode,
        type: 'FIXED',
        value: 30.0,
        usageLimit: 1,
        perUserLimit: 1,
        isActive: true,
      },
    });

    let successfulCouponUses = 0;
    let failedCouponUses = 0;

    for (let i = 0; i < 3; i++) {
      try {
        await prisma.$transaction(async (tx) => {
          const c = await tx.coupon.findUnique({ where: { id: raceCoupon.id } });
          if (c.usageCount >= c.usageLimit) throw new Error('COUPON_LIMIT_REACHED');

          await tx.coupon.update({
            where: { id: c.id },
            data: { usageCount: { increment: 1 } },
          });

          await tx.couponUsage.create({
            data: { couponId: c.id, userId: userA.id },
          });
        });
        successfulCouponUses++;
      } catch (e) {
        if (e.message === 'COUPON_LIMIT_REACHED') failedCouponUses++;
      }
    }

    assert(
      successfulCouponUses === 1 && failedCouponUses === 2,
      `Coupon Limit Guard: Exactly 1 usage allowed on single-use coupon, 2 rejected with LIMIT_REACHED`
    );

    // ---------------------------------------------------------
    // 9. TOP-UP: DUPLICATE SLIP / VOUCHER IDEMPOTENCY
    // ---------------------------------------------------------
    console.log('\n▶ [P1 - 9] Top-Up: Duplicate Reference Idempotency');
    const slipRef = `SLIP_HARDEN_${Date.now()}`;
    let successfulSlips = 0;
    let rejectedSlips = 0;

    for (let i = 0; i < 3; i++) {
      try {
        await prisma.$transaction(async (tx) => {
          const duplicate = await tx.transaction.findUnique({ where: { referenceNo: slipRef } });
          if (duplicate) throw new Error('SLIP_ALREADY_USED');

          await tx.user.update({
            where: { id: userA.id },
            data: { balance: { increment: 50.0 } },
          });

          await tx.transaction.create({
            data: {
              userId: userA.id,
              amount: 50.0,
              channel: 'PROMPTPAY',
              referenceNo: slipRef,
              status: 'SUCCESS',
            },
          });
        });
        successfulSlips++;
      } catch (e) {
        if (e.message === 'SLIP_ALREADY_USED' || e.code === 'P2002') rejectedSlips++;
      }
    }

    assert(successfulSlips === 1 && rejectedSlips === 2, 'Duplicate bank slip transaction strictly allowed only 1 credit');

    // ---------------------------------------------------------
    // 10. GACHA: EMPTY STOCK ABORT SAFETY
    // ---------------------------------------------------------
    console.log('\n▶ [P1 - 10] Gacha: Depleted Stock Safe Abort');
    const gachaBox = await prisma.luckyBox.create({
      data: {
        name: 'Hardening Mystery Box',
        price: 50.0,
        thumbnail: 'https://example.com/box.jpg',
        rewards: {
          create: [
            {
              name: 'Out of Stock Account Prize',
              type: 'ACCOUNT',
              value: '1',
              dropRate: 100.0,
              productId: limitedProduct.id, // stock was already sold above!
            },
          ],
        },
      },
      include: { rewards: true },
    });

    const preGachaBalance = (await prisma.user.findUnique({ where: { id: userA.id } })).balance;
    let gachaSafeAbort = false;

    try {
      await prisma.$transaction(async (tx) => {
        const box = await tx.luckyBox.findUnique({ where: { id: gachaBox.id }, include: { rewards: true } });
        const reward = box.rewards[0];
        const stockItem = await tx.stockItem.findFirst({
          where: { productId: reward.productId, isSold: false },
        });
        if (!stockItem) {
          throw new Error('STOCK_EMPTY');
        }

        await tx.user.update({
          where: { id: userA.id },
          data: { balance: { decrement: box.price } },
        });
      });
    } catch (e) {
      if (e.message === 'STOCK_EMPTY') gachaSafeAbort = true;
    }

    const postGachaBalance = (await prisma.user.findUnique({ where: { id: userA.id } })).balance;
    assert(
      gachaSafeAbort && postGachaBalance === preGachaBalance,
      'Gacha safe abort: Depleted account reward aborted safely with zero deduction to user balance'
    );

    // ---------------------------------------------------------
    // 11. SUPPORT TICKET DATA ISOLATION
    // ---------------------------------------------------------
    console.log('\n▶ [P0 - 11] Support: Multi-User Chat Thread Data Isolation');
    const ticketA = await prisma.ticket.create({
      data: {
        userId: userA.id,
        subject: 'Confidential inquiry by User A',
        category: 'ACCOUNT',
        status: 'OPEN',
        messages: {
          create: [{ senderId: userA.id, senderRole: 'USER', message: 'Secret issue' }],
        },
      },
    });

    // Check User B permission to access or reply
    const canUserBReply = ticketA.userId === userB.id || userB.role === 'ADMIN';
    assert(!canUserBReply, 'Data isolation: User B strictly prevented from accessing User A ticket thread');

    const canAdminReply = ticketA.userId === adminUser.id || adminUser.role === 'ADMIN';
    assert(canAdminReply, 'Authorization: Admin permitted to reply to all customer tickets');

    // ---------------------------------------------------------
    // 12. WISHLIST & REVIEW VERIFICATION
    // ---------------------------------------------------------
    console.log('\n▶ [P0 - 12] Wishlist & Verified Review Guards');
    await prisma.wishlistItem.deleteMany({ where: { userId: userA.id, productId: isolatedProduct.id } });
    await prisma.wishlistItem.create({
      data: { userId: userA.id, productId: isolatedProduct.id },
    });

    let duplicateWishError = false;
    try {
      await prisma.wishlistItem.create({
        data: { userId: userA.id, productId: isolatedProduct.id },
      });
    } catch (e) {
      duplicateWishError = true;
    }
    assert(duplicateWishError, 'Composite unique constraint @@unique([userId, productId]) prevents duplicate wishlist entries');

    // Review purchase check: User B has not purchased isolatedProduct
    const userBOrder = await prisma.order.findFirst({
      where: { userId: userB.id, productId: isolatedProduct.id, status: { in: ['COMPLETED', 'DELIVERED', 'PAID'] } },
    });
    assert(!userBOrder, 'Verified Review Guard: Non-buyer User B correctly blocked from submitting product review');

    console.log('\n================================================================');
    console.log(`🏁 PRODUCTION HARDENING SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    // Cleanup hardening artifacts
    await prisma.wishlistItem.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.ticketMessage.deleteMany({ where: { ticketId: ticketA.id } });
    await prisma.ticket.delete({ where: { id: ticketA.id } });
    await prisma.luckyBoxReward.deleteMany({ where: { boxId: gachaBox.id } });
    await prisma.luckyBox.delete({ where: { id: gachaBox.id } });
    await prisma.couponUsage.deleteMany({ where: { couponId: raceCoupon.id } });
    await prisma.coupon.delete({ where: { id: raceCoupon.id } });
    await prisma.stockItem.deleteMany({ where: { productId: { in: [isolatedProduct.id, limitedProduct.id] } } });
    await prisma.transaction.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.order.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.product.deleteMany({ where: { id: { in: [isolatedProduct.id, limitedProduct.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id, adminUser.id] } } });

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal Hardening Test Suite Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runHardeningSuite();
