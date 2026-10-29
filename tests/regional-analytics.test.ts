import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { signJwtToken, TEST_JWT_SECRET } from '../lib/serverAuth';
import {
  sanitizeCsvCell,
  buildApplicationWhereClause,
  getRegionalAnalytics,
  PENDING_STAGES
} from '../lib/metricsService';
import { GET as regionalReportHandler } from '../app/api/reports/regional/route';
import { GET as regionalExportHandler } from '../app/api/reports/regional/export/route';

process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;

test('REGIONAL ANALYTICS UNIT 1: CSV Sanitization neutralizes Excel/CSV Formula Injection', () => {
  // Test formula triggers: =, +, -, @, \t, \r
  assert.equal(sanitizeCsvCell('=1+1'), "'=1+1");
  assert.equal(sanitizeCsvCell('+cmd|/c calc'), "'+cmd|/c calc");
  assert.equal(sanitizeCsvCell('-5+2'), "'-5+2");
  assert.equal(sanitizeCsvCell('@SUM(A1:A10)'), "'@SUM(A1:A10)");
  assert.equal(sanitizeCsvCell('\tcalc'), "'\tcalc");

  // Test RFC 4180 escaping
  assert.equal(sanitizeCsvCell('Normal Text'), 'Normal Text');
  assert.equal(sanitizeCsvCell('Text with, comma'), '"Text with, comma"');
  assert.equal(sanitizeCsvCell('Text with "quotes"'), '"Text with ""quotes"""');
  assert.equal(sanitizeCsvCell(null), '');
  assert.equal(sanitizeCsvCell(undefined), '');
  assert.equal(sanitizeCsvCell(42), '42');
});

test('REGIONAL ANALYTICS UNIT 2: buildApplicationWhereClause enforces filters & regional scoping override', () => {
  const now = new Date('2026-05-01T00:00:00.000Z');

  // 1. Regional officer scoping overrides user-selected region
  const scopedWhere = buildApplicationWhereClause(
    { region: 'Northern', scopedRegion: 'Western' },
    now
  );
  assert.deepEqual(scopedWhere.institutions, { region: 'Western' });

  // 2. Pending filter targets non-terminal active stages
  const pendingWhere = buildApplicationWhereClause({ stage: 'pending' }, now);
  assert.deepEqual(pendingWhere.stage, { in: PENDING_STAGES });

  // 3. Overdue filter enforces pending stages and statutory deadline before reference date
  const overdueWhere = buildApplicationWhereClause({ stage: 'overdue' }, now);
  assert.deepEqual(overdueWhere.stage, { in: PENDING_STAGES });
  assert.deepEqual(overdueWhere.statutory_deadline, { lt: now });

  // 4. Academic year and workflow type
  const yearWhere = buildApplicationWhereClause({ academicYear: '2026-2027' }, now);
  assert.equal(yearWhere.academic_year, '2026-2027');
});

test('REGIONAL ANALYTICS SERVICE: getRegionalAnalytics aggregates statutory KPIs & all 8 regions', async () => {
  const analytics = await getRegionalAnalytics();

  assert.ok(analytics.kpis);
  assert.ok(typeof analytics.kpis.totalApplications === 'number');
  assert.ok(typeof analytics.kpis.pendingApplications === 'number');
  assert.ok(typeof analytics.kpis.overdueApplications === 'number');
  assert.ok(typeof analytics.kpis.approvedApplications === 'number');
  assert.ok(typeof analytics.kpis.rejectedApplications === 'number');

  // Verify regional comparison array covers all 8 standard regions
  assert.ok(Array.isArray(analytics.regionComparison));
  assert.equal(analytics.regionComparison.length, 8);

  const regionNames = analytics.regionComparison.map(r => r.region);
  assert.ok(regionNames.includes('Western'));
  assert.ok(regionNames.includes('Northern'));
  assert.ok(regionNames.includes('Southern'));
  assert.ok(regionNames.includes('Eastern'));
  assert.ok(regionNames.includes('Central'));
  assert.ok(regionNames.includes('South-Western'));
  assert.ok(regionNames.includes('South-Central'));
  assert.ok(regionNames.includes('North-Western'));

  // Verify charts data payload exists
  assert.ok(Array.isArray(analytics.charts.statusDistribution));
  assert.ok(Array.isArray(analytics.charts.regionalPendency));
  assert.ok(Array.isArray(analytics.charts.regionalVelocity));
  assert.ok(Array.isArray(analytics.charts.timelineTrends));
  assert.ok(Array.isArray(analytics.charts.workflowDistribution));
});

