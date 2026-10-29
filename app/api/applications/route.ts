import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';
import { application_stage, application_type } from '@prisma/client';
import { recordAuditEvent } from '@/lib/auditService';

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function GET(request: NextRequest) {
  // 1. Enforce cryptographic server-side authentication
  const auth = await validateServerAuth(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      {
        success: false,
        error: auth.error || 'Authentication required'
      },
      { status: auth.status || 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    // 2. Validate and bound pagination parameters
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '10', 10);

    const page = Number.isSafeInteger(pageParam) && pageParam > 0 && pageParam <= 10000 ? pageParam : 1;
    const limit = Number.isSafeInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
    const skip = (page - 1) * limit;

    // 3. Sanitize query filters
    const stageParam = searchParams.get('stage')?.trim();
    const rawRegion = searchParams.get('region')?.trim();
    const regionParam = rawRegion && rawRegion !== 'All' ? rawRegion.slice(0, 50) : undefined;
    const rawAcademicYear = searchParams.get('academicYear')?.trim();
    const academicYear = rawAcademicYear ? rawAcademicYear.slice(0, 20).replace(/[^\w-]/g, '') : undefined;
    const rawSearch = searchParams.get('search')?.trim();
    const search = rawSearch ? rawSearch.slice(0, 100).replace(/[^\w\s-]/g, '') : undefined;

    // 4. Construct safe where condition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (academicYear) {
      where.academic_year = academicYear;
    }

    // Validate and apply stage filter strictly against Prisma enum
    if (stageParam && Object.values(application_stage).includes(stageParam as application_stage)) {
      where.stage = stageParam as application_stage;
    }

    if (regionParam) {
      where.institutions = {
        region: regionParam
      };
    }

    if (search) {
      where.OR = [
        { application_number: { contains: search, mode: 'insensitive' } },
        { institutions: { legal_name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // 5. Enforce strict role-based tenant isolation
    const userRole = auth.user.role;
    const isApplicant = userRole === 'applicant' || userRole === 'institution' || userRole === 'institution_admin';

    if (isApplicant) {
      // Must be bound to a specific verified institution or submitter UUID
      if (isUuid(auth.user.institutionId)) {
        where.institution_id = auth.user.institutionId;
      } else if (isUuid(auth.user.userId)) {
        where.submitted_by = auth.user.userId;
      } else {
        // Fail closed: applicant has no verified tenant identifier
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: Applicant account is not linked to a valid institution or submitter ID'
          },
          { status: 403 }
        );
      }
    } else if (userRole === 'regional_officer') {
      // Scoped strictly to the regional officer's jurisdiction - fail closed if unassigned
      if (!auth.user.region) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: Regional officer account is not assigned to a valid regional jurisdiction'
          },
          { status: 403 }
        );
      }
      where.institutions = {
        region: auth.user.region
      };
    }

    // 6. Execute bounded query with explicit field selections
    const [total, records] = await Promise.all([
      prisma.applications.count({ where }),
      prisma.applications.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc'
        },
        select: {
          id: true,
          application_number: true,
          institution_id: true,
          application_type: true,
          stage: true,
          academic_year: true,
          requested_intake: true,
          submitted_at: true,
          statutory_deadline: true,
          risk_score: !isApplicant, // Mask internal risk analysis from external applicants
          risk_flags: !isApplicant,
          created_at: true,
          updated_at: true,
          institutions: {
            select: {
              id: true,
              institution_code: true,
              legal_name: true,
              display_name: true,
              region: true,
              state: true
            }
          }
        }
      })
    ]);

    return NextResponse.json(
      {
        success: true,
        data: records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API applications error]:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve applications'
      },
      { status: 500 }
    );
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
      application_type: appType,
      academic_year: academicYear,
      requested_intake: requestedIntake,
      requested_courses: requestedCourses,
      institution_id: instParam
    } = body;

    // Validate application type
    if (!appType || !Object.values(application_type).includes(appType as application_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing application_type' },
        { status: 400 }
      );
    }

    const isApplicant =
      auth.user.role === 'applicant' ||
      auth.user.role === 'institution' ||
      auth.user.role === 'institution_admin';

    let targetInstId: string | undefined = undefined;

    if (isApplicant) {
      if (!isUuid(auth.user.institutionId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: Applicant account is not linked to a verified institution record'
          },
          { status: 403 }
        );
      }
      targetInstId = auth.user.institutionId;
    } else {
      if (!isUuid(instParam)) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid institution_id parameter' },
          { status: 400 }
        );
      }
      targetInstId = instParam;
    }

    // Verify institution exists
    const inst = await prisma.institutions.findUnique({
      where: { id: targetInstId },
      select: { id: true, institution_code: true, region: true }
    });

    if (!inst) {
      return NextResponse.json(
        { success: false, error: 'Target institution record not found' },
        { status: 404 }
      );
    }

    // Regional officer boundary verification
    if (auth.user.role === 'regional_officer' && auth.user.region !== inst.region) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Target institution is outside your regional jurisdiction' },
        { status: 403 }
      );
    }

    const appNumber = `AICTE-${inst.institution_code || 'APP'}-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const statutoryDeadline = new Date(`${now.getFullYear()}-04-30T23:59:59Z`);
    const submittingUserId = auth.user.userId;

    const newApp = await prisma.$transaction(async tx => {
      const created = await tx.applications.create({
        data: {
          application_number: appNumber,
          institution_id: targetInstId!,
          submitted_by: isUuid(submittingUserId) ? submittingUserId : null,
          application_type: appType as application_type,
          stage: application_stage.submitted,
          academic_year: academicYear || '2026-2027',
          requested_intake: typeof requestedIntake === 'number' ? requestedIntake : null,
          requested_courses: Array.isArray(requestedCourses) ? requestedCourses : [],
          submitted_at: now,
          last_action_at: now,
          statutory_deadline: statutoryDeadline,
          risk_score: 15.00,
          risk_flags: []
        }
      });

      await tx.application_stage_history.create({
        data: {
          application_id: created.id,
          previous_stage: null,
          new_stage: application_stage.submitted,
          changed_by: isUuid(submittingUserId) ? submittingUserId : null,
          reason: 'Initial regulatory application submitted'
        }
      });

      return created;
    });

    await recordAuditEvent({
      actorId: isUuid(auth.user.userId) ? auth.user.userId : null,
      action: 'APPLICATION_CREATED',
      entityType: 'Application',
      entityId: newApp.id,
      payload: { applicationNumber: appNumber, applicationType: appType }
    });

    return NextResponse.json({ success: true, data: newApp }, { status: 201 });
  } catch (err) {
    console.error('[API applications POST error]:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'Failed to create regulatory application' },
      { status: 500 }
    );
  }
}
