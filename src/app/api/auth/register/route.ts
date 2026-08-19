import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { isValidUsername, isValidPassword, sanitizeString } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`register:${ip}`, 5, 60000); // 5 per minute
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_REQUESTS', message: `คุณสมัครสมาชิกถี่เกินไป กรุณารอ ${rateLimit.reset} วินาที` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawUsername = sanitizeString(body.username);
    const password = body.password;

    if (!rawUsername || !password) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS', message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    if (!isValidUsername(rawUsername)) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_USERNAME',
        message: 'ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษหรือตัวเลข ความยาว 3-30 ตัวอักษรเท่านั้น',
      }, { status: 400 });
    }

    if (!isValidPassword(password)) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_PASSWORD',
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
      }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username: rawUsername } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'USER_EXISTS', message: 'ชื่อผู้ใช้นี้มีในระบบแล้ว' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        username: rawUsername,
        passwordHash,
        balance: 0.0,
        points: 0,
        role: 'USER',
      },
    });

    return NextResponse.json({ success: true, message: 'สมัครสมาชิกสำเร็จ!' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' }, { status: 500 });
  }
}