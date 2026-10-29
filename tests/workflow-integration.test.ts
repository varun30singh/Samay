import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { signJwtToken, TEST_JWT_SECRET, DEFAULT_SUPABASE_URL, EXPECTED_AUDIENCE } from '../lib/serverAuth';

// Set test environment secrets
process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
process.env.CRON_SECRET = 'samay-cron-internal-job-key-2026';

// Import route handlers
import { POST as authSessionHandler } from '../app/api/auth/session/route';
import { POST as postApplicationHandler } from '../app/api/applications/route';
import { GET as getApplicationByIdHandler } from '../app/api/applications/[id]/route';
import { POST as transitionStageHandler } from '../app/api/applications/[id]/transition/route';
import { POST as raiseDeficiencyHandler, PATCH as respondDeficiencyHandler } from '../app/api/applications/[id]/deficiency/route';
import { POST as postEvcHandler } from '../app/api/evc/route';
import { POST as completeEvcHandler } from '../app/api/evc/[id]/complete/route';
import { POST as postUndertakingHandler } from '../app/api/undertakings/route';
import { POST as verifyUndertakingHandler } from '../app/api/undertakings/[id]/verify/route';
import { POST as cronDeadlinesHandler } from '../app/api/cron/process-deadlines/route';
import { POST as dataImportHandler } from '../app/api/data-import/route';
import { GET as getAuditHandler } from '../app/api/audit/route';
import { GET as verifyAuditHandler } from '../app/api/audit/verify/route';
import { GET as getWorkflowConfigHandler, PUT as putWorkflowConfigHandler } from '../app/api/workflow/config/route';
import { POST as uploadDocumentHandler } from '../app/api/documents/upload/route';
import { GET as downloadDocumentHandler } from '../app/api/documents/[id]/download/route';
import { prisma } from '../lib/prisma';
import { WORKFLOW_TRANSITION_RULES } from '../lib/workflowService';

function makeToken(sub: string, role: string, options?: { institutionId?: string; region?: string; email?: string }) {
  return signJwtToken(
    {
      sub,
      email: options?.email || `${role}@aicte-india.org`,
      iss: `${DEFAULT_SUPABASE_URL}/auth/v1`,
      aud: EXPECTED_AUDIENCE,
      app_metadata: {
        role,
        institution_id: options?.institutionId,
        region: options?.region
      }
    },
    TEST_JWT_SECRET,
    3600
  );
}

test('INTEGRATION 1: POST /api/auth/session issues valid signed JWT sessions with profile metadata', async () => {
  // 1. Valid login for scrutiny officer
  const req = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({ userId: '550e8400-e29b-41d4-a716-446655440002' })
  });
  const res = await authSessionHandler(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.token);
  assert.equal(data.user.role, 'scrutiny_officer');
  assert.equal(data.user.region, 'Western');

  // 2. Missing user ID fails with 400
  const badReq = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({})
  });
  const badRes = await authSessionHandler(badReq);
  assert.equal(badRes.status, 400);
});

