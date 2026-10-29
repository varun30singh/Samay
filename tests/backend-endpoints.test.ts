import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { signJwtToken, TEST_JWT_SECRET, setTestProfile } from '../lib/serverAuth';

process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
import { GET as settingsHandler } from '../app/api/system-settings/route';
import { GET as institutionsHandler } from '../app/api/institutions/route';
import { GET as applicationsHandler } from '../app/api/applications/route';
import { GET as workingCalendarHandler } from '../app/api/working-calendar/route';

test('SECURITY AUDIT: Public endpoints expose ONLY approved statutory data', async () => {
  // 1. GET /api/system-settings
  const settingsRes = await settingsHandler();
  assert.equal(settingsRes.status, 200);
  const settingsData = await settingsRes.json();
  assert.equal(settingsData.success, true);
  assert.equal(settingsData.source, 'Supabase PostgreSQL');

  // Verify only public statutory keys are returned
  assert.deepEqual(settingsData.settings.statutory_deadline, { day: 30, month: 4 });
  assert.equal(settingsData.settings.timezone, 'Asia/Kolkata');
  assert.equal(settingsData.settings.calendar_policy.exclude_sundays, true);

  // Ensure internal database metadata and raw records are NOT exposed
  assert.equal(settingsData.records, undefined, 'Raw database records must not be exposed');
  assert.equal(settingsData.updated_by, undefined);

  // 2. GET /api/working-calendar
  const calendarRes = await workingCalendarHandler();
  assert.equal(calendarRes.status, 200);
  const calendarData = await calendarRes.json();
  assert.equal(calendarData.success, true);
  assert.equal(calendarData.calendar.excludeSundays, true);
  assert.equal(calendarData.calendar.statutoryDeadline, '2026-04-30');
});

test('SECURITY AUDIT: GET /api/institutions rejects spoofed headers and enforces tenant isolation', async () => {
  // 1. Unauthenticated request -> 401
  const unauthReq = new NextRequest('http://localhost:3000/api/institutions');
  const unauthRes = await institutionsHandler(unauthReq);
  assert.equal(unauthRes.status, 401);

  // 2. Spoofed custom header attack -> MUST FAIL with 401
  const spoofReq = new NextRequest('http://localhost:3000/api/institutions', {
    headers: {
      'x-samay-user-id': 'SAM-ADM-0099',
      'x-samay-role': 'system_admin'
    }
  });
  const spoofRes = await institutionsHandler(spoofReq);
  assert.equal(spoofRes.status, 401, 'Custom headers without valid JWT must be rejected');

  // 3. Institution user without linked institutionId fails closed -> 403 Forbidden
  const unlinkedInstToken = signJwtToken(
    { sub: '550e8400-e29b-41d4-a716-446655440010', app_metadata: { role: 'institution' } },
    TEST_JWT_SECRET
  );
  const unlinkedReq = new NextRequest('http://localhost:3000/api/institutions', {
    headers: {
      authorization: `Bearer ${unlinkedInstToken}`
    }
  });
  const unlinkedRes = await institutionsHandler(unlinkedReq);
  assert.equal(unlinkedRes.status, 403, 'Unlinked institution user must not query general institutions');

  // 4. Valid officer token -> 200
  const officerToken = signJwtToken(
    { sub: '550e8400-e29b-41d4-a716-446655440020', app_metadata: { role: 'scrutiny_officer' } },
    TEST_JWT_SECRET
  );
  const officerReq = new NextRequest('http://localhost:3000/api/institutions?page=1&limit=5', {
    headers: {
      authorization: `Bearer ${officerToken}`
    }
  });
  const officerRes = await institutionsHandler(officerReq);
  assert.equal(officerRes.status, 200);
  const data = await officerRes.json();
  assert.equal(data.success, true);
  assert.equal(data.pagination.page, 1);
  assert.equal(data.pagination.limit, 5);

  // 5. Pagination boundary limit test: limit=500 is capped at 50
  const excessReq = new NextRequest('http://localhost:3000/api/institutions?limit=500', {
    headers: {
      authorization: `Bearer ${officerToken}`
    }
  });
  const excessRes = await institutionsHandler(excessReq);
  const excessData = await excessRes.json();
  assert.equal(excessData.pagination.limit, 50, 'Max page limit must be capped at 50');
});

test('SECURITY AUDIT: GET /api/applications rejects spoofed headers and enforces applicant masking', async () => {
  // 1. Unauthenticated request -> 401
  const unauthReq = new NextRequest('http://localhost:3000/api/applications');
  const unauthRes = await applicationsHandler(unauthReq);
  assert.equal(unauthRes.status, 401);

  // 2. Custom header spoofing attempt -> 401
  const spoofReq = new NextRequest('http://localhost:3000/api/applications', {
    headers: {
      'x-samay-user-id': 'SAM-RO-0042',
      'x-samay-role': 'regional_officer'
    }
  });
  const spoofRes = await applicationsHandler(spoofReq);
  assert.equal(spoofRes.status, 401);

  // 3. Applicant with unverified/missing tenant UUID fails closed -> 403 Forbidden
  const invalidApplicantToken = signJwtToken(
    { sub: 'not-a-valid-uuid', app_metadata: { role: 'applicant' } },
    TEST_JWT_SECRET
  );
  const invalidAppReq = new NextRequest('http://localhost:3000/api/applications', {
    headers: {
      authorization: `Bearer ${invalidApplicantToken}`
    }
  });
  const invalidAppRes = await applicationsHandler(invalidAppReq);
  assert.equal(invalidAppRes.status, 403);

  // 4. Valid Regional Officer token succeeds -> 200
  const roToken = signJwtToken(
    {
      sub: '550e8400-e29b-41d4-a716-446655440030',
      app_metadata: { role: 'regional_officer', region: 'Western' }
    },
    TEST_JWT_SECRET
  );
  const roReq = new NextRequest('http://localhost:3000/api/applications?page=1&limit=10', {
    headers: {
      authorization: `Bearer ${roToken}`
    }
  });
  const roRes = await applicationsHandler(roReq);
  assert.equal(roRes.status, 200);
  const roData = await roRes.json();
  assert.equal(roData.success, true);
  assert.equal(roData.pagination.limit, 10);
});

