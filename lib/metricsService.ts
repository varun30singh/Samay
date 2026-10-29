import { prisma } from '@/lib/prisma';
import { application_stage } from '@prisma/client';

export const AICTE_REGIONS = [
  'Western',
  'Northern',
  'Southern',
  'Eastern',
  'Central',
  'South-Western',
  'South-Central',
  'North-Western'
] as const;

export type AicteRegion = typeof AICTE_REGIONS[number];

export const TERMINAL_STAGES: application_stage[] = [
  'approved',
  'rejected',
  'withdrawn',
  'closed'
];

export const PENDING_STAGES: application_stage[] = [
  'submitted',
  'under_scrutiny',
  'deficiency_raised',
  'resubmitted',
  'ready_for_evc',
  'evc_scheduled',
  'evc_completed',
  'under_final_review'
];

export interface RegionalFilterOptions {
  region?: string;
  stage?: string;
  workflowType?: string;
  academicYear?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  isOverdueOnly?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Security scoping
  scopedRegion?: string | null;
}

export interface StatutoryKpis {
  totalApplications: number;
  pendingApplications: number;
  overdueApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  returnedForDeficiency: number;
  awaitingEvc: number;
  avgProcessingTimeDays: number | null;
  onTimeRatePercent: number | null;
  totalInstitutions: number;
}

export interface RegionSummaryMetric {
  region: string;
  totalApplications: number;
  pendingApplications: number;
  overdueApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  returnedForDeficiency: number;
  awaitingEvc: number;
  avgProcessingTimeDays: number | null;
  onTimeRatePercent: number | null;
  activeInstitutions: number;
}

export interface RegionalAnalyticsPayload {
  kpis: StatutoryKpis;
  regionComparison: RegionSummaryMetric[];
  charts: {
    statusDistribution: Array<{ stage: string; label: string; count: number; color: string }>;
    regionalPendency: Array<{ region: string; pending: number; overdue: number; approved: number }>;
    regionalVelocity: Array<{ region: string; avgDays: number | null; onTimeRate: number | null }>;
    timelineTrends: Array<{ period: string; submitted: number; completed: number }>;
    workflowDistribution: Array<{ workflow: string; count: number }>;
  };
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
  filterMeta: {
    appliedRegion: string | null;
    appliedStage: string | null;
    appliedWorkflow: string | null;
    academicYear: string | null;
    isScopedRegional: boolean;
    computedAt: string;
  };
}

/**
 * Builds standard Prisma `where` clause based on filters and role regional constraints.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildApplicationWhereClause(options: RegionalFilterOptions, now = new Date()): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  // 1. Regional scoping (Security: If scopedRegion is provided, force it regardless of user choice)
  if (options.scopedRegion) {
    where.institutions = { region: options.scopedRegion };
  } else if (options.region && options.region !== 'all' && options.region !== 'All Regions') {
    where.institutions = { region: options.region };
  }

  // 2. Stage / Status filter
  if (options.stage && options.stage !== 'all') {
    if (options.stage === 'pending') {
      where.stage = { in: PENDING_STAGES };
    } else if (options.stage === 'overdue') {
      where.stage = { in: PENDING_STAGES };
      where.statutory_deadline = { lt: now };
    } else if (options.stage === 'awaiting_evc') {
      where.stage = { in: ['ready_for_evc', 'evc_scheduled'] };
    } else {
      where.stage = options.stage;
    }
  }

  // 3. Overdue filter flag
  if (options.isOverdueOnly) {
    where.stage = { in: PENDING_STAGES };
    where.statutory_deadline = { lt: now };
  }

  // 4. Academic year
  if (options.academicYear && options.academicYear !== 'all') {
    where.academic_year = options.academicYear;
  }

  // 5. Workflow type (matches application_type or metadata->workflow_template_id)
  if (options.workflowType && options.workflowType !== 'all') {
    where.OR = [
      { application_type: options.workflowType },
      { metadata: { path: ['workflow_template_id'], equals: options.workflowType } }
    ];
  }

  // 6. Date Range on submitted_at or created_at
  if (options.startDate || options.endDate) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateFilter: Record<string, any> = {};
    if (options.startDate) {
      dateFilter.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    where.created_at = dateFilter;
  }

  // 7. Text Search
  if (options.search && options.search.trim()) {
    const q = options.search.trim();
    where.OR = [
      ...(where.OR || []),
      { application_number: { contains: q, mode: 'insensitive' } },
      { institutions: { legal_name: { contains: q, mode: 'insensitive' } } },
      { institutions: { institution_code: { contains: q, mode: 'insensitive' } } }
    ];
  }

  return where;
}

/**
 * Calculates statutory KPIs and Regional Analytics directly from Supabase PostgreSQL via Prisma.
 */
