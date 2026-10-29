import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function GET(
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
    const isApplicant =
      auth.user.role === 'applicant' ||
      auth.user.role === 'institution' ||
      auth.user.role === 'institution_admin';

    const app = await prisma.applications.findUnique({
      where: { id },
      include: {
        institutions: {
          select: {
            id: true,
            institution_code: true,
            legal_name: true,
            display_name: true,
            region: true,
            state: true,
            district: true,
            contact_email: true,
            contact_phone: true
          }
        },
        application_stage_history: {
          orderBy: { created_at: 'asc' },
          select: {
            id: true,
            previous_stage: true,
            new_stage: true,
            changed_by: true,
            reason: true,
            created_at: true
          }
        },
        deficiencies: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            severity: true,
            status: true,
            due_at: true,
            resolved_at: true,
            created_at: true,
            deficiency_timeline: {
              orderBy: { created_at: 'asc' }
            }
          }
        },
        documents: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            document_type: true,
            file_name: true,
            storage_path: true,
            document_status: true,
            expires_on: true,
            created_at: true,
            verified_at: true
          }
        },
        evc_visits: {
          orderBy: { scheduled_start: 'desc' },
          select: {
            id: true,
            scheduled_start: true,
            scheduled_end: true,
            status: true,
            venue: true,
            visit_mode: true,
            report: true,
            evc_committee_assignments: true
          }
        },
        undertakings: {
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    // Tenant isolation verification
    if (isApplicant) {
      if (auth.user.institutionId && auth.user.institutionId !== app.institution_id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Access to another institution application is prohibited' },
          { status: 403 }
        );
      }
      if (!auth.user.institutionId && auth.user.userId !== app.submitted_by) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Access to another applicant submission is prohibited' },
          { status: 403 }
        );
      }
    } else if (auth.user.role === 'regional_officer') {
      if (!auth.user.region || auth.user.region !== app.institutions.region) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Application is outside your regional jurisdiction' },
          { status: 403 }
        );
      }
    }

    // Mask risk metrics and confidential committee assignments for applicants
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitizedApp: Record<string, any> = { ...app };
    if (isApplicant) {
      delete sanitizedApp.risk_score;
      delete sanitizedApp.risk_flags;
      if (Array.isArray(sanitizedApp.evc_visits)) {
        sanitizedApp.evc_visits = sanitizedApp.evc_visits.map(v => ({
          ...v,
          report: null,
          evc_committee_assignments: []
        }));
      }
    }

    return NextResponse.json({ success: true, data: sanitizedApp }, { status: 200 });
  } catch (err) {
    console.error('[API applications/[id] error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to retrieve application details' }, { status: 500 });
  }
}
