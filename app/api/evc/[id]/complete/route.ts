import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';
import { evc_status } from '@prisma/client';
import { recordAuditEvent } from '@/lib/auditService';
import { createAlert } from '@/lib/notificationService';

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await validateServerAuth(request, [
    'evc_coordinator',
    'regional_officer',
    'admin',
    'system_admin'
  ]);

  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized to complete EVC' },
      { status: auth.status || 403 }
    );
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid EVC visit ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { report, recommendations } = body;

    const visit = await prisma.evc_visits.findUnique({
      where: { id },
      include: {
        applications: {
          select: { id: true, application_number: true, stage: true, submitted_by: true }
        }
      }
    });

    if (!visit) {
      return NextResponse.json({ success: false, error: 'EVC visit not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async tx => {
      const v = await tx.evc_visits.update({
        where: { id },
        data: {
          status: evc_status.completed,
          report: {
            findings: report || 'EVC physical inspection completed satisfactorily.',
            recommendations: recommendations || 'Proceed to Bureau Final Review.',
            completed_at: new Date().toISOString(),
            officer_id: auth.user!.userId
          },
          updated_at: new Date()
        }
      });

      if (visit.applications.stage === 'evc_scheduled') {
        await tx.applications.update({
          where: { id: visit.application_id },
          data: {
            stage: 'evc_completed',
            last_action_at: new Date()
          }
        });

        await tx.application_stage_history.create({
          data: {
            application_id: visit.application_id,
            previous_stage: 'evc_scheduled',
            new_stage: 'evc_completed',
            changed_by: isUuid(auth.user!.userId) ? auth.user!.userId : null,
            reason: 'EVC committee inspection completed and report submitted.'
          }
        });
      }

      return v;
    });

    await recordAuditEvent({
      actorId: isUuid(auth.user.userId) ? auth.user.userId : null,
      action: 'EVC_VISIT_COMPLETED',
      entityType: 'EvcVisit',
      entityId: id,
      payload: { applicationId: visit.application_id, report, recommendations }
    });

    if (visit.applications.submitted_by) {
      await createAlert({
        recipientId: visit.applications.submitted_by,
        applicationId: visit.application_id,
        title: 'EVC Inspection Report Submitted',
        message: `The Expert Visit Committee has completed its inspection report for application ${visit.applications.application_number}.`,
        alertType: 'evc_completed'
      });
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    console.error('[API evc complete error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to complete EVC visit' }, { status: 500 });
  }
}
