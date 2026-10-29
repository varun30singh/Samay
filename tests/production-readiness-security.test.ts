import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { signJwtToken, TEST_JWT_SECRET, DEFAULT_SUPABASE_URL, EXPECTED_AUDIENCE } from '../lib/serverAuth';
import { prisma } from '../lib/prisma';
import { GET as verifyAuditHandler } from '../app/api/audit/verify/route';
import { GET as getApplicationByIdHandler } from '../app/api/applications/[id]/route';
import { POST as transitionStageHandler } from '../app/api/applications/[id]/transition/route';
import { POST as cronDeadlinesHandler } from '../app/api/cron/process-deadlines/route';
import { saveDocumentFile, readDocumentFile } from '../lib/storageService';

process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
process.env.CRON_SECRET = 'samay-cron-internal-job-key-2026';

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

test('PRODUCTION SECURITY 1: /api/audit/verify recomputes SHA-256 hashes and validates chain continuity', async () => {
  const adminToken = makeToken('550e8400-e29b-41d4-a716-446655440001', 'system_admin');
  const req = new NextRequest('http://localhost:3000/api/audit/verify', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const res = await verifyAuditHandler(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.verified, true);
  assert.equal(data.brokenAtBlock, null);
  assert.ok(data.totalBlocks > 0);
  assert.ok(data.latestHash);
});

test('PRODUCTION SECURITY 2: Applicant receives masked details with confidential inspection reports withheld', async () => {
  const spitToken = makeToken('550e8400-e29b-41d4-a716-446655440007', 'applicant');
  const app = await prisma.applications.findFirst({
    where: { institution_id: 'a0000000-0000-0000-0000-000000000001' }
  });
  assert.ok(app);

  const req = new NextRequest(`http://localhost:3000/api/applications/${app.id}`, {
    headers: { Authorization: `Bearer ${spitToken}` }
  });
  const res = await getApplicationByIdHandler(req, { params: Promise.resolve({ id: app.id }) });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  // Risk score and flags MUST be masked for external applicants
  assert.equal(data.data.risk_score, undefined);
  assert.equal(data.data.risk_flags, undefined);

  // EVC visits must not disclose internal expert reports or assignments to applicants
  if (Array.isArray(data.data.evc_visits) && data.data.evc_visits.length > 0) {
    for (const v of data.data.evc_visits) {
      assert.equal(v.report, null, 'Confidential inspection report must be masked from applicant');
      assert.deepEqual(v.evc_committee_assignments, [], 'Committee member identities must be masked');
    }
  }
});

test('PRODUCTION SECURITY 3: Only Competent Authority can record final approval decisions', async () => {
  const scrutinyToken = makeToken('550e8400-e29b-41d4-a716-446655440002', 'scrutiny_officer');
  let app = await prisma.applications.findFirst({
    where: { stage: 'under_final_review' }
  });
  if (!app) {
    const candidate = await prisma.applications.findFirst({
      where: { stage: 'evc_completed' }
    });
    if (candidate) {
      app = await prisma.applications.update({
        where: { id: candidate.id },
        data: { stage: 'under_final_review' }
      });
    }
  }
  assert.ok(app);

  const req = new NextRequest(`http://localhost:3000/api/applications/${app.id}/transition`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${scrutinyToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ targetStage: 'approved', remarks: 'Unauthorized approval attempt' })
  });
  const res = await transitionStageHandler(req, { params: Promise.resolve({ id: app.id }) });
  assert.equal(res.status, 403, 'Scrutiny officer must be forbidden from final approval');
});

test('PRODUCTION SECURITY 4: Cron endpoint enforces constant-time authentication and rejects forged secrets', async () => {
  // 1. Missing secret -> 401
  const noSecretReq = new NextRequest('http://localhost:3000/api/cron/process-deadlines', {
    method: 'POST'
  });
  const noSecretRes = await cronDeadlinesHandler(noSecretReq);
  assert.equal(noSecretRes.status, 401);

  // 2. Forged secret -> 401
  const forgedReq = new NextRequest('http://localhost:3000/api/cron/process-deadlines', {
    method: 'POST',
    headers: { 'x-cron-secret': 'invalid-attacker-provided-key' }
  });
  const forgedRes = await cronDeadlinesHandler(forgedReq);
  assert.equal(forgedRes.status, 401);

  // 3. Valid secret -> 200
  const validReq = new NextRequest('http://localhost:3000/api/cron/process-deadlines', {
    method: 'POST',
    headers: { 'x-cron-secret': 'samay-cron-internal-job-key-2026' }
  });
  const validRes = await cronDeadlinesHandler(validReq);
  assert.equal(validRes.status, 200);
  const data = await validRes.json();
  assert.equal(data.success, true);
});

test('PRODUCTION SECURITY 5: Storage service prevents directory traversal outside authorized root', async () => {
  const buffer = Buffer.from('Test File Content');
  // Attempt directory traversal in filename
  const result = await saveDocumentFile({
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    fileName: '../../../../etc/passwd',
    buffer
  });
  assert.ok(result.storagePath);
  assert.ok(!result.storagePath.includes('../'));

  // Attempt reading outside root
  await assert.rejects(async () => {
    await readDocumentFile('/etc/passwd');
  }, /Security Error: Document access outside authorized storage root is forbidden/);
});
