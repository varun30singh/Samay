import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';
import { document_type, document_status } from '@prisma/client';
import { recordAuditEvent } from '@/lib/auditService';
import { saveDocumentFile } from '@/lib/storageService';
import path from 'path';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function POST(request: NextRequest) {
  const auth = await validateServerAuth(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.status || 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const applicationId = formData.get('applicationId') as string | null;
    const documentTypeRaw = formData.get('documentType') as string | null;
    const expiresOnRaw = formData.get('expiresOn') as string | null;
    const isRenewal = formData.get('isRenewal') === 'true';

    if (!file || !applicationId || !documentTypeRaw) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file, applicationId, and documentType are required' },
        { status: 400 }
      );
    }

    if (!isUuid(applicationId)) {
      return NextResponse.json({ success: false, error: 'Invalid applicationId format' }, { status: 400 });
    }

    // Validate document type
    const validDocTypes = Object.values(document_type);
    if (!validDocTypes.includes(documentTypeRaw as document_type)) {
      return NextResponse.json(
        { success: false, error: `Invalid documentType. Must be one of: ${validDocTypes.join(', ')}` },
        { status: 400 }
      );
    }
    const docType = documentTypeRaw as document_type;

    // Validate file size and MIME type
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: `File size exceeds the 10MB limit (received ${Math.round(file.size / (1024 * 1024))}MB)` },
        { status: 400 }
      );
    }

    const mimeType = file.type || 'application/pdf';
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: `File type "${mimeType}" is not allowed. Only PDF, PNG, and JPEG documents are permitted.` },
        { status: 400 }
      );
    }

    // Verify application existence and authorization
    const app = await prisma.applications.findUnique({
      where: { id: applicationId },
      include: {
        institutions: { select: { id: true, region: true, legal_name: true } }
      }
    });

    if (!app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    // Enforce tenant isolation
    const isApplicant =
      auth.user.role === 'applicant' ||
      auth.user.role === 'institution' ||
      auth.user.role === 'institution_admin';

    if (isApplicant) {
      if (!auth.user.institutionId || auth.user.institutionId !== app.institution_id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Cannot upload documents for another institution' },
          { status: 403 }
        );
      }
    } else if (auth.user.role === 'regional_officer') {
      if (!auth.user.region || auth.user.region !== app.institutions.region) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Application is outside your assigned region' },
          { status: 403 }
        );
      }
    }

    // Read file buffer and save to secure private storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeBaseName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');

    const storage = await saveDocumentFile({
      institutionId: app.institution_id,
      fileName: safeBaseName,
      buffer
    });

    // Document renewal: If replacing/renewing, mark previous versions of this docType as expired
    if (isRenewal) {
      await prisma.documents.updateMany({
        where: {
          application_id: app.id,
          document_type: docType,
          document_status: { in: [document_status.uploaded, document_status.verified] }
        },
        data: {
          document_status: document_status.expired,
          updated_at: new Date()
        }
      });
    }

    // Record document in database
    const createdDoc = await prisma.documents.create({
      data: {
        application_id: app.id,
        institution_id: app.institution_id,
        document_type: docType,
        file_name: safeBaseName,
        storage_bucket: storage.storageBucket,
        storage_path: storage.storagePath,
        mime_type: mimeType,
        file_size_bytes: BigInt(storage.fileSizeBytes),
        sha256_hash: storage.sha256Hash,
        document_status: document_status.uploaded,
        uploaded_by: isUuid(auth.user.userId) ? auth.user.userId : null,
        expires_on: expiresOnRaw ? new Date(expiresOnRaw) : null
      }
    });

    // Append event to cryptographic audit ledger
    await recordAuditEvent({
      actorId: isUuid(auth.user.userId) ? auth.user.userId : null,
      actorName: auth.user.email || 'Authorized User',
      action: isRenewal ? 'DOCUMENT_RENEWED' : 'DOCUMENT_UPLOADED',
      entityType: 'document',
      entityId: createdDoc.id,
      payload: {
        applicationId: app.id,
        applicationNumber: app.application_number,
        documentType: docType,
        fileName: safeBaseName,
        fileSizeBytes: storage.fileSizeBytes,
        sha256Hash: storage.sha256Hash,
        isRenewal
      }
    });

    return NextResponse.json({
      success: true,
      document: {
        id: createdDoc.id,
        applicationId: createdDoc.application_id,
        institutionId: createdDoc.institution_id,
        documentType: createdDoc.document_type,
        fileName: createdDoc.file_name,
        mimeType: createdDoc.mime_type,
        fileSizeBytes: createdDoc.file_size_bytes ? createdDoc.file_size_bytes.toString() : '0',
        sha256Hash: createdDoc.sha256_hash,
        documentStatus: createdDoc.document_status,
        expiresOn: createdDoc.expires_on,
        createdAt: createdDoc.created_at
      }
    }, { status: 201 });
  } catch (err) {
    console.error('[API documents upload error]:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'Failed to process document upload' },
      { status: 500 }
    );
  }
}
