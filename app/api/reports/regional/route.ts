import { NextRequest, NextResponse } from 'next/server';
import { validateServerAuth } from '@/lib/serverAuth';
import {
  getRegionalAnalytics,
  buildApplicationWhereClause,
  RegionalFilterOptions
} from '@/lib/metricsService';
import { prisma } from '@/lib/prisma';

const SORT_ALLOWLIST: Record<string, string> = {
  application_number: 'application_number',
  created_at: 'created_at',
  submitted_at: 'submitted_at',
  statutory_deadline: 'statutory_deadline',
  stage: 'stage',
  academic_year: 'academic_year'
};

export async function GET(request: NextRequest) {
  // 1. Authenticate with server-side profile verification
  const auth = await validateServerAuth(request, [
    'system_admin',
    'admin',
    'competent_authority',
    'approving_authority',
    'bureau_officer',
    'regional_officer',
    'scrutiny_officer'
  ]);

  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized to access regional analytics' },
      { status: auth.status || 403 }
    );
  }

  // 2. Enforce Regional Officer Jurisdiction Isolation
  let scopedRegion: string | null = null;
  if (auth.user.role === 'regional_officer') {
    if (!auth.user.region) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Regional Officer account is not assigned to any regional jurisdiction' },
        { status: 403 }
      );
    }
    scopedRegion = auth.user.region;
  }

  try {
    const { searchParams } = new URL(request.url);
    const regionParam = searchParams.get('region') || undefined;
    const stageParam = searchParams.get('stage') || undefined;
    const workflowParam = searchParams.get('workflowType') || undefined;
    const academicYearParam = searchParams.get('academicYear') || undefined;
    const startDateParam = searchParams.get('startDate') || undefined;
    const endDateParam = searchParams.get('endDate') || undefined;
    const isOverdueOnlyParam = searchParams.get('isOverdueOnly') === 'true';
    const searchParam = searchParams.get('search') || undefined;

    // Drilldown list parameters
    const includeList = searchParams.get('includeList') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const sortByParam = searchParams.get('sortBy') || 'created_at';
    const sortOrderParam = searchParams.get('sortOrder')?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const sortField = SORT_ALLOWLIST[sortByParam] || 'created_at';

    const filterOptions: RegionalFilterOptions = {
      region: regionParam,
      stage: stageParam,
      workflowType: workflowParam,
      academicYear: academicYearParam,
      startDate: startDateParam,
      endDate: endDateParam,
      isOverdueOnly: isOverdueOnlyParam,
      search: searchParam,
      scopedRegion
    };

    // 3. Compute statutory analytics via central metrics service
    const analytics = await getRegionalAnalytics(filterOptions);

    // 4. Optionally fetch paginated application drilldown records
    let applicationsList = null;
    let pagination = null;

    if (includeList) {
      const now = new Date();
      const whereClause = buildApplicationWhereClause(filterOptions, now);

      const [totalMatching, records] = await Promise.all([
        prisma.applications.count({ where: whereClause }),
        prisma.applications.findMany({
          where: whereClause,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { [sortField]: sortOrderParam },
          select: {
            id: true,
            application_number: true,
            application_type: true,
            stage: true,
            academic_year: true,
            requested_intake: true,
            submitted_at: true,
            statutory_deadline: true,
            final_decision_at: true,
            last_action_at: true,
            metadata: true,
            institutions: {
              select: {
                id: true,
                legal_name: true,
                institution_code: true,
                region: true,
                state: true,
                institution_type: true
              }
            }
          }
        })
      ]);

      const formattedRecords = records.map(r => {
        const isPending = !['approved', 'rejected', 'withdrawn', 'closed', 'draft'].includes(r.stage);
        const isOverdue = isPending && r.statutory_deadline && new Date(r.statutory_deadline).getTime() < now.getTime();

        return {
          id: r.id,
          applicationNumber: r.application_number,
          institutionName: r.institutions?.legal_name || 'Unknown Institution',
          institutionCode: r.institutions?.institution_code || 'N/A',
          region: r.institutions?.region || 'Unknown',
          state: r.institutions?.state || 'Unknown',
          stage: r.stage,
          applicationType: r.application_type,
          academicYear: r.academic_year,
          requestedIntake: r.requested_intake,
          submittedAt: r.submitted_at?.toISOString() || null,
          statutoryDeadline: r.statutory_deadline ? r.statutory_deadline.toISOString().split('T')[0] : null,
          finalDecisionAt: r.final_decision_at?.toISOString() || null,
          isOverdue: Boolean(isOverdue),
          metadata: r.metadata
        };
      });

      applicationsList = formattedRecords;
      pagination = {
        totalItems: totalMatching,
        totalPages: Math.ceil(totalMatching / pageSize),
        currentPage: page,
        pageSize
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        ...analytics,
        ...(includeList ? { applications: applicationsList, pagination } : {})
      }
    });
  } catch (err) {
    console.error('[API /api/reports/regional error]:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'Internal server error computing regional performance metrics' },
      { status: 500 }
    );
  }
}
