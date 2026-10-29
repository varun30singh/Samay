import { NextRequest, NextResponse } from 'next/server';
import { validateServerAuth } from '@/lib/serverAuth';
import {
  getRegionalAnalytics,
  buildApplicationWhereClause,
  sanitizeCsvCell,
  RegionalFilterOptions
} from '@/lib/metricsService';
import { prisma } from '@/lib/prisma';

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
      { success: false, error: auth.error || 'Unauthorized to export regional reports' },
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

    const now = new Date();
    const analytics = await getRegionalAnalytics(filterOptions);
    const whereClause = buildApplicationWhereClause(filterOptions, now);

    // Fetch matching applications for detailed export section
    const applications = await prisma.applications.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      select: {
        application_number: true,
        application_type: true,
        stage: true,
        academic_year: true,
        requested_intake: true,
        submitted_at: true,
        statutory_deadline: true,
        final_decision_at: true,
        institutions: {
          select: {
            legal_name: true,
            institution_code: true,
            region: true,
            state: true
          }
        }
      }
    });

    const lines: string[] = [];

    // Header metadata
    lines.push('AICTE APPROVAL WORKFLOW & PENDENCY MONITORING SYSTEM (SAMAY)');
    lines.push(`REGIONAL PERFORMANCE & STATUTORY AUDIT REPORT`);
    lines.push(`Exported On,${sanitizeCsvCell(now.toISOString())}`);
    lines.push(`Exported By,${sanitizeCsvCell(auth.user.email || auth.user.userId)}`);
    lines.push(`Jurisdiction,${sanitizeCsvCell(scopedRegion || 'National (All Regions)')}`);
    lines.push(`Academic Year,${sanitizeCsvCell(academicYearParam || 'All')}`);
    lines.push(`Stage Filter,${sanitizeCsvCell(stageParam || 'All')}`);
    lines.push('');

    // Section 1: KPI Summary
    lines.push('--- STATUTORY PERFORMANCE KPIS ---');
    lines.push('Metric,Value');
    lines.push(`Total Applications,${analytics.kpis.totalApplications}`);
    lines.push(`Active Institutions,${analytics.kpis.totalInstitutions}`);
    lines.push(`Pending Applications,${analytics.kpis.pendingApplications}`);
    lines.push(`Overdue Applications,${analytics.kpis.overdueApplications}`);
    lines.push(`Approved Applications,${analytics.kpis.approvedApplications}`);
    lines.push(`Rejected Applications,${analytics.kpis.rejectedApplications}`);
    lines.push(`Returned For Deficiency,${analytics.kpis.returnedForDeficiency}`);
    lines.push(`Awaiting EVC Inspection,${analytics.kpis.awaitingEvc}`);
    lines.push(`Average Processing Time (Days),${analytics.kpis.avgProcessingTimeDays !== null ? analytics.kpis.avgProcessingTimeDays : 'N/A'}`);
    lines.push(`Statutory On-Time Rate (%),${analytics.kpis.onTimeRatePercent !== null ? `${analytics.kpis.onTimeRatePercent}%` : 'N/A'}`);
    lines.push('');

    // Section 2: Regional Comparison Matrix
    lines.push('--- REGIONAL COMPARISON TABLE ---');
    const matrixHeaders = [
      'Region',
      'Total Applications',
      'Active Institutions',
      'Pending',
      'Overdue',
      'Approved',
      'Rejected',
      'Returned for Deficiency',
      'Awaiting EVC',
      'Avg Processing Days',
      'On-Time Rate (%)'
    ];
    lines.push(matrixHeaders.map(h => sanitizeCsvCell(h)).join(','));

    for (const r of analytics.regionComparison) {
      const row = [
        r.region,
        r.totalApplications,
        r.activeInstitutions,
        r.pendingApplications,
        r.overdueApplications,
        r.approvedApplications,
        r.rejectedApplications,
        r.returnedForDeficiency,
        r.awaitingEvc,
        r.avgProcessingTimeDays !== null ? r.avgProcessingTimeDays : 'N/A',
        r.onTimeRatePercent !== null ? `${r.onTimeRatePercent}%` : 'N/A'
      ];
      lines.push(row.map(val => sanitizeCsvCell(val)).join(','));
    }
    lines.push('');

    // Section 3: Detailed Applications Records
    lines.push('--- FILTERED APPLICATIONS DATASET ---');
    const recordHeaders = [
      'Application Number',
      'Institution Code',
      'Institution Legal Name',
      'Region',
      'State',
      'Application Type',
      'Stage',
      'Academic Year',
      'Approved Intake',
      'Submitted Date',
      'Statutory Deadline',
      'Final Decision Date',
      'Pendency Status'
    ];
    lines.push(recordHeaders.map(h => sanitizeCsvCell(h)).join(','));

    for (const app of applications) {
      const isPending = !['approved', 'rejected', 'withdrawn', 'closed', 'draft'].includes(app.stage);
      const isOverdue = isPending && app.statutory_deadline && new Date(app.statutory_deadline).getTime() < now.getTime();
      const pendencyStatus = isOverdue ? 'OVERDUE' : (isPending ? 'PENDING' : 'COMPLETED');

      const appRow = [
        app.application_number,
        app.institutions?.institution_code || 'N/A',
        app.institutions?.legal_name || 'N/A',
        app.institutions?.region || 'N/A',
        app.institutions?.state || 'N/A',
        app.application_type,
        app.stage,
        app.academic_year,
        app.requested_intake || 0,
        app.submitted_at ? app.submitted_at.toISOString().split('T')[0] : 'N/A',
        app.statutory_deadline ? app.statutory_deadline.toISOString().split('T')[0] : 'N/A',
        app.final_decision_at ? app.final_decision_at.toISOString().split('T')[0] : 'N/A',
        pendencyStatus
      ];
      lines.push(appRow.map(val => sanitizeCsvCell(val)).join(','));
    }

    const csvContent = lines.join('\r\n');
    const dateStamp = now.toISOString().split('T')[0];
    const filename = `AICTE_Regional_Performance_Report_${scopedRegion ? scopedRegion + '_' : ''}${dateStamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    console.error('[API /api/reports/regional/export error]:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate regional CSV report' },
      { status: 500 }
    );
  }
}
