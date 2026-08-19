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
  console.log('--- Seeding Database ---');

  const adminPass = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
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
  await prisma.user.upsert({
    where: { username: 'player1' },
    update: {},
    create: {
      username: 'player1',
      email: 'player@gamestore.local',
      passwordHash: playerPass,
      balance: 1000.0,
      points: 250,
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

  await prisma.product.create({
    data: {
      categoryId: catBlox.id,
      title: 'ไก่ตัน Max Lv 2550 + ดาบคู่ Cursed Dual Katana + ผลโมจิ V2',
      description: 'ไอดีสะอาด ปลอดภัย เปลี่ยนรหัส/อีเมลได้ทันที ประกัน 30 วัน',
      price: 249.0,
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
      type: 'ACCOUNT_PURCHASE',
      stocks: {
        create: [
          { accountData: encrypt('blox_master99:GodPass99!@:unverified_email') },
          { accountData: encrypt('dragon_king01:SuperPass77:unverified_email') },
          { accountData: encrypt('godhuman_pro:NinjaGod#123:unverified_email') },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      categoryId: catFarm.id,
      title: 'รับฟาร์มเวล 1 - 2550 (Max) บอทความเร็วสูง ปลอดภัย ไม่โดนแบน',
      description: 'เสร็จไวภายใน 4-6 ชั่วโมง พร้อมส่งมอบงาน',
      price: 89.0,
      thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
      type: 'FARMING_SERVICE',
    },
  });

  console.log('✅ Seed Complete!');
}

main().finally(async () => { await prisma.$disconnect(); });