test('INTEGRATION 2: Regulatory Application Lifecycle (Create, Query, Transition, and Tenant Masking)', async () => {
  const spitInstId = 'a0000000-0000-0000-0000-000000000001';
  const spitUserId = '550e8400-e29b-41d4-a716-446655440007';
  const spitToken = makeToken(spitUserId, 'applicant', { institutionId: spitInstId, region: 'Western' });
  const scrutinyToken = makeToken('550e8400-e29b-41d4-a716-446655440002', 'scrutiny_officer', { region: 'Western' });
  const chairmanToken = makeToken('550e8400-e29b-41d4-a716-446655440006', 'competent_authority');

  // 1. Applicant registers new application
  const createReq = new NextRequest('http://localhost:3000/api/applications', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${spitToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_type: 'extension_of_approval',
      academic_year: '2026-2027',
      requested_intake: 420,
      requested_courses: ['Computer Engineering', 'Information Technology']
    })
  });
  const createRes = await postApplicationHandler(createReq);
  assert.equal(createRes.status, 201);
  const createData = await createRes.json();
  assert.equal(createData.success, true);
  const newAppId = createData.data?.id || createData.application?.id;
  assert.ok(newAppId);

  // 2. Applicant queries application details -> risk_score is masked
  const getAppReq = new NextRequest(`http://localhost:3000/api/applications/${newAppId}`, {
    headers: { Authorization: `Bearer ${spitToken}` }
  });
  const getAppRes = await getApplicationByIdHandler(getAppReq, { params: Promise.resolve({ id: newAppId }) });
  assert.equal(getAppRes.status, 200);
  const getAppData = await getAppRes.json();
  const appData = getAppData.data || getAppData.application;
  assert.ok(!appData.risk_score, 'Internal risk score must be masked for applicants');

  // 3. Officer queries application details -> risk_score is visible
  const officerReq = new NextRequest(`http://localhost:3000/api/applications/${newAppId}`, {
    headers: { Authorization: `Bearer ${scrutinyToken}` }
  });
  const officerRes = await getApplicationByIdHandler(officerReq, { params: Promise.resolve({ id: newAppId }) });
  assert.equal(officerRes.status, 200);
  const officerData = await officerRes.json();
  const officerAppData = officerData.data || officerData.application;
  assert.ok(officerAppData.risk_score !== undefined, 'Risk score must be visible to authorized scrutiny officers');

  // 4. Scrutiny Officer advances stage: submitted -> under_scrutiny
  const transReq1 = new NextRequest(`http://localhost:3000/api/applications/${newAppId}/transition`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${scrutinyToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      targetStage: 'under_scrutiny',
      remarks: 'Documents verified. Commencing formal scrutiny.'
    })
  });
  const transRes1 = await transitionStageHandler(transReq1, { params: Promise.resolve({ id: newAppId }) });
  assert.equal(transRes1.status, 200);

  // 5. Applicant CANNOT advance to ready_for_evc (officer role required)
  const illegalReq = new NextRequest(`http://localhost:3000/api/applications/${newAppId}/transition`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${spitToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ targetStage: 'ready_for_evc', remarks: 'Applicant attempting officer stage transition' })
  });
  const illegalRes = await transitionStageHandler(illegalReq, { params: Promise.resolve({ id: newAppId }) });
  assert.equal(illegalRes.status, 403, 'Applicant must be forbidden from advancing stage');

  // 6. Scrutiny officer advances: under_scrutiny -> ready_for_evc
  const transReq2 = new NextRequest(`http://localhost:3000/api/applications/${newAppId}/transition`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${scrutinyToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      targetStage: 'ready_for_evc',
      remarks: 'Scrutiny cleared with 100% compliance. Recommending EVC.'
    })
  });
  const transRes2 = await transitionStageHandler(transReq2, { params: Promise.resolve({ id: newAppId }) });
  assert.equal(transRes2.status, 200);

  // Advance through EVC to under_final_review
  const evcCoordinatorToken = makeToken('550e8400-e29b-41d4-a716-446655440005', 'evc_coordinator', { region: 'Western' });
  const transReq3 = new NextRequest(`http://localhost:3000/api/applications/${newAppId}/transition`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${evcCoordinatorToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetStage: 'evc_scheduled', remarks: 'EVC Visit Scheduled' })
  });
  const transRes3 = await transitionStageHandler(transReq3, { params: Promise.resolve({ id: newAppId }) });
  assert.equal(transRes3.status, 200);

  const transReq4 = new NextRequest(`http://localhost:3000/api/applications/${newAppId}/transition`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${evcCoordinatorToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetStage: 'evc_completed', remarks: 'EVC Visit Completed' })
  });
  const transRes4 = await transitionStageHandler(transReq4, { params: Promise.resolve({ id: newAppId }) });
  assert.equal(transRes4.status, 200);

  const transReq5 = new NextRequest(`http://localhost:3000/api/applications/${newAppId}/transition`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${scrutinyToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetStage: 'under_final_review', remarks: 'Ready for Competent Authority final review' })
  });
  const transRes5 = await transitionStageHandler(transReq5, { params: Promise.resolve({ id: newAppId }) });
  assert.equal(transRes5.status, 200);

  // 7. Scrutiny officer CANNOT grant final statutory approval (Chairman only)
  const officerApproveReq = new NextRequest(`http://localhost:3000/api/applications/${newAppId}/transition`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${scrutinyToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ targetStage: 'approved', remarks: 'Granting approval' })
  });
  const officerApproveRes = await transitionStageHandler(officerApproveReq, { params: Promise.resolve({ id: newAppId }) });
  assert.equal(officerApproveRes.status, 403, 'Only Competent Authority can grant final approval');

  // 8. Competent Authority records final statutory approval
  const caApproveReq = new NextRequest(`http://localhost:3000/api/applications/${newAppId}/transition`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chairmanToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      targetStage: 'approved',
      remarks: 'AICTE Executive Committee approved Extension of Approval for 2026-2027.'
    })
  });
  const caApproveRes = await transitionStageHandler(caApproveReq, { params: Promise.resolve({ id: newAppId }) });
  assert.equal(caApproveRes.status, 200);
});

