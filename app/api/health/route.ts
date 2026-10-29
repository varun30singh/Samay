import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Lightweight, read-only query to verify PostgreSQL connectivity
    await prisma.$queryRaw`SELECT 1 as connected`;

    return NextResponse.json(
      {
        success: true,
        status: 'healthy',
        database: 'connected',
        application: 'SAMAY',
        timestamp
      },
      { status: 200 }
    );
  } catch (error) {
    // Diagnostic error logged on the server only; never leak internals to the client
    console.error('[Health Check Failure]', error instanceof Error ? error.message : 'Unknown error');

    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        database: 'disconnected',
        application: 'SAMAY',
        timestamp
      },
      { status: 503 }
    );
  }
}
