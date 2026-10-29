import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';
import { evc_status } from '@prisma/client';
import { recordAuditEvent } from '@/lib/auditService';
import { createAlert } from '@/lib/notificationService';

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

    const visits = await prisma.evc_visits.findMany({
      where,
      orderBy: { scheduled_start: 'asc' },
      include: {
        institutions: { select: { id: true, legal_name: true, region: true, institution_code: true } },
        applications: { select: { id: true, application_number: true, stage: true } },
        evc_committee_assignments: {
          include: { profiles: { select: { id: true, full_name: true, role: true } } }
        }
      }
    });

    return NextResponse.json({ success: true, data: visits }, { status: 200 });
  } catch (err) {
    console.error('[API evc GET error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to retrieve EVC visits' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await validateServerAuth(request, [
    'evc_coordinator',
    'regional_officer',
    'admin',
    'system_admin'
  ]);

  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized to schedule EVC' },
      { status: auth.status || 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      application_id: appId,
      scheduled_start,
      scheduled_end,
      venue,
      visit_mode,
      committee_expert_ids
    } = body;

    if (!isUuid(appId) || !scheduled_start || !scheduled_end) {
      return NextResponse.json(
        { success: false, error: 'application_id, scheduled_start, and scheduled_end are required' },
        { status: 400 }
      );
    }

    const app = await prisma.applications.findUnique({
      where: { id: appId },
      select: { id: true, application_number: true, institution_id: true, submitted_by: true, stage: true, institutions: { select: { region: true } } }
    });

    if (!app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    if (auth.user.role === 'regional_officer' && auth.user.region !== app.institutions.region) {
      return NextResponse.json({ success: false, error: 'Forbidden: Application is outside your regional jurisdiction' }, { status: 403 });
    }

    const officerUserId = auth.user.userId;
    const newVisit = await prisma.$transaction(async tx => {
      const visit = await tx.evc_visits.create({
        data: {
          application_id: appId,
          institution_id: app.institution_id,
          scheduled_start: new Date(scheduled_start),
          scheduled_end: new Date(scheduled_end),
          status: evc_status.scheduled,
          venue: venue || 'Institution Main Campus',
          visit_mode: visit_mode || 'physical',
          coordinator_id: isUuid(officerUserId) ? officerUserId : null,
          created_by: isUuid(officerUserId) ? officerUserId : null
        }
      });

      // Add expert assignments if supplied
      if (Array.isArray(committee_expert_ids)) {
        for (const expertId of committee_expert_ids) {
          if (isUuid(expertId)) {
            await tx.evc_committee_assignments.create({
              data: {
                evc_visit_id: visit.id,
                expert_id: expertId,
                role_description: 'Subject Matter Committee Expert'
              }
            });
          }
        }
      }

      // Transition application to evc_scheduled
      if (app.stage === 'ready_for_evc' || app.stage === 'under_scrutiny') {
        await tx.applications.update({
          where: { id: appId },
          data: { stage: 'evc_scheduled', last_action_at: new Date() }
        });

        await tx.application_stage_history.create({
          data: {
            application_id: appId,
            previous_stage: app.stage,
            new_stage: 'evc_scheduled',
            changed_by: isUuid(officerUserId) ? officerUserId : null,
            reason: `EVC physical inspection visit scheduled for ${new Date(scheduled_start).toLocaleDateString()}`
          }
        });
      }

      return visit;
    });

    await recordAuditEvent({
      actorId: isUuid(auth.user.userId) ? auth.user.userId : null,
      action: 'EVC_VISIT_SCHEDULED',
      entityType: 'EvcVisit',
      entityId: newVisit.id,
      payload: { applicationId: appId, scheduled_start, scheduled_end }
    });

    if (app.submitted_by) {
      await createAlert({
        recipientId: app.submitted_by,
        applicationId: app.id,
        title: 'EVC Visit Scheduled',
        message: `Expert Visit Committee (EVC) has been scheduled for application ${app.application_number} on ${new Date(scheduled_start).toLocaleDateString()}.`,
        alertType: 'evc_scheduled'
      });
    }

    return NextResponse.json({ success: true, data: newVisit }, { status: 201 });
  } catch (err) {
    console.error('[API evc POST error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to schedule EVC visit' }, { status: 500 });
  }
}
