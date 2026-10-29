import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';
import { undertaking_status } from '@prisma/client';
import { recordAuditEvent } from '@/lib/auditService';

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Reject external applicant roles from verifying undertakings
  const auth = await validateServerAuth(request, [
    'scrutiny_officer',
    'regional_officer',
    'bureau_officer',
    'competent_authority',
    'approving_authority',
    'admin',
    'system_admin'
  ]);

  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized: Only regulatory officers can verify undertakings' },
      { status: auth.status || 403 }
    );
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid undertaking ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const targetStatus = (body.status || body.decision || '').toLowerCase().replace(/ /g, '_');
    const comment = body.comment || body.comments;

    if (targetStatus !== 'verified' && targetStatus !== 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Status must be either "verified" or "rejected"' },
        { status: 400 }
      );
    }

    const item = await prisma.undertakings.findUnique({
      where: { id },
      include: { institutions: { select: { region: true } } }
    });

    if (!item) {
      return NextResponse.json({ success: false, error: 'Undertaking not found' }, { status: 404 });
    }

    if (auth.user.role === 'regional_officer' && auth.user.region !== item.institutions.region) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Undertaking is outside your regional jurisdiction' },
        { status: 403 }
      );
    }

    const updated = await prisma.undertakings.update({
      where: { id },
      data: {
        status: targetStatus === 'verified' ? undertaking_status.verified : undertaking_status.rejected,
        verified_by: isUuid(auth.user.userId) ? auth.user.userId : null,
        verified_at: new Date(),
        metadata: {
          verification_comment: comment || null,
          verified_by_role: auth.user.role
        }
      }
    });

    await recordAuditEvent({
      actorId: isUuid(auth.user.userId) ? auth.user.userId : null,
      action: `UNDERTAKING_${targetStatus.toUpperCase()}`,
      entityType: 'Undertaking',
      entityId: id,
      payload: { status: targetStatus, comment }
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    console.error('[API undertakings verify error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to verify undertaking' }, { status: 500 });
  }
}
