import { NextRequest, NextResponse } from 'next/server';
import { validateServerAuth } from '@/lib/serverAuth';
import { raiseApplicationDeficiency, respondToDeficiency } from '@/lib/workflowService';
import { deficiency_severity } from '@prisma/client';

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

/**
 * POST /api/applications/[id]/deficiency
 * Officer records a deficiency against the application.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await validateServerAuth(request, [
    'scrutiny_officer',
    'regional_officer',
    'admin',
    'system_admin'
  ]);

  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized to raise deficiencies' },
      { status: auth.status || 403 }
    );
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid application ID format' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { title, description, severity, dueAt } = body;

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Title and description are required for deficiency' },
        { status: 400 }
      );
    }

    const deficiency = await raiseApplicationDeficiency({
      applicationId: id,
      title,
      description,
      severity: severity as deficiency_severity,
      dueAt: dueAt ? new Date(dueAt) : undefined,
      actor: auth.user
    });

    return NextResponse.json({ success: true, data: deficiency }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record deficiency';
    return NextResponse.json(
      { success: false, error: message },
      { status: message.startsWith('Forbidden') ? 403 : 500 }
    );
  }
}

/**
 * PATCH /api/applications/[id]/deficiency
 * Institution responds with rectification evidence / commentary.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await validateServerAuth(request, [
    'applicant',
    'institution',
    'institution_admin'
  ]);

  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized to respond to deficiency' },
      { status: auth.status || 403 }
    );
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid application ID format' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { deficiencyId, responseComment, attachments } = body;

    if (!isUuid(deficiencyId) || !responseComment) {
      return NextResponse.json(
        { success: false, error: 'Valid deficiencyId and responseComment are required' },
        { status: 400 }
      );
    }

    const result = await respondToDeficiency({
      deficiencyId,
      responseComment,
      attachments,
      actor: auth.user
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to respond to deficiency';
    return NextResponse.json(
      { success: false, error: message },
      { status: message.startsWith('Forbidden') ? 403 : 500 }
    );
  }
}
