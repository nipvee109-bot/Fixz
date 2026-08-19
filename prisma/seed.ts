import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

async function main() {
  console.log('--- Seeding Database (Phase 3 Upgrade) ---');

  const adminPass = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@gamestore.local',
      passwordHash: adminPass,
      balance: 10000.0,
      points: 1000,
      role: 'ADMIN',
    },
  });

  const playerPass = await bcrypt.hash('demo123', 10);
  const player1 = await prisma.user.upsert({
    where: { username: 'player1' },
    update: {},
    create: {
      username: 'player1',
      email: 'player@gamestore.local',
      passwordHash: playerPass,
      balance: 2000.0,
      points: 450,
      role: 'USER',
    },
  });

  const catBlox = await prisma.category.upsert({
    where: { slug: 'blox-fruits' },
    update: {},
    create: {
      name: 'Roblox Blox Fruits',
      slug: 'blox-fruits',
      description: 'ไอดีไก่ตัน ผลตื่น ดาบคู่ และสายฟาร์มครบเซ็ต',
      iconUrl: '🗡️',
    },
  });

  const catFarm = await prisma.category.upsert({
    where: { slug: 'game-farming' },
    update: {},
    create: {
      name: 'บริการรับฟาร์ม & เติมเกม',
      slug: 'game-farming',
      description: 'บริการฟาร์มเวล ปลดล็อคเผ่า V4 ดาบโซโล ส่งงานไว 100%',
      iconUrl: '⚡',
    },
  });

  const catVal = await prisma.category.upsert({
    where: { slug: 'valorant' },
    update: {},
    create: {
      name: 'Valorant Accounts',
      slug: 'valorant',
      description: 'ไอดีแรงค์สูง สกิน Kuronami, Prime, Reaver ครบเซ็ต',
      iconUrl: '🎯',
    },
  });

  // Products
  const productAccount = await prisma.product.create({
    data: {
      categoryId: catBlox.id,
      title: 'ไก่ตัน Max Lv 2550 + ดาบคู่ Cursed Dual Katana + ผลโมจิ V2',
      description: 'ไอดีสะอาด ปลอดภัย เปลี่ยนรหัส/อีเมลได้ทันที ประกัน 30 วัน',
      price: 249.0,
      originalPrice: 299.0,
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
      type: 'ACCOUNT_PURCHASE',
      lowStockThreshold: 3,
      stocks: {
        create: [
          { accountData: encrypt('blox_master99:GodPass99!@:unverified_email') },
          { accountData: encrypt('dragon_king01:SuperPass77:unverified_email') },
          { accountData: encrypt('godhuman_pro:NinjaGod#123:unverified_email') },
        ],
      },
    },
  });

  const productFarm = await prisma.product.create({
    data: {
      categoryId: catFarm.id,
      title: 'รับฟาร์มเวล 1 - 2550 (Max) บอทความเร็วสูง ปลอดภัย ไม่โดนแบน',
      description: 'เสร็จไวภายใน 4-6 ชั่วโมง พร้อมส่งมอบงาน',
      price: 89.0,
      originalPrice: 120.0,
      thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
      type: 'FARMING_SERVICE',
    },
  });

  const productVal = await prisma.product.create({
    data: {
      categoryId: catVal.id,
      title: 'Valorant Ascendant Rank + Kuronami Vandal + Champions 2023',
      description: 'ไอดีเซิร์ฟเวอร์ APAC แท้ ไม่เคยติดแบน มีมีดแชมเปี้ยน',
      price: 690.0,
      originalPrice: 850.0,
      thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
      type: 'ACCOUNT_PURCHASE',
      lowStockThreshold: 2,
      stocks: {
        create: [
          { accountData: encrypt('val_demon99:PhantomGod#444:unverified_email') },
          { accountData: encrypt('radiant_aim:Headshot999:unverified_email') },
        ],
      },
    },
  });

  // Coupons
  await prisma.coupon.upsert({
    where: { code: 'NEXUS10' },
    update: {},
    create: {
      code: 'NEXUS10',
      type: 'PERCENT',
      value: 10,
      minSpend: 50,
      maxDiscount: 100,
      usageLimit: 100,
      perUserLimit: 2,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'WELCOME50' },
    update: {},
    create: {
      code: 'WELCOME50',
      type: 'FIXED',
      value: 50,
      minSpend: 150,
      usageLimit: 50,
      perUserLimit: 1,
      isActive: true,
    },
  });

  // Flash Sale Promotion
  const promo = await prisma.promotion.create({
    data: {
      title: 'Super Weekend Gaming Flash Sale!',
      description: 'ลดกระหน่ำ 15% ทุกไอดีเกมยอดนิยมและบริการฟาร์มจำกัดเวลา',
      discountPercent: 15.0,
      startsAt: new Date(Date.now() - 3600000), // 1 hour ago
      endsAt: new Date(Date.now() + 86400000 * 3), // 3 days from now
      isActive: true,
      products: {
        create: [
          { productId: productAccount.id },
          { productId: productFarm.id },
        ],
      },
    },
  });

  // Reward Items in Loyalty Store
  await prisma.rewardItem.createMany({
    data: [
      {
        title: 'เครดิตเงินสด ฿50 เข้ากระเป๋าทันที',
        description: 'ใช้ 50 แต้มสะสม แลกรับเครดิตเงินสด 50 บาท ซื้อสินค้าหรือสุ่มกล่องได้ทุกรายการ',
        thumbnail: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=600&auto=format&fit=crop&q=80',
        pointCost: 50,
        rewardType: 'CREDIT',
        rewardValue: '50',
        stock: 999,
      },
      {
        title: 'เครดิตเงินสด ฿100 เข้ากระเป๋าทันที',
        description: 'ใช้ 100 แต้มสะสม แลกรับเครดิตเงินสด 100 บาท ซื้อสินค้าได้ทันที',
        thumbnail: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&auto=format&fit=crop&q=80',
        pointCost: 100,
        rewardType: 'CREDIT',
        rewardValue: '100',
        stock: 999,
      },
      {
        title: 'คูปอง VIP สิทธิ์ลด 30% สูงสุด ฿200',
        description: 'ใช้ 200 แต้มสะสม แลกสิทธิ์รับส่วนลด 30% ในการสั่งซื้อครั้งถัดไป',
        thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
        pointCost: 200,
        rewardType: 'COUPON',
        rewardValue: 'VIP30',
        stock: 50,
      },
    ],
  });

  // Seed Lucky Boxes
  const commonBox = await prisma.luckyBox.create({
    data: {
      name: 'Common Gaming Box (กล่องสุ่มเริ่มต้น)',
      description: 'กล่องสุ่มยอดนิยม ลุ้นรับเครดิตเงินคืน แต้มสะสม และไอดีไก่ตันระดับเทพ',
      price: 29.0,
      thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
      isActive: true,
      rewards: {
        create: [
          { name: '50 Points (แต้มสะสม)', type: 'POINT', value: '50', dropRate: 35.0 },
          { name: '100 Points (แต้มสะสม)', type: 'POINT', value: '100', dropRate: 25.0 },
          { name: '฿20 Credit (เครดิตเงินคืน)', type: 'CREDIT', value: '20', dropRate: 15.0 },
          { name: 'ไอดีไก่ตัน Max Lv 2550', type: 'ACCOUNT', value: 'Game Account', dropRate: 5.0, productId: productAccount.id },
          { name: 'No Prize (เกลือ / ไม่ได้รับรางวัล)', type: 'LOSE', value: '', dropRate: 20.0 },
        ],
      },
    },
  });

  // Initial Notifications
  await prisma.notification.create({
    data: {
      userId: player1.id,
      type: 'PROMOTION',
      title: 'ยินดีต้อนรับสู่ NEXUS GAMING STORE!',
      message: 'รับส่วนลดพิเศษ 10% เมื่อใช้โค้ด NEXUS10 ในการสั่งซื้อครั้งแรก',
      link: '/products',
    },
  });

  console.log(`✅ Phase 3 Seed Complete! Created Flash Sale: ${promo.id}, Lucky Box: ${commonBox.id}`);
}

main().finally(async () => {
  await prisma.$disconnect();
});