test('REGIONAL ANALYTICS API: GET /api/reports/regional enforces authentication & RBAC', async () => {
  // 1. Unauthenticated request -> 401
  const unauthReq = new NextRequest('http://localhost:3000/api/reports/regional');
  const unauthRes = await regionalReportHandler(unauthReq);
  assert.equal(unauthRes.status, 401);

  // 2. Applicant token (unauthorized role) -> 403 Forbidden
  const applicantToken = signJwtToken(
    { sub: '550e8400-e29b-41d4-a716-446655440007', app_metadata: { role: 'applicant' } },
    TEST_JWT_SECRET
  );
  const applicantReq = new NextRequest('http://localhost:3000/api/reports/regional', {
    headers: { authorization: `Bearer ${applicantToken}` }
  });
  const applicantRes = await regionalReportHandler(applicantReq);
  assert.equal(applicantRes.status, 403);

  // 3. Admin token -> 200 with national coverage
  const adminToken = signJwtToken(
    { sub: '550e8400-e29b-41d4-a716-446655440001', app_metadata: { role: 'system_admin' } },
    TEST_JWT_SECRET
  );
  const adminReq = new NextRequest('http://localhost:3000/api/reports/regional', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  const adminRes = await regionalReportHandler(adminReq);
  assert.equal(adminRes.status, 200);
  const adminData = await adminRes.json();
  assert.equal(adminData.success, true);
  assert.equal(adminData.data.filterMeta.isScopedRegional, false);
  assert.equal(adminData.data.regionComparison.length, 8);

  // 4. Regional Officer token (Western) -> 200 strictly scoped to Western
  const roToken = signJwtToken(
    { sub: '550e8400-e29b-41d4-a716-446655440003', app_metadata: { role: 'regional_officer' } },
    TEST_JWT_SECRET
  );
  const roReq = new NextRequest('http://localhost:3000/api/reports/regional', {
    headers: { authorization: `Bearer ${roToken}` }
  });
  const roRes = await regionalReportHandler(roReq);
  assert.equal(roRes.status, 200);
  const roData = await roRes.json();
  assert.equal(roData.success, true);
  assert.equal(roData.data.filterMeta.isScopedRegional, true);
  assert.equal(roData.data.filterMeta.appliedRegion, 'Western');
  assert.equal(roData.data.regionComparison.length, 1);
  assert.equal(roData.data.regionComparison[0].region, 'Western');
});

test('REGIONAL ANALYTICS API: GET /api/reports/regional with includeList returns paginated drilldown', async () => {
  const adminToken = signJwtToken(
    { sub: '550e8400-e29b-41d4-a716-446655440001', app_metadata: { role: 'admin' } },
    TEST_JWT_SECRET
  );
  const req = new NextRequest('http://localhost:3000/api/reports/regional?includeList=true&page=1&pageSize=5', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  const res = await regionalReportHandler(req);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.data.applications));
  assert.ok(json.data.pagination);
  assert.equal(json.data.pagination.currentPage, 1);
  assert.equal(json.data.pagination.pageSize, 5);
  assert.ok(json.data.pagination.totalItems > 0);
});

test('REGIONAL ANALYTICS EXPORT: GET /api/reports/regional/export generates RFC 4180 CSV with sanitized cells', async () => {
  const adminToken = signJwtToken(
    { sub: '550e8400-e29b-41d4-a716-446655440001', app_metadata: { role: 'admin' } },
    TEST_JWT_SECRET
  );
  const exportReq = new NextRequest('http://localhost:3000/api/reports/regional/export', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  const exportRes = await regionalExportHandler(exportReq);
  assert.equal(exportRes.status, 200);
  assert.equal(exportRes.headers.get('content-type'), 'text/csv; charset=utf-8');
  assert.ok(exportRes.headers.get('content-disposition')?.includes('attachment; filename="AICTE_Regional_Performance_Report_'));

  const csvBody = await exportRes.text();
  assert.ok(csvBody.includes('AICTE APPROVAL WORKFLOW & PENDENCY MONITORING SYSTEM (SAMAY)'));
  assert.ok(csvBody.includes('--- STATUTORY PERFORMANCE KPIS ---'));
  assert.ok(csvBody.includes('--- REGIONAL COMPARISON TABLE ---'));
  assert.ok(csvBody.includes('--- FILTERED APPLICATIONS DATASET ---'));
  assert.ok(csvBody.includes('Western'));
  assert.ok(csvBody.includes('Northern'));
});
