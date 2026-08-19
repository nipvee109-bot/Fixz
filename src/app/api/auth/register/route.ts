import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return NextResponse.json({ error: 'ชื่อผู้ใช้นี้มีในระบบแล้ว' }, { status: 400 });
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { username, passwordHash, balance: 0.0, points: 0, role: 'USER' } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}