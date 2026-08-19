import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const { productId, stockLines } = await req.json();
    const dataToInsert = stockLines.map((line: string) => ({
      productId,
      accountData: encrypt(line),
      isSold: false,
    }));
    await prisma.stockItem.createMany({ data: dataToInsert });
    return NextResponse.json({ success: true, count: dataToInsert.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}