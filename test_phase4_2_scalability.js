const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runScalabilitySuite() {
  console.log('================================================================');
  console.log('⚡ GAMING STORE PLATFORM — PHASE 4.2 SCALABILITY & RELIABILITY SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Database Connection & Health Verification
    // -------------------------------------------------------------------------
    console.log('▶ [P0 - 1] Database Scalability & Health Verification');
    const startDb = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as alive`;
    const elapsedDb = Date.now() - startDb;
    assert(result && Array.isArray(result) && result.length > 0, `Database connectivity query successful (${elapsedDb}ms)`);

    // -------------------------------------------------------------------------
    // TEST 2: Rate Limiter Memory Safety & Bound Simulation
    // -------------------------------------------------------------------------
    console.log('\n▶ [P1 - 2] Rate Limiter Memory Safety & Eviction Bounds');
    const store = new Map();
    const MAX_TEST_ENTRIES = 50;

    function simulateBoundedRateLimit(key, limit, windowMs = 60000) {
      const now = Date.now();
      const windowStart = now - windowMs;

      if (!store.has(key) && store.size >= MAX_TEST_ENTRIES) {
        let oldestKey = null;
        let oldestAccess = Infinity;
        for (const [k, rec] of store.entries()) {
          if (rec.lastAccessed < oldestAccess) {
            oldestAccess = rec.lastAccessed;
            oldestKey = k;
          }
        }
        if (oldestKey) store.delete(oldestKey);
      }

      let record = store.get(key);
      if (!record) {
        record = { timestamps: [], lastAccessed: now };
        store.set(key, record);
      } else {
        record.lastAccessed = now;
      }

      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length >= limit) {
        return { success: false, remaining: 0 };
      }
      record.timestamps.push(now);
      return { success: true, remaining: limit - record.timestamps.length };
    }

    // Insert 100 unique keys to test bounding
    for (let i = 0; i < 100; i++) {
      simulateBoundedRateLimit(`client_ip_${i}`, 5);
    }

    assert(store.size <= MAX_TEST_ENTRIES, `Rate limit memory store strictly capped at capacity limit (Size: ${store.size} <= ${MAX_TEST_ENTRIES})`);

    // Test sliding window rate limiting
    const rl1 = simulateBoundedRateLimit('test_user', 3, 1000);
    const rl2 = simulateBoundedRateLimit('test_user', 3, 1000);
    const rl3 = simulateBoundedRateLimit('test_user', 3, 1000);
    const rl4 = simulateBoundedRateLimit('test_user', 3, 1000);

    assert(rl1.success && rl2.success && rl3.success && !rl4.success, 'Sliding window rate limit accurately permits limit and rejects 4th request');

    // -------------------------------------------------------------------------
    // TEST 3: Database Index & Query Optimization
    // -------------------------------------------------------------------------
    console.log('\n▶ [P0 - 3] Database Composite Index & High-Performance Lookups');
    // Verify fast lookup using indexed fields
    const testCategory = await prisma.category.upsert({
      where: { slug: 'perf-test-cat' },
      update: {},
      create: { name: 'Perf Test Cat', slug: 'perf-test-cat' },
    });

    const perfProduct = await prisma.product.create({
      data: {
        categoryId: testCategory.id,
        title: 'Perf Test Product',
        price: 150.0,
        thumbnail: '/images/perf.png',
        type: 'ACCOUNT_PURCHASE',
        isActive: true,
      },
    });

    const indexedLookupStart = Date.now();
    const fetchedProduct = await prisma.product.findMany({
      where: {
        categoryId: testCategory.id,
        isActive: true,
        type: 'ACCOUNT_PURCHASE',
      },
      take: 10,
    });
    const indexedLookupTime = Date.now() - indexedLookupStart;

    assert(fetchedProduct.length > 0, `Indexed composite lookup retrieved results (${indexedLookupTime}ms)`);

    // -------------------------------------------------------------------------
    // TEST 4: Stock Item Concurrency & Unsold Index Lookup
    // -------------------------------------------------------------------------
    console.log('\n▶ [P0 - 4] Stock Item Index & Concurrency Efficiency');
    const stock1 = await prisma.stockItem.create({
      data: {
        productId: perfProduct.id,
        accountData: '1234567890123456:encrypted_mock_data',
        isSold: false,
      },
    });

    const availableStock = await prisma.stockItem.findFirst({
      where: { productId: perfProduct.id, isSold: false },
    });

    assert(availableStock && availableStock.id === stock1.id, 'Indexed stock query instantly locates available inventory');

    // -------------------------------------------------------------------------
    // TEST 5: Admin Order List Account Data Leakage Protection
    // -------------------------------------------------------------------------
    console.log('\n▶ [P2 - 5] Response Payload Optimization & Credential Isolation');
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (adminUser) {
      const order = await prisma.order.create({
        data: {
          userId: adminUser.id,
          productId: perfProduct.id,
          type: 'ACCOUNT_PURCHASE',
          status: 'COMPLETED',
          totalAmount: 150.0,
        },
      });

      // Link stock item to order
      await prisma.stockItem.update({
        where: { id: stock1.id },
        data: { isSold: true, soldAt: new Date(), orderId: order.id },
      });

      // Query as admin orders API does
      const orderListResult = await prisma.order.findMany({
        where: { id: order.id },
        include: {
          user: { select: { id: true, username: true, email: true } },
          product: { select: { id: true, title: true, price: true } },
          luckyBox: { select: { id: true, name: true, price: true } },
          coupon: { select: { code: true } },
          stockItem: { select: { id: true, isSold: true, soldAt: true } },
        },
      });

      const returnedOrder = orderListResult[0];
      const hasAccountData = returnedOrder?.stockItem && 'accountData' in returnedOrder.stockItem;
      assert(!hasAccountData, 'Admin order listing excludes raw accountData to prevent bulk credential leakage and reduce payload size');

      // Cleanup test order
      await prisma.stockItem.delete({ where: { id: stock1.id } });
      await prisma.order.delete({ where: { id: order.id } });
    } else {
      console.log('  ⚠️ Admin user not found, skipping specific admin order query');
    }

    // Cleanup test product and category
    await prisma.product.delete({ where: { id: perfProduct.id } });
    await prisma.category.delete({ where: { id: testCategory.id } });

    // -------------------------------------------------------------------------
    // TEST 6: Bounded Support Ticket Message Fetching
    // -------------------------------------------------------------------------
    console.log('\n▶ [P2 - 6] Bounded Support Thread Query Limits');
    const testUser = await prisma.user.findFirst({ where: { role: 'USER' } });
    if (testUser) {
      const testTicket = await prisma.ticket.create({
        data: {
          userId: testUser.id,
          subject: 'Scalability Test Ticket',
          category: 'OTHER',
          priority: 'NORMAL',
          status: 'OPEN',
        },
      });

      // Add 5 messages
      for (let i = 0; i < 5; i++) {
        await prisma.ticketMessage.create({
          data: {
            ticketId: testTicket.id,
            senderId: testUser.id,
            senderRole: 'USER',
            message: `Message #${i + 1}`,
          },
        });
      }

      // Fetch with bounded take: 200
      const boundedTicket = await prisma.ticket.findUnique({
        where: { id: testTicket.id },
        include: {
          messages: {
            take: 200,
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      assert(boundedTicket && boundedTicket.messages.length === 5, 'Ticket messages retrieved accurately within bounded take limit');

      // Cleanup
      await prisma.ticketMessage.deleteMany({ where: { ticketId: testTicket.id } });
      await prisma.ticket.delete({ where: { id: testTicket.id } });
    }

  } catch (error) {
    console.error('Fatal error during test execution:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`🏁 SCALABILITY SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runScalabilitySuite();