export async function getRegionalAnalytics(
  options: RegionalFilterOptions = {}
): Promise<RegionalAnalyticsPayload> {
  const now = new Date();
  const where = buildApplicationWhereClause(options, now);

  // 1. Fetch applications matching the primary filter criteria
  const applications = await prisma.applications.findMany({
    where,
    select: {
      id: true,
      application_number: true,
      application_type: true,
      stage: true,
      academic_year: true,
      submitted_at: true,
      statutory_deadline: true,
      final_decision_at: true,
      created_at: true,
      metadata: true,
      institutions: {
        select: {
          id: true,
          legal_name: true,
          region: true,
          institution_type: true
        }
      }
    }
  });

  // 2. Fetch distinct institution counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instWhere: Record<string, any> = {};
  if (options.scopedRegion) {
    instWhere.region = options.scopedRegion;
  } else if (options.region && options.region !== 'all' && options.region !== 'All Regions') {
    instWhere.region = options.region;
  }

  const [totalInstitutionsCount, institutionsWithRegion] = await Promise.all([
    prisma.institutions.count({ where: instWhere }),
    prisma.institutions.groupBy({
      by: ['region'],
      where: instWhere,
      _count: { id: true }
    })
  ]);

  const instCountMap: Record<string, number> = {};
  for (const item of institutionsWithRegion) {
    if (item.region) {
      instCountMap[item.region] = item._count.id;
    }
  }

  // 3. Compute KPI metrics using exact definitions from docs/METRICS.md
  let pendingCount = 0;
  let overdueCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let deficiencyRaisedCount = 0;
  let awaitingEvcCount = 0;

  let totalCompletedDurationDays = 0;
  let completedCountWithDates = 0;
  let completedOnTimeCount = 0;
  let totalCompletedCount = 0;

  for (const app of applications) {
    const stage = app.stage;
    const isPending = PENDING_STAGES.includes(stage);

    if (isPending) {
      pendingCount++;
      if (app.statutory_deadline && new Date(app.statutory_deadline).getTime() < now.getTime()) {
        overdueCount++;
      }
    }

    if (stage === 'approved') approvedCount++;
    if (stage === 'rejected') rejectedCount++;
    if (stage === 'deficiency_raised') deficiencyRaisedCount++;
    if (stage === 'ready_for_evc' || stage === 'evc_scheduled') awaitingEvcCount++;

    if (stage === 'approved' || stage === 'rejected') {
      totalCompletedCount++;
      if (app.submitted_at && app.final_decision_at) {
        const diffMs = new Date(app.final_decision_at).getTime() - new Date(app.submitted_at).getTime();
        const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
        totalCompletedDurationDays += diffDays;
        completedCountWithDates++;
      }

      if (app.final_decision_at && app.statutory_deadline) {
        const decisionTime = new Date(app.final_decision_at).getTime();
        const deadlineTime = new Date(app.statutory_deadline).getTime();
        if (decisionTime <= deadlineTime) {
          completedOnTimeCount++;
        }
      }
    }
  }

  const avgProcessingTimeDays = completedCountWithDates > 0
    ? Math.round((totalCompletedDurationDays / completedCountWithDates) * 10) / 10
    : null;

  const onTimeRatePercent = totalCompletedCount > 0
    ? Math.round((completedOnTimeCount / totalCompletedCount) * 1000) / 10
    : null;

  const kpis: StatutoryKpis = {
    totalApplications: applications.length,
    pendingApplications: pendingCount,
    overdueApplications: overdueCount,
    approvedApplications: approvedCount,
    rejectedApplications: rejectedCount,
    returnedForDeficiency: deficiencyRaisedCount,
    awaitingEvc: awaitingEvcCount,
    avgProcessingTimeDays,
    onTimeRatePercent,
    totalInstitutions: totalInstitutionsCount
  };

  // 4. Group by AICTE Region for regional comparison table
  const regionMap: Record<string, {
    total: number;
    pending: number;
    overdue: number;
    approved: number;
    rejected: number;
    returned: number;
    awaitingEvc: number;
    completedDurations: number[];
    completedTotal: number;
    completedOnTime: number;
  }> = {};

  // Initialize for all 8 standard regions
  for (const reg of AICTE_REGIONS) {
    regionMap[reg] = {
      total: 0,
      pending: 0,
      overdue: 0,
      approved: 0,
      rejected: 0,
      returned: 0,
      awaitingEvc: 0,
      completedDurations: [],
      completedTotal: 0,
      completedOnTime: 0
    };
  }

  // Populate per region
  for (const app of applications) {
    const reg = app.institutions?.region || 'Central';
    if (!regionMap[reg]) {
      regionMap[reg] = {
        total: 0,
        pending: 0,
        overdue: 0,
        approved: 0,
        rejected: 0,
        returned: 0,
        awaitingEvc: 0,
        completedDurations: [],
        completedTotal: 0,
        completedOnTime: 0
      };
    }

    const regStat = regionMap[reg];
    regStat.total++;

    const isPending = PENDING_STAGES.includes(app.stage);
    if (isPending) {
      regStat.pending++;
      if (app.statutory_deadline && new Date(app.statutory_deadline).getTime() < now.getTime()) {
        regStat.overdue++;
      }
    }

    if (app.stage === 'approved') regStat.approved++;
    if (app.stage === 'rejected') regStat.rejected++;
    if (app.stage === 'deficiency_raised') regStat.returned++;
    if (app.stage === 'ready_for_evc' || app.stage === 'evc_scheduled') regStat.awaitingEvc++;

    if (app.stage === 'approved' || app.stage === 'rejected') {
      regStat.completedTotal++;
      if (app.submitted_at && app.final_decision_at) {
        const diffMs = new Date(app.final_decision_at).getTime() - new Date(app.submitted_at).getTime();
        regStat.completedDurations.push(Math.max(0, diffMs / (1000 * 60 * 60 * 24)));
      }
      if (app.final_decision_at && app.statutory_deadline) {
        if (new Date(app.final_decision_at).getTime() <= new Date(app.statutory_deadline).getTime()) {
          regStat.completedOnTime++;
        }
      }
    }
  }

  const regionComparison: RegionSummaryMetric[] = Object.entries(regionMap).map(([region, stat]) => {
    const avgDays = stat.completedDurations.length > 0
      ? Math.round((stat.completedDurations.reduce((a, b) => a + b, 0) / stat.completedDurations.length) * 10) / 10
      : null;

    const onTimeRate = stat.completedTotal > 0
      ? Math.round((stat.completedOnTime / stat.completedTotal) * 1000) / 10
      : null;

    return {
      region,
      totalApplications: stat.total,
      pendingApplications: stat.pending,
      overdueApplications: stat.overdue,
      approvedApplications: stat.approved,
      rejectedApplications: stat.rejected,
      returnedForDeficiency: stat.returned,
      awaitingEvc: stat.awaitingEvc,
      avgProcessingTimeDays: avgDays,
      onTimeRatePercent: onTimeRate,
      activeInstitutions: instCountMap[region] || 0
    };
  });

  // Filter regional comparison if scoped to single region
  const finalRegionComparison = options.scopedRegion
    ? regionComparison.filter(r => r.region === options.scopedRegion)
    : regionComparison;

  // 5. Chart 1: Status Distribution
  const stageCounts: Record<string, number> = {};
  for (const app of applications) {
    stageCounts[app.stage] = (stageCounts[app.stage] || 0) + 1;
  }

  const stageColorMap: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: '#94A3B8' },
    submitted: { label: 'Submitted', color: '#38BDF8' },
    under_scrutiny: { label: 'Under Scrutiny', color: '#F59E0B' },
    deficiency_raised: { label: 'Deficiency Raised', color: '#EF4444' },
    resubmitted: { label: 'Resubmitted', color: '#8B5CF6' },
    ready_for_evc: { label: 'Ready for EVC', color: '#06B6D4' },
    evc_scheduled: { label: 'EVC Scheduled', color: '#3B82F6' },
    evc_completed: { label: 'EVC Completed', color: '#10B981' },
    under_final_review: { label: 'Final Review', color: '#EC4899' },
    approved: { label: 'Approved', color: '#138808' }, // Sovereign Green
    rejected: { label: 'Rejected', color: '#DC2626' },
    withdrawn: { label: 'Withdrawn', color: '#64748B' },
    closed: { label: 'Closed', color: '#475569' }
  };

  const statusDistribution = Object.entries(stageCounts).map(([stage, count]) => ({
    stage,
    label: stageColorMap[stage]?.label || stage,
    count,
    color: stageColorMap[stage]?.color || '#3B82F6'
  }));

  // 6. Chart 2: Regional Pendency Comparison
  const regionalPendency = finalRegionComparison.map(r => ({
    region: r.region,
    pending: r.pendingApplications,
    overdue: r.overdueApplications,
    approved: r.approvedApplications
  }));

  // 7. Chart 3: Regional Velocity
  const regionalVelocity = finalRegionComparison.map(r => ({
    region: r.region,
    avgDays: r.avgProcessingTimeDays,
    onTimeRate: r.onTimeRatePercent
  }));

  // 8. Chart 4: Submissions vs Completions over time (grouped by Month)
  const monthMap: Record<string, { submitted: number; completed: number }> = {};
  for (const app of applications) {
    if (app.submitted_at) {
      const monthKey = new Date(app.submitted_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!monthMap[monthKey]) monthMap[monthKey] = { submitted: 0, completed: 0 };
      monthMap[monthKey].submitted++;
    }
    if (app.final_decision_at) {
      const monthKey = new Date(app.final_decision_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!monthMap[monthKey]) monthMap[monthKey] = { submitted: 0, completed: 0 };
      monthMap[monthKey].completed++;
    }
  }

  const timelineTrends = Object.entries(monthMap).map(([period, data]) => ({
    period,
    submitted: data.submitted,
    completed: data.completed
  }));

  // If empty, provide a clean default structure
  if (timelineTrends.length === 0) {
    const curMonth = now.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    timelineTrends.push({ period: curMonth, submitted: applications.length, completed: totalCompletedCount });
  }

  // 9. Chart 5: Workflow Distribution
  const workflowMap: Record<string, number> = {};
  for (const app of applications) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (app.metadata || {}) as Record<string, any>;
    const wfName = meta.workflow_template_name || meta.workflow_template_id || app.application_type.replace(/_/g, ' ');
    workflowMap[wfName] = (workflowMap[wfName] || 0) + 1;
  }

  const workflowDistribution = Object.entries(workflowMap).map(([workflow, count]) => ({
    workflow,
    count
  }));

  return {
    kpis,
    regionComparison: finalRegionComparison,
    charts: {
      statusDistribution,
      regionalPendency,
      regionalVelocity,
      timelineTrends,
      workflowDistribution
    },
    filterMeta: {
      appliedRegion: options.scopedRegion || options.region || null,
      appliedStage: options.stage || null,
      appliedWorkflow: options.workflowType || null,
      academicYear: options.academicYear || null,
      isScopedRegional: Boolean(options.scopedRegion),
      computedAt: now.toISOString()
    }
  };
}

/**
 * Neutralizes Excel/CSV formula injection by prepending single quotes to unsafe prefixes.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // If the cell starts with formula trigger characters (=, +, -, @, tab, CR), prepend single quote
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  if (formulaTriggers.some(trigger => str.startsWith(trigger))) {
    str = `'${str}`;
  }

  // RFC 4180 escaping: quote if contains quotes, commas, or newlines
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}
