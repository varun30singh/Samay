import { NextRequest, NextResponse } from 'next/server';
import { validateServerAuth } from '@/lib/serverAuth';
import { transitionApplicationStage } from '@/lib/workflowService';
import { application_stage } from '@prisma/client';

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await validateServerAuth(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.status || 401 }
    );
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid application ID format' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { targetStage, reason, metadata } = body;

    if (!targetStage || !Object.values(application_stage).includes(targetStage as application_stage)) {
      return NextResponse.json(
        { success: false, error: `Invalid target stage: "${targetStage}"` },
        { status: 400 }
      );
    }

    const updatedApp = await transitionApplicationStage({
      applicationId: id,
      targetStage: targetStage as application_stage,
      actor: auth.user,
      reason,
      metadata
    });

    return NextResponse.json({ success: true, data: updatedApp }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stage transition failed';
    const isForbidden = message.startsWith('Forbidden') || message.includes('does not have authority');
    return NextResponse.json(
      { success: false, error: message },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