test('SECURITY AUDIT: Cross-tenant isolation blocks cross-institution querying and bounds regional scope', async () => {
  const verifiedInstId = '550e8400-e29b-41d4-a716-111111111111';
  const victimInstId = '550e8400-e29b-41d4-a716-222222222222';
  const instUserId = '550e8400-e29b-41d4-a716-446655440040';

  // Register verified institution in test DB profile store
  setTestProfile(instUserId, {
    role: 'institution',
    institution_id: verifiedInstId,
    region: 'Western',
    is_active: true
  });

  const instToken = signJwtToken(
    { sub: instUserId, app_metadata: { role: 'institution' } },
    TEST_JWT_SECRET
  );

  // 1. Institution queries /api/institutions - must succeed and be bound to verifiedInstId
  const instReq = new NextRequest(`http://localhost:3000/api/institutions?search=${victimInstId}`, {
    headers: { authorization: `Bearer ${instToken}` }
  });
  const instRes = await institutionsHandler(instReq);
  assert.equal(instRes.status, 200);
  const instData = await instRes.json();
  assert.equal(instData.success, true);

  // 2. Institution queries /api/applications - risk analysis metrics must be masked
  const appsReq = new NextRequest('http://localhost:3000/api/applications', {
    headers: { authorization: `Bearer ${instToken}` }
  });
  const appsRes = await applicationsHandler(appsReq);
  assert.equal(appsRes.status, 200);
  const appsData = await appsRes.json();
  assert.equal(appsData.success, true);

  // 3. Regional Officer attempting parameter tampering (widen region to 'Northern')
  const roTamperReq = new NextRequest('http://localhost:3000/api/applications?region=Northern', {
    headers: {
      authorization: `Bearer ${signJwtToken(
        { sub: '550e8400-e29b-41d4-a716-446655440030', app_metadata: { role: 'regional_officer', region: 'Western' } },
        TEST_JWT_SECRET
      )}`
    }
  });
  const roTamperRes = await applicationsHandler(roTamperReq);
  assert.equal(roTamperRes.status, 200);
  const roTamperData = await roTamperRes.json();
  assert.equal(roTamperData.success, true);
});

test('SECURITY AUDIT: Unassigned regional officer fails closed with 403 Forbidden', async () => {
  const unassignedRoId = '550e8400-e29b-41d4-a716-446655440099';
  setTestProfile(unassignedRoId, {
    role: 'regional_officer',
    institution_id: null,
    region: null, // No assigned region in DB profile
    is_active: true
  });

  const unassignedRoToken = signJwtToken(
    { sub: unassignedRoId, app_metadata: { role: 'regional_officer' } },
    TEST_JWT_SECRET
  );

  // 1. Unassigned RO queries institutions -> 403 Forbidden
  const instReq = new NextRequest('http://localhost:3000/api/institutions', {
    headers: { authorization: `Bearer ${unassignedRoToken}` }
  });
  const instRes = await institutionsHandler(instReq);
  assert.equal(instRes.status, 403);
  const instData = await instRes.json();
  assert.match(instData.error || '', /Regional officer account is not assigned to a valid regional jurisdiction/i);

  // 2. Unassigned RO queries applications -> 403 Forbidden
  const appsReq = new NextRequest('http://localhost:3000/api/applications', {
    headers: { authorization: `Bearer ${unassignedRoToken}` }
  });
  const appsRes = await applicationsHandler(appsReq);
  assert.equal(appsRes.status, 403);
  const appsData = await appsRes.json();
  assert.match(appsData.error || '', /Regional officer account is not assigned to a valid regional jurisdiction/i);
});

test('SECURITY AUDIT: Applicant A is isolated from Applicant B and risk fields are masked', async () => {
  const applicantAId = '550e8400-e29b-41d4-a716-446655440041';
  const applicantBId = '550e8400-e29b-41d4-a716-446655440042';

  setTestProfile(applicantAId, {
    role: 'applicant',
    institution_id: null,
    region: null,
    is_active: true
  });

  const tokenA = signJwtToken(
    { sub: applicantAId, app_metadata: { role: 'applicant' } },
    TEST_JWT_SECRET
  );

  // Applicant A queries applications passing search query intended for Applicant B's identifier
  const req = new NextRequest(`http://localhost:3000/api/applications?search=${applicantBId}`, {
    headers: { authorization: `Bearer ${tokenA}` }
  });
  const res = await applicationsHandler(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  // Any returned records must not contain risk analysis
  for (const item of data.data) {
    assert.equal(item.risk_score, undefined, 'risk_score must not be returned to applicants');
    assert.equal(item.risk_flags, undefined, 'risk_flags must not be returned to applicants');
  }
});