test('INTEGRATION 3: Deficiency Raising, Tenant Isolation, and Rectification Workflow', async () => {
  const spitInstId = 'a0000000-0000-0000-0000-000000000001';
  const spitUserId = '550e8400-e29b-41d4-a716-446655440007';
  const otherInstId = 'a0000000-0000-0000-0000-000000000002';
  const spitToken = makeToken(spitUserId, 'applicant', { institutionId: spitInstId, region: 'Western' });
  const otherToken = makeToken('550e8400-e29b-41d4-a716-446655440008', 'applicant', { institutionId: otherInstId, region: 'Western' });
  const scrutinyToken = makeToken('550e8400-e29b-41d4-a716-446655440002', 'scrutiny_officer', { region: 'Western' });

  // Use baseline application
  const appId = 'd0000000-0000-0000-0000-000000000001';

  // 1. Scrutiny officer raises a deficiency
  const raiseReq = new NextRequest(`http://localhost:3000/api/applications/${appId}/deficiency`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${scrutinyToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Laboratory Equipment Shortfall',
      description: 'VLSI design laboratory requires 10 additional EDA tool workstations.',
      severity: 'high'
    })
  });
  const raiseRes = await raiseDeficiencyHandler(raiseReq, { params: Promise.resolve({ id: appId }) });
  assert.equal(raiseRes.status, 201);
  const raiseData = await raiseRes.json();
  assert.equal(raiseData.success, true);
  const defId = raiseData.data?.id || raiseData.deficiency?.id;
  assert.ok(defId);

  // 2. Cross-tenant applicant (Institution B) CANNOT respond to Institution A deficiency
  const crossReq = new NextRequest(`http://localhost:3000/api/applications/${appId}/deficiency`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${otherToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      deficiencyId: defId,
      responseComment: 'Attempting cross-tenant response',
      attachments: ['spoofed_invoice.pdf']
    })
  });
  const crossRes = await respondDeficiencyHandler(crossReq, { params: Promise.resolve({ id: appId }) });
  assert.equal(crossRes.status, 403, 'Cross-tenant deficiency response must be blocked with 403');

  // 3. Legitimate applicant (Institution A) responds with rectification evidence
  const legitReq = new NextRequest(`http://localhost:3000/api/applications/${appId}/deficiency`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${spitToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      deficiencyId: defId,
      responseComment: 'Procured 10 additional Cadence/Synopsys licensed workstations with tax invoice #INV-4412.',
      attachments: ['EDA_Workstations_Purchase_Invoice.pdf']
    })
  });
  const legitRes = await respondDeficiencyHandler(legitReq, { params: Promise.resolve({ id: appId }) });
  assert.equal(legitRes.status, 200);
  const legitData = await legitRes.json();
  assert.equal(legitData.success, true);
  const defResult = legitData.data || legitData.deficiency;
  assert.equal(defResult.status, 'responded');
});

