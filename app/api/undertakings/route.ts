import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';
import { undertaking_status } from '@prisma/client';
import { recordAuditEvent } from '@/lib/auditService';

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function GET(request: NextRequest) {
  const auth = await validateServerAuth(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.status || 401 }
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    const isApplicant =
      auth.user.role === 'applicant' ||
      auth.user.role === 'institution' ||
      auth.user.role === 'institution_admin';

    if (isApplicant) {
      if (!isUuid(auth.user.institutionId)) {
        return NextResponse.json({ success: false, error: 'Forbidden: Unlinked institution account' }, { status: 403 });
      }
      where.institution_id = auth.user.institutionId;
    } else if (auth.user.role === 'regional_officer') {
      if (!auth.user.region) {
        return NextResponse.json({ success: false, error: 'Forbidden: Regional officer has no assigned region' }, { status: 403 });
      }
      where.institutions = { region: auth.user.region };
    }

    const items = await prisma.undertakings.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        institutions: { select: { id: true, legal_name: true, region: true, institution_code: true } },
        applications: { select: { id: true, application_number: true, stage: true } },
        documents: { select: { id: true, file_name: true, document_status: true, expires_on: true } }
      }
    });

    return NextResponse.json({ success: true, data: items }, { status: 200 });
  } catch (err) {
    console.error('[API undertakings GET error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to retrieve undertakings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await validateServerAuth(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.status || 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      application_id: appId,
      undertaking_type,
      undertaking_text,
      expires_on,
      document_id
    } = body;

    if (!isUuid(appId) || !undertaking_type) {
      return NextResponse.json(
        { success: false, error: 'application_id and undertaking_type are required' },
        { status: 400 }
      );
    }

    const app = await prisma.applications.findUnique({
      where: { id: appId },
      select: { id: true, institution_id: true, submitted_by: true, institutions: { select: { region: true } } }
    });

    if (!app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const isApplicant =
      auth.user.role === 'applicant' ||
      auth.user.role === 'institution' ||
      auth.user.role === 'institution_admin';

    if (isApplicant) {
      if (auth.user.institutionId && auth.user.institutionId !== app.institution_id) {
        return NextResponse.json({ success: false, error: 'Forbidden: Cannot create undertaking for another institution' }, { status: 403 });
      }
    } else if (auth.user.role === 'regional_officer') {
      if (auth.user.region !== app.institutions.region) {
        return NextResponse.json({ success: false, error: 'Forbidden: Application is outside your regional jurisdiction' }, { status: 403 });
      }
    }

    const undertaking = await prisma.undertakings.create({
      data: {
        application_id: appId,
        institution_id: app.institution_id,
        undertaking_type,
        undertaking_text: undertaking_text || null,
        status: undertaking_status.submitted,
        submitted_by: isUuid(auth.user.userId) ? auth.user.userId : null,
        submitted_at: new Date(),
        expires_on: expires_on ? new Date(expires_on) : null,
        document_id: isUuid(document_id) ? document_id : null
      }
    });

    await recordAuditEvent({
      actorId: isUuid(auth.user.userId) ? auth.user.userId : null,
      action: 'UNDERTAKING_SUBMITTED',
      entityType: 'Undertaking',
      entityId: undertaking.id,
      payload: { applicationId: appId, undertakingType: undertaking_type }
    });

    return NextResponse.json({ success: true, data: undertaking }, { status: 201 });
  } catch (err) {
    console.error('[API undertakings POST error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to create undertaking' }, { status: 500 });
  }
}
