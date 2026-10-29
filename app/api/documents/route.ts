import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';
import { document_type, document_status } from '@prisma/client';
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
    const { searchParams } = new URL(request.url);
    const expiryDaysParam = searchParams.get('expiryDays');

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

    if (expiryDaysParam) {
      const days = parseInt(expiryDaysParam, 10);
      if (!isNaN(days) && days > 0) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + days);
        where.expires_on = {
          lte: threshold
        };
      }
    }

    const docs = await prisma.documents.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        application_id: true,
        institution_id: true,
        document_type: true,
        file_name: true,
        storage_path: true,
        document_status: true,
        expires_on: true,
        created_at: true,
        verified_at: true,
        institutions: { select: { id: true, legal_name: true, region: true } },
        applications: { select: { id: true, application_number: true } }
      }
    });

    return NextResponse.json({ success: true, data: docs }, { status: 200 });
  } catch (err) {
    console.error('[API documents GET error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to retrieve documents' }, { status: 500 });
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
      document_type: docType,
      file_name,
      storage_path,
      mime_type,
      file_size_bytes,
      expires_on
    } = body;

    if (!isUuid(appId) || !file_name || !docType) {
      return NextResponse.json(
        { success: false, error: 'application_id, document_type, and file_name are required' },
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
        return NextResponse.json({ success: false, error: 'Forbidden: Cannot upload document for another institution' }, { status: 403 });
      }
    } else if (auth.user.role === 'regional_officer') {
      if (auth.user.region !== app.institutions.region) {
        return NextResponse.json({ success: false, error: 'Forbidden: Application is outside your regional jurisdiction' }, { status: 403 });
      }
    }

    const safePath = storage_path || `documents/${app.institution_id}/${app.id}/${Date.now()}_${file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const doc = await prisma.documents.create({
      data: {
        application_id: appId,
        institution_id: app.institution_id,
        document_type: (docType as document_type) || document_type.other,
        file_name,
        storage_bucket: 'samay-private',
        storage_path: safePath,
        mime_type: mime_type || 'application/pdf',
        file_size_bytes: file_size_bytes ? BigInt(file_size_bytes) : null,
        document_status: document_status.uploaded,
        uploaded_by: isUuid(auth.user.userId) ? auth.user.userId : null,
        expires_on: expires_on ? new Date(expires_on) : null
      }
    });

    await recordAuditEvent({
      actorId: isUuid(auth.user.userId) ? auth.user.userId : null,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: doc.id,
      payload: { applicationId: appId, fileName: file_name, documentType: docType }
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...doc,
          file_size_bytes: doc.file_size_bytes ? doc.file_size_bytes.toString() : null
        }
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[API documents POST error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to register document metadata' }, { status: 500 });
  }
}
