import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Lightweight database connectivity verification
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    // Return degraded status without exposing internal stack traces or connection strings
    return NextResponse.json(
      {
        status: 'degraded',
        error: 'DATABASE_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
