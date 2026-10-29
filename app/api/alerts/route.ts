import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';
import { markAlertRead } from '@/lib/notificationService';

export async function GET(request: NextRequest) {
  const auth = await validateServerAuth(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.status || 401 }
    );
  }

  try {
    const alerts = await prisma.alerts.findMany({
      where: {
        recipient_id: auth.user.userId
      },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    return NextResponse.json({ success: true, data: alerts }, { status: 200 });
  } catch (err) {
    console.error('[API alerts GET error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to retrieve alerts' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await validateServerAuth(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.status || 401 }
    );
  }

  try {
    const body = await request.json();
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json({ success: false, error: 'alertId is required' }, { status: 400 });
    }

    await markAlertRead(alertId, auth.user.userId);

    return NextResponse.json({ success: true, message: 'Alert marked as read' }, { status: 200 });
  } catch (err) {
    console.error('[API alerts PATCH error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to update alert' }, { status: 500 });
  }
}