test('INTEGRATION 4: EVC Scheduling and Inspection Outcome Recording', async () => {
  const evcCoordinatorToken = makeToken('550e8400-e29b-41d4-a716-446655440005', 'evc_coordinator', { region: 'Western' });
  const coepAppId = 'd0000000-0000-0000-0000-000000000002';

  // 1. Schedule EVC visit
  const schedReq = new NextRequest('http://localhost:3000/api/evc', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${evcCoordinatorToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: coepAppId,
      scheduled_start: '2026-03-22T09:30:00Z',
      scheduled_end: '2026-03-22T17:30:00Z',
      venue: 'COEP Main Campus, Pune',
      visit_mode: 'physical'
    })
  });
  const schedRes = await postEvcHandler(schedReq);
  assert.equal(schedRes.status, 201);
  const schedData = await schedRes.json();
  assert.equal(schedData.success, true);
  const visitId = schedData.data?.id || schedData.visit?.id;
  assert.ok(visitId);

  // 2. Complete EVC visit with outcome report
  const compReq = new NextRequest(`http://localhost:3000/api/evc/${visitId}/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${evcCoordinatorToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      outcome: 'EVC committee verified physical laboratories, barrier-free infrastructure, and faculty cadring. Recommended for full approval.'
    })
  });
  const compRes = await completeEvcHandler(compReq, { params: Promise.resolve({ id: visitId }) });
  assert.equal(compRes.status, 200);
  const compData = await compRes.json();
  assert.equal(compData.success, true);
  const visitResult = compData.data || compData.visit;
  assert.equal(visitResult.status, 'completed');
});

test('INTEGRATION 5: Undertaking Compliance and Officer Verification', async () => {
  const spitInstId = 'a0000000-0000-0000-0000-000000000001';
  const spitUserId = '550e8400-e29b-41d4-a716-446655440007';
  const spitAppId = 'd0000000-0000-0000-0000-000000000001';
  const spitToken = makeToken(spitUserId, 'applicant', { institutionId: spitInstId, region: 'Western' });
  const scrutinyToken = makeToken('550e8400-e29b-41d4-a716-446655440002', 'scrutiny_officer', { region: 'Western' });

  // 1. Applicant submits undertaking evidence
  const subReq = new NextRequest('http://localhost:3000/api/undertakings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${spitToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: spitAppId,
      undertaking_type: 'fire_safety_compliance',
      undertaking_text: 'Affidavit affirming valid Fire Safety NOC till 2028-06-30'
    })
  });
  const subRes = await postUndertakingHandler(subReq);
  assert.equal(subRes.status, 201);
  const subData = await subRes.json();
  assert.equal(subData.success, true);
  const undertakingId = subData.data?.id || subData.undertaking?.id;
  assert.ok(undertakingId);

  // 2. Applicant CANNOT self-verify the undertaking
  const selfVerReq = new NextRequest(`http://localhost:3000/api/undertakings/${undertakingId}/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${spitToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ decision: 'verified', comments: 'Self verification attempt' })
  });
  const selfVerRes = await verifyUndertakingHandler(selfVerReq, { params: Promise.resolve({ id: undertakingId }) });
  assert.equal(selfVerRes.status, 403, 'Applicant must be forbidden from self-verifying undertaking');

  // 3. Authorized Scrutiny Officer verifies undertaking
  const offVerReq = new NextRequest(`http://localhost:3000/api/undertakings/${undertakingId}/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${scrutinyToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ decision: 'verified', comments: 'Chief Fire Officer certification verified on municipal portal.' })
  });
  const offVerRes = await verifyUndertakingHandler(offVerReq, { params: Promise.resolve({ id: undertakingId }) });
  assert.equal(offVerRes.status, 200);
  const offVerData = await offVerRes.json();
  assert.equal(offVerData.success, true);
  const undertakingResult = offVerData.data || offVerData.undertaking;
  assert.equal(undertakingResult.status, 'verified');
});

test('INTEGRATION 6: Background Statutory Deadline & Escalation Engine', async () => {
  // 1. Trigger background statutory deadline processor with CRON secret
  const cronReq = new NextRequest('http://localhost:3000/api/cron/process-deadlines', {
    method: 'POST',
    headers: {
      'x-cron-secret': 'samay-cron-internal-job-key-2026'
    }
  });
  const cronRes = await cronDeadlinesHandler(cronReq);
  assert.equal(cronRes.status, 200);
  const cronData = await cronRes.json();
  assert.equal(cronData.success, true);
  assert.ok(typeof cronData.summary?.scanned === 'number');
  assert.ok(typeof cronData.summary?.alertsCreated === 'number');

  // 2. Unauthenticated request is rejected
  const unauthReq = new NextRequest('http://localhost:3000/api/cron/process-deadlines', {
    method: 'POST'
  });
  const unauthRes = await cronDeadlinesHandler(unauthReq);
  assert.equal(unauthRes.status, 401);
});

test('INTEGRATION 7: CSV Bulk Ingestion with Server-Side Validation and Transactional Database Insertion', async () => {
  const adminToken = makeToken('550e8400-e29b-41d4-a716-446655440001', 'system_admin');

  const validCsv = `applicationId,institutionName,aictePermanentId,region,state,type,route,approvedIntake,currentStage
APP-CSV-001,Sardar Patel Institute of Technology,1-100234,Western,Maharashtra,Extension of Approval (EoA),Scrutiny + EVC,360,Scrutiny
APP-CSV-002,College of Engineering Pune,1-100235,Western,Maharashtra,New Institution Approval,Scrutiny + EVC,300,Scrutiny`;

  const importReq = new NextRequest('http://localhost:3000/api/data-import', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      csvContent: validCsv,
      fileName: 'approved_institutions_batch_01.csv'
    })
  });

  const importRes = await dataImportHandler(importReq);
  assert.equal(importRes.status, 200);
  const importData = await importRes.json();
  assert.equal(importData.success, true);
  assert.equal(importData.totalRows, 2);
  assert.equal(importData.validCount, 2);
  assert.equal(importData.invalidCount, 0);
});

test('INTEGRATION 8: Tamper-Evident Cryptographic Audit Ledger Querying', async () => {
  const adminToken = makeToken('550e8400-e29b-41d4-a716-446655440001', 'system_admin');
  const spitToken = makeToken('550e8400-e29b-41d4-a716-446655440007', 'applicant');

  // 1. Applicant CANNOT inspect raw audit ledger
  const appReq = new NextRequest('http://localhost:3000/api/audit', {
    headers: { Authorization: `Bearer ${spitToken}` }
  });
  const appRes = await getAuditHandler(appReq);
  assert.equal(appRes.status, 403, 'Applicant must be forbidden from inspecting audit ledger');

  // 2. Administrator CAN query audit ledger
  const adminReq = new NextRequest('http://localhost:3000/api/audit?limit=10', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminRes = await getAuditHandler(adminReq);
  assert.equal(adminRes.status, 200);
  const adminData = await adminRes.json();
  assert.equal(adminData.success, true);
  const entries = adminData.data || adminData.entries;
  assert.ok(Array.isArray(entries));
  assert.ok(entries.length >= 1, 'At least genesis block must be present');
});

test('INTEGRATION 9: Tamper-Evident Cryptographic Hash Chain Verification (/api/audit/verify)', async () => {
  const adminToken = makeToken('550e8400-e29b-41d4-a716-446655440001', 'system_admin');
  const spitToken = makeToken('550e8400-e29b-41d4-a716-446655440007', 'applicant');

  // 1. Applicant cannot invoke cryptographic verification
  const appReq = new NextRequest('http://localhost:3000/api/audit/verify', {
    headers: { Authorization: `Bearer ${spitToken}` }
  });
  const appRes = await verifyAuditHandler(appReq);
  assert.equal(appRes.status, 403, 'Applicant must be forbidden from verifying audit ledger');

  // 2. Administrator executes cryptographic verification of all blocks in PostgreSQL
  const adminReq = new NextRequest('http://localhost:3000/api/audit/verify', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminRes = await verifyAuditHandler(adminReq);
  assert.equal(adminRes.status, 200);
  const data = await adminRes.json();
  assert.equal(data.success, true);
  assert.equal(data.verified, true, 'Audit ledger chain must be 100% unbroken');
  assert.equal(data.brokenAtBlock, null);
  assert.ok(data.totalBlocks > 0);
  assert.ok(data.latestHash);
});

test('INTEGRATION 10: Configurable Regulatory Workflow Engine (/api/workflow/config)', async () => {
  const adminToken = makeToken('550e8400-e29b-41d4-a716-446655440001', 'system_admin');
  const spitToken = makeToken('550e8400-e29b-41d4-a716-446655440007', 'applicant');

  // 1. GET workflow configuration
  const getReq = new NextRequest('http://localhost:3000/api/workflow/config', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const getRes = await getWorkflowConfigHandler(getReq);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.success, true);
  assert.ok(Array.isArray(getData.rules));
  assert.ok(getData.rules.length > 0);
  assert.ok(Array.isArray(getData.stages));

  // 2. Non-admin cannot modify workflow configuration -> 403
  const forbiddenReq = new NextRequest('http://localhost:3000/api/workflow/config', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${spitToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: getData.rules })
  });
  const forbiddenRes = await putWorkflowConfigHandler(forbiddenReq);
  assert.equal(forbiddenRes.status, 403);

  // 3. Admin updates workflow rules with version increment
  const putReq = new NextRequest('http://localhost:3000/api/workflow/config', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rules: WORKFLOW_TRANSITION_RULES,
      version: '1.2.0',
      reason: 'Statutory update to transition rules'
    })
  });
  const putRes = await putWorkflowConfigHandler(putReq);
  assert.equal(putRes.status, 200);
  const putData = await putRes.json();
  assert.equal(putData.success, true);
  assert.equal(putData.version, '1.2.0');
});

test('INTEGRATION 11: Secure Private Document Upload, Tenant Isolation & Retrieval', async () => {
  const spitToken = makeToken('550e8400-e29b-41d4-a716-446655440007', 'applicant'); // SPIT
  const coepToken = makeToken('550e8400-e29b-41d4-a716-446655440008', 'applicant'); // COEP

  const app = await prisma.applications.findFirst({
    where: { institution_id: 'a0000000-0000-0000-0000-000000000001' } // SPIT app
  });
  assert.ok(app, 'Test SPIT application must exist');

  // 1. Reject invalid MIME type
  const badMimeFormData = new FormData();
  badMimeFormData.append('file', new Blob(['echo malicious'], { type: 'application/x-sh' }), 'script.sh');
  badMimeFormData.append('applicationId', app.id);
  badMimeFormData.append('documentType', 'land_lease');

  const badMimeReq = new NextRequest('http://localhost:3000/api/documents/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${spitToken}` },
    body: badMimeFormData
  });
  const badMimeRes = await uploadDocumentHandler(badMimeReq);
  assert.equal(badMimeRes.status, 400);

  // 2. Upload valid PDF document
  const fileContent = 'SPIT Land Lease Deed Statutory Content ' + Date.now();
  const validFormData = new FormData();
  validFormData.append('file', new Blob([fileContent], { type: 'application/pdf' }), 'spit_lease_deed_2026.pdf');
  validFormData.append('applicationId', app.id);
  validFormData.append('documentType', 'land_lease');
  validFormData.append('expiresOn', '2030-12-31');

  const uploadReq = new NextRequest('http://localhost:3000/api/documents/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${spitToken}` },
    body: validFormData
  });
  const uploadRes = await uploadDocumentHandler(uploadReq);
  assert.equal(uploadRes.status, 201);
  const uploadData = await uploadRes.json();
  assert.equal(uploadData.success, true);
  assert.ok(uploadData.document.id);
  assert.ok(uploadData.document.sha256Hash);

  // 3. Cross-Tenant download prevention: COEP cannot download SPIT's private document -> 403
  const crossTenantReq = new NextRequest('http://localhost:3000/api/documents/' + uploadData.document.id + '/download', {
    headers: { Authorization: `Bearer ${coepToken}` }
  });
  const crossTenantRes = await downloadDocumentHandler(crossTenantReq, {
    params: Promise.resolve({ id: uploadData.document.id })
  });
  assert.equal(crossTenantRes.status, 403, 'Cross-tenant download must be forbidden');

  // 4. Authorized owner downloads exact binary content
  const authDownloadReq = new NextRequest('http://localhost:3000/api/documents/' + uploadData.document.id + '/download', {
    headers: { Authorization: `Bearer ${spitToken}` }
  });
  const authDownloadRes = await downloadDocumentHandler(authDownloadReq, {
    params: Promise.resolve({ id: uploadData.document.id })
  });
  assert.equal(authDownloadRes.status, 200);
  const downloadedText = await authDownloadRes.text();
  assert.equal(downloadedText, fileContent, 'Downloaded document content must match byte-for-byte');
});

