import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  validateServerAuth,
  verifyJwtToken,
  signJwtToken,
  signEs256Jwt,
  TEST_JWT_SECRET,
  EXPECTED_AUDIENCE
} from '../lib/serverAuth';

process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;

test('SECURITY AUDIT 1: Requests with no authentication are rejected with 401', async () => {
  const req = new Request('http://localhost:3000/api/applications');
  const result = await validateServerAuth(req);

  assert.equal(result.authenticated, false);
  assert.equal(result.authorized, false);
  assert.equal(result.status, 401);
  assert.match(result.error || '', /Authentication required/i);
});

test('SECURITY AUDIT 2: Arbitrary x-samay-user-id and x-samay-role headers CANNOT grant privileges (Spoofing Prevention)', async () => {
  const req = new Request('http://localhost:3000/api/applications', {
    headers: {
      'x-samay-user-id': 'SAM-ADM-0099',
      'x-samay-role': 'system_admin'
    }
  });

  const result = await validateServerAuth(req, ['system_admin']);

  assert.equal(result.authenticated, false);
  assert.equal(result.authorized, false);
  assert.equal(result.status, 401);
  assert.match(result.error || '', /Missing Bearer/i);
});

test('SECURITY AUDIT 3: Forged and invalid JWTs are rejected with 401', async () => {
  // 1. Malformed token structure
  const badStructureReq = new Request('http://localhost:3000/api/applications', {
    headers: {
      authorization: 'Bearer not-a-valid-jwt-token'
    }
  });
  const res1 = await validateServerAuth(badStructureReq);
  assert.equal(res1.authenticated, false);
  assert.equal(res1.status, 401);

  // 2. Token signed with wrong secret (Tampered / forged token)
  const forgedToken = signJwtToken(
    { sub: 'attacker-uuid', app_metadata: { role: 'system_admin' } },
    'wrong-untrusted-attacker-secret-key-123'
  );
  const forgedReq = new Request('http://localhost:3000/api/applications', {
    headers: {
      authorization: `Bearer ${forgedToken}`
    }
  });
  const res2 = await validateServerAuth(forgedReq);
  assert.equal(res2.authenticated, false);
  assert.equal(res2.status, 401);
  assert.match(res2.error || '', /Invalid cryptographic signature/i);

  // 3. Algorithm "none" attack
  const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const nonePayload = Buffer.from(JSON.stringify({ sub: 'user-1', app_metadata: { role: 'admin' }, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const noneToken = `${noneHeader}.${nonePayload}.`;
  const noneReq = new Request('http://localhost:3000/api/applications', {
    headers: {
      authorization: `Bearer ${noneToken}`
    }
  });
  const res3 = await validateServerAuth(noneReq);
  assert.equal(res3.authenticated, false);
  assert.equal(res3.status, 401);
  assert.match(res3.error || '', /Unsupported or disallowed JWT algorithm/i);
});

test('SECURITY AUDIT 4: Expired JWTs are rejected with 401', async () => {
  const expiredTime = Math.floor(Date.now() / 1000) - 300; // 5 minutes in past
  const expiredToken = signJwtToken(
    { sub: 'officer-uuid', app_metadata: { role: 'scrutiny_officer' }, exp: expiredTime },
    TEST_JWT_SECRET
  );

  const req = new Request('http://localhost:3000/api/applications', {
    headers: {
      authorization: `Bearer ${expiredToken}`
    }
  });

  const result = await validateServerAuth(req);
  assert.equal(result.authenticated, false);
  assert.equal(result.status, 401);
  assert.match(result.error || '', /Token has expired/i);
});

test('SECURITY AUDIT 5: Token with wrong issuer or audience is rejected', async () => {
  // 1. Wrong issuer
  const wrongIssToken = signJwtToken(
    {
      sub: 'user-uuid',
      iss: 'https://attacker-fake-project.supabase.co/auth/v1',
      aud: EXPECTED_AUDIENCE
    },
    TEST_JWT_SECRET
  );
  const issReq = new Request('http://localhost:3000/api/applications', {
    headers: { authorization: `Bearer ${wrongIssToken}` }
  });
  const issRes = await validateServerAuth(issReq);
  assert.equal(issRes.authenticated, false);
  assert.equal(issRes.status, 401);
  assert.match(issRes.error || '', /Invalid token issuer/i);

  // 2. Wrong audience
  const wrongAudToken = signJwtToken(
    {
      sub: 'user-uuid',
      aud: 'unauthorized-client-audience'
    },
    TEST_JWT_SECRET
  );
  const audReq = new Request('http://localhost:3000/api/applications', {
    headers: { authorization: `Bearer ${wrongAudToken}` }
  });
  const audRes = await validateServerAuth(audReq);
  assert.equal(audRes.authenticated, false);
  assert.equal(audRes.status, 401);
  assert.match(audRes.error || '', /Invalid token audience/i);
});

test('SECURITY AUDIT 6: User CANNOT promote themselves by modifying user_metadata (Role Authority)', async () => {
  // Attacker sets user_metadata.role = "system_admin" in their client profile
  const privilegeEscalationToken = signJwtToken(
    {
      sub: '550e8400-e29b-41d4-a716-446655440050',
      user_metadata: {
        role: 'system_admin',
        full_name: 'Attacker Name'
      }
      // Note: No app_metadata role provided
    },
    TEST_JWT_SECRET
  );

  const req = new Request('http://localhost:3000/api/admin-settings', {
    headers: {
      authorization: `Bearer ${privilegeEscalationToken}`
    }
  });

  const result = await validateServerAuth(req, ['system_admin']);

  // Verification succeeds, but user_metadata is NOT trusted for role. User defaults to applicant!
  assert.equal(result.authenticated, true);
  assert.equal(result.user?.role, 'applicant', 'User role must not be derived from user_metadata');
  assert.equal(result.user?.source, 'default_least_privilege');

  // Authorization must fail with 403 Forbidden
  assert.equal(result.authorized, false);
  assert.equal(result.status, 403);
  assert.match(result.error || '', /Forbidden: User role "applicant" does not have permission/i);
});

test('SECURITY AUDIT 7: User CANNOT change their institution association via user_metadata (Tenant Authority)', async () => {
  // Attacker sets user_metadata.institution_id to a victim institution
  const tenantTamperToken = signJwtToken(
    {
      sub: '550e8400-e29b-41d4-a716-446655440051',
      user_metadata: {
        role: 'institution',
        institution_id: '550e8400-e29b-41d4-a716-999999999999' // Target victim institution
      }
    },
    TEST_JWT_SECRET
  );

  const req = new Request('http://localhost:3000/api/institutions', {
    headers: {
      authorization: `Bearer ${tenantTamperToken}`
    }
  });

  const result = await validateServerAuth(req);
  assert.equal(result.authenticated, true);
  // institutionId must NOT be read from user_metadata
  assert.equal(result.user?.institutionId, undefined, 'institution_id must not be accepted from user_metadata');
});

test('SECURITY AUDIT 8A: Missing database profile CANNOT receive privileged access even with claimed app_metadata (Least Privilege)', async () => {
  const unprovisionedAdminToken = signJwtToken(
    {
      sub: '550e8400-e29b-41d4-a716-446655440001',
      app_metadata: {
        role: 'system_admin'
      }
    },
    TEST_JWT_SECRET
  );

  const req = new Request('http://localhost:3000/api/admin-settings', {
    headers: {
      authorization: `Bearer ${unprovisionedAdminToken}`
    }
  });

  // Since user has no record in public.profiles, privileged role must be denied
  const result = await validateServerAuth(req, ['system_admin'], {
    dbProfileOverride: null
  });

  assert.equal(result.authenticated, true);
  assert.equal(result.authorized, false);
  assert.equal(result.status, 403);
  assert.equal(result.user?.role, 'applicant');
  assert.equal(result.user?.source, 'missing_profile_least_privilege');
  assert.match(result.error || '', /Forbidden: User role "applicant" does not have permission/i);
});

test('SECURITY AUDIT 8B: Inactive database profile is rejected with 403 Forbidden (Account Revocation)', async () => {
  const deactivatedOfficerToken = signJwtToken(
    {
      sub: '550e8400-e29b-41d4-a716-446655440002',
      app_metadata: { role: 'scrutiny_officer' }
    },
    TEST_JWT_SECRET
  );

  const req = new Request('http://localhost:3000/api/applications', {
    headers: {
      authorization: `Bearer ${deactivatedOfficerToken}`
    }
  });

  const result = await validateServerAuth(req, ['scrutiny_officer'], {
    dbProfileOverride: {
      role: 'scrutiny_officer',
      institution_id: null,
      region: 'Northern',
      is_active: false // Deactivated by Administrator
    }
  });

  assert.equal(result.authenticated, true);
  assert.equal(result.authorized, false);
  assert.equal(result.status, 403);
  assert.match(result.error || '', /Forbidden: User account has been deactivated/i);
});

test('SECURITY AUDIT 8C: Authoritative active database profile grants role and tenant isolation', async () => {
  const adminToken = signJwtToken(
    {
      sub: '550e8400-e29b-41d4-a716-446655440003',
      app_metadata: { role: 'applicant' } // Stale or lower token claim
    },
    TEST_JWT_SECRET
  );

  const req = new Request('http://localhost:3000/api/admin-settings', {
    headers: {
      authorization: `Bearer ${adminToken}`
    }
  });

  // DB profile is the single source of truth and elevates/verifies the system_admin role
  const result = await validateServerAuth(req, ['system_admin'], {
    dbProfileOverride: {
      role: 'system_admin',
      institution_id: null,
      region: null,
      is_active: true
    }
  });

  assert.equal(result.authenticated, true);
  assert.equal(result.authorized, true);
  assert.equal(result.user?.userId, '550e8400-e29b-41d4-a716-446655440003');
  assert.equal(result.user?.role, 'system_admin');
  assert.equal(result.user?.source, 'database_profile');
});

test('SECURITY AUDIT 8D: Institution reassignment in DB profile takes immediate effect over token claims', async () => {
  const token = signJwtToken(
    {
      sub: '550e8400-e29b-41d4-a716-446655440004',
      app_metadata: {
        role: 'institution',
        institution_id: '550e8400-e29b-41d4-a716-000000000001' // Old institution in token
      }
    },
    TEST_JWT_SECRET
  );

  const req = new Request('http://localhost:3000/api/institutions', {
    headers: { authorization: `Bearer ${token}` }
  });

  // Admin has reassigned this user to a new institution in public.profiles:
  const newInstUuid = '550e8400-e29b-41d4-a716-000000000002';
  const result = await validateServerAuth(req, ['institution'], {
    dbProfileOverride: {
      role: 'institution',
      institution_id: newInstUuid,
      region: 'Western',
      is_active: true
    }
  });

  assert.equal(result.authenticated, true);
  assert.equal(result.authorized, true);
  assert.equal(result.user?.institutionId, newInstUuid, 'Must use authoritative DB institution, not token claim');
  assert.equal(result.user?.source, 'database_profile');
});

test('SECURITY AUDIT 9: Asymmetric ES256 verification validates cryptographic signatures correctly', async () => {
  // Generate EC P-256 keypair for ES256 testing
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  jwk.kid = 'test-es256-key-id';
  jwk.alg = 'ES256';
  jwk.use = 'sig';

  const es256Token = signEs256Jwt(
    {
      sub: '550e8400-e29b-41d4-a716-446655440060',
      app_metadata: { role: 'scrutiny_officer' },
      aud: EXPECTED_AUDIENCE
    },
    privateKey,
    'test-es256-key-id'
  );

  // 1. Valid ES256 token verification
  const validResult = await verifyJwtToken(es256Token, {
    customJwksKey: jwk as { kid: string; kty: string; [key: string]: unknown }
  });
  assert.equal(validResult.valid, true);
  assert.equal(validResult.payload?.sub, '550e8400-e29b-41d4-a716-446655440060');

  // 2. Tampered signature on ES256 token is rejected
  const parts = es256Token.split('.');
  const tamperedToken = `${parts[0]}.${parts[1]}.bad${parts[2].slice(3)}`;
  const tamperedResult = await verifyJwtToken(tamperedToken, {
    customJwksKey: jwk as { kid: string; kty: string; [key: string]: unknown }
  });
  assert.equal(tamperedResult.valid, false);
  assert.match(tamperedResult.error || '', /Invalid cryptographic ES256 signature/i);
});

test('SECURITY AUDIT 10: Unknown key ID (kid) in ES256 token fails closed safely without crashing', async () => {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const unknownKidToken = signEs256Jwt(
    {
      sub: '550e8400-e29b-41d4-a716-446655440070',
      app_metadata: { role: 'system_admin' }
    },
    privateKey,
    'non-existent-kid-9999-9999'
  );

  // Verification against an empty or mismatched JWKS keyset
  const result = await verifyJwtToken(unknownKidToken, {
    jwksFetchOverride: async () => []
  });

  assert.equal(result.valid, false);
  assert.match(result.error || '', /Unknown key ID/i);
});

test('SECURITY AUDIT 11: JWKS network fetch failure fails closed safely without unhandled exceptions', async () => {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const token = signEs256Jwt(
    {
      sub: '550e8400-e29b-41d4-a716-446655440080',
      app_metadata: { role: 'system_admin' }
    },
    privateKey,
    'some-kid'
  );

  // Simulate network crash or timeout during JWKS fetch
  const result = await verifyJwtToken(token, {
    jwksFetchOverride: async () => {
      throw new Error('Connection refused to Supabase auth endpoint');
    }
  });

  assert.equal(result.valid, false);
  assert.match(result.error || '', /Unknown key ID|ES256 signature verification failed/i);
});