test('INTEGRATION 12: Document Renewal Lifecycle and Expiry Preservation', async () => {
  const spitToken = makeToken('550e8400-e29b-41d4-a716-446655440007', 'applicant');
  const app = await prisma.applications.findFirst({
    where: { institution_id: 'a0000000-0000-0000-0000-000000000001' }
  });
  assert.ok(app);

  // 1. Initial fire safety certificate upload
  const initialFormData = new FormData();
  initialFormData.append('file', new Blob(['Initial Fire Safety 2026'], { type: 'application/pdf' }), 'fire_safety_v1.pdf');
  initialFormData.append('applicationId', app.id);
  initialFormData.append('documentType', 'fire_safety');
  initialFormData.append('expiresOn', '2026-03-31');

  const initReq = new NextRequest('http://localhost:3000/api/documents/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${spitToken}` },
    body: initialFormData
  });
  const initRes = await uploadDocumentHandler(initReq);
  assert.equal(initRes.status, 201);
  const initData = await initRes.json();
  const firstDocId = initData.document.id;

  // 2. Renewal upload replaces first version with new expiry
  const renewFormData = new FormData();
  renewFormData.append('file', new Blob(['Renewed Fire Safety 2027'], { type: 'application/pdf' }), 'fire_safety_v2_renewed.pdf');
  renewFormData.append('applicationId', app.id);
  renewFormData.append('documentType', 'fire_safety');
  renewFormData.append('expiresOn', '2027-03-31');
  renewFormData.append('isRenewal', 'true');

  const renewReq = new NextRequest('http://localhost:3000/api/documents/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${spitToken}` },
    body: renewFormData
  });
  const renewRes = await uploadDocumentHandler(renewReq);
  assert.equal(renewRes.status, 201);
  const renewData = await renewRes.json();
  assert.notEqual(renewData.document.id, firstDocId);

  // 3. Verify previous version was marked 'expired'
  const oldDoc = await prisma.documents.findUnique({ where: { id: firstDocId } });
  assert.equal(oldDoc?.document_status, 'expired', 'Previous document version must be transitioned to expired');
});
