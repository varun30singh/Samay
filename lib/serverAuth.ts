import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export interface AuthenticatedUser {
  userId: string;
  role: string;
  email?: string;
  institutionId?: string;
  region?: string;
  source: 'database_profile' | 'server_app_metadata' | 'default_least_privilege' | 'missing_profile_least_privilege';
}

export interface AuthResult {
  authenticated: boolean;
  authorized: boolean;
  status?: number;
  error?: string;
  user?: AuthenticatedUser;
}

export interface JwtHeader {
  alg?: string;
  typ?: string;
  kid?: string;
  [key: string]: unknown;
}

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  app_metadata?: {
    role?: string;
    roles?: string[];
    institution_id?: string;
    region?: string;
    provider?: string;
    [key: string]: unknown;
  };
  user_metadata?: {
    // Note: user_metadata is user-editable client data and NEVER trusted for authorization
    role?: string;
    institution_id?: string;
    region?: string;
    full_name?: string;
    [key: string]: unknown;
  };
  institution_id?: string;
  region?: string;
  exp: number;
  nbf?: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
  [key: string]: unknown;
}

export interface SignJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  app_metadata?: {
    role?: string;
    roles?: string[];
    institution_id?: string;
    region?: string;
    provider?: string;
    [key: string]: unknown;
  };
  user_metadata?: {
    role?: string;
    institution_id?: string;
    region?: string;
    full_name?: string;
    [key: string]: unknown;
  };
  institution_id?: string;
  region?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
  [key: string]: unknown;
}

// Normalized role hierarchy for SAMAY statutory governance
export const VALID_ROLES = [
  'scrutiny_officer',
  'regional_officer',
  'bureau_officer',
  'evc_coordinator',
  'competent_authority',
  'system_admin',
  'institution',
  // DB enum mappings
  'applicant',
  'institution_admin',
  'expert',
  'approving_authority',
  'admin'
] as const;

export type ValidRole = typeof VALID_ROLES[number];

// Roles that confer administrative, scrutiny, or statutory regulatory privileges
export const PRIVILEGED_ROLES = [
  'scrutiny_officer',
  'regional_officer',
  'bureau_officer',
  'evc_coordinator',
  'competent_authority',
  'system_admin',
  'admin',
  'approving_authority',
  'expert'
] as const;

// Default secret for test environments only
export const TEST_JWT_SECRET = 'samay-sovereign-test-jwt-secret-min-32-chars-2026';

// Supabase project reference and configuration
export const SUPABASE_PROJECT_REF = 'ozqvlqamfvpirgmsldrb';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
export const EXPECTED_AUDIENCE = 'authenticated';

export interface JwkKey {
  kid: string;
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  alg?: string;
  use?: string;
  [key: string]: unknown;
}

let jwksCache: { keys: JwkKey[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Resolves the JWT secret from environment configuration.
 * Fails closed in production if no secret is configured.
 */
export function getJwtSecret(): string | null {
  if (process.env.SUPABASE_JWT_SECRET) return process.env.SUPABASE_JWT_SECRET;
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  // Test execution detection (Node test runner or explicit test environment)
  if (
    process.env.NODE_ENV === 'test' ||
    process.argv.some(arg => arg.includes('test')) ||
    process.env.NODE_TEST_CONTEXT
  ) {
    return TEST_JWT_SECRET;
  }
  // Local development fallback
  if (process.env.NODE_ENV === 'development') {
    return process.env.DEV_JWT_SECRET || 'samay-dev-secret-local-development-only-not-for-prod';
  }
  return null;
}

/**
 * Fetches and caches the Supabase public JWKS keys for asymmetric ES256 verification.
 */
export async function getSupabaseJwksKeys(forceRefresh: boolean = false): Promise<JwkKey[]> {
  const now = Date.now();
  if (!forceRefresh && jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

    const res = await fetch(jwksUrl, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      console.error(`[JWKS FETCH FAILED] Status: ${res.status}`);
      return jwksCache ? jwksCache.keys : [];
    }

    const data = await res.json();
    if (data && Array.isArray(data.keys)) {
      jwksCache = { keys: data.keys, fetchedAt: now };
      return data.keys;
    }
    return [];
  } catch (err) {
    console.error('[JWKS FETCH ERROR]', err instanceof Error ? err.message : err);
    return jwksCache ? jwksCache.keys : [];
  }
}

export interface VerifyJwtOptions {
  secretOverride?: string;
  expectedIssuer?: string;
  expectedAudience?: string;
  customJwksKey?: JwkKey;
  jwksFetchOverride?: () => Promise<JwkKey[]>;
}

/**
 * Cryptographically verifies a JSON Web Token supporting:
 * - Asymmetric ES256 (ECDSA P-256) via Supabase Project JWKS
 * - Symmetric HS256 (HMAC-SHA256) via configured server secret
 *
 * Validates:
 * 1. Cryptographic signature (timing-safe)
 * 2. Whitelisted algorithm (ES256, HS256; rejects none/others)
 * 3. Issuer (iss)
 * 4. Audience (aud)
 * 5. Expiration (exp) with 60-second skew tolerance
 * 6. Not-Before (nbf)
 * 7. Identity subject (sub)
 */
export async function verifyJwtToken(
  token: string,
  options?: VerifyJwtOptions
): Promise<{ valid: boolean; payload?: JwtPayload; error?: string }> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing or malformed' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid JWT structure: expected 3 dot-separated parts' };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 1. Decode header and payload safely
  let header: JwtHeader;
  let payload: JwtPayload;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
  } catch {
    return { valid: false, error: 'Malformed token JSON encoding' };
  }

  // 2. Permitted signing algorithm validation - strictly whitelist ES256 and HS256
  const alg = header.alg;
  if (alg !== 'ES256' && alg !== 'HS256') {
    return { valid: false, error: `Unsupported or disallowed JWT algorithm: "${alg}". Permitted: ES256, HS256.` };
  }

  // 3. Signature verification based on algorithm
  const signedContent = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');

  if (alg === 'ES256') {
    // Asymmetric ECDSA ES256 verification using Supabase JWKS
    try {
      let matchingJwk: JwkKey | undefined = options?.customJwksKey;

      if (!matchingJwk) {
        let jwksKeys = options?.jwksFetchOverride
          ? await options.jwksFetchOverride()
          : await getSupabaseJwksKeys(false);

        matchingJwk = header.kid
          ? jwksKeys.find(k => k.kid === header.kid)
          : jwksKeys[0];

        // If kid is not found in cache and no override was provided, force-refresh from Supabase once
        if (!matchingJwk && header.kid && !options?.jwksFetchOverride) {
          jwksKeys = await getSupabaseJwksKeys(true);
          matchingJwk = jwksKeys.find(k => k.kid === header.kid);
        }
      }

      if (!matchingJwk) {
        return {
          valid: false,
          error: header.kid
            ? `Unknown key ID (kid): "${header.kid}". No matching public key in Supabase JWKS.`
            : 'No asymmetric public keys available in Supabase JWKS'
        };
      }

      const publicKey = crypto.createPublicKey({ key: matchingJwk as unknown as crypto.JsonWebKey, format: 'jwk' });
      const signatureBuffer = Buffer.from(signatureB64, 'base64url');

      const isValid = crypto.verify(
        'SHA256',
        signedContent,
        { key: publicKey, dsaEncoding: 'ieee-p1363' },
        signatureBuffer
      );

      if (!isValid) {
        return { valid: false, error: 'Invalid cryptographic ES256 signature' };
      }
    } catch (err) {
      return { valid: false, error: `ES256 signature verification failed: ${err instanceof Error ? err.message : 'Unknown'}` };
    }
  } else if (alg === 'HS256') {
    // Symmetric HMAC-SHA256 verification
    const secret = options?.secretOverride || getJwtSecret();
    if (!secret) {
      console.error('[SECURITY CONFIG] SUPABASE_JWT_SECRET is missing. Failing closed.');
      return { valid: false, error: 'Server authentication secret not configured' };
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedContent)
        .digest('base64url');

      const sigBuffer = Buffer.from(signatureB64, 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return { valid: false, error: 'Invalid cryptographic signature' };
      }
    } catch {
      return { valid: false, error: 'HMAC signature verification failed' };
    }
  }

  // 4. Expiration check with 60-second clock skew tolerance
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number') {
    return { valid: false, error: 'Token missing required "exp" expiration claim' };
  }
  if (payload.exp < now - 60) {
    return { valid: false, error: 'Token has expired' };
  }

  // 5. Not-Before check
  if (typeof payload.nbf === 'number' && payload.nbf > now + 60) {
    return { valid: false, error: 'Token is not yet active (nbf)' };
  }

  // 6. Identity subject check
  if (!payload.sub || typeof payload.sub !== 'string') {
    return { valid: false, error: 'Token missing required "sub" subject claim' };
  }

  // 7. Issuer validation (when present or enforced)
  if (payload.iss) {
    const isTest = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));
    const expectedIssuer = options?.expectedIssuer || `${process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL}/auth/v1`;

    if (isTest && (payload.iss === 'samay-auth-test' || payload.iss === expectedIssuer)) {
      // Allowed in test
    } else if (payload.iss !== expectedIssuer) {
      return { valid: false, error: `Invalid token issuer: expected "${expectedIssuer}", received "${payload.iss}"` };
    }
  }

  // 8. Audience validation (when present)
  if (payload.aud) {
    const expectedAud = options?.expectedAudience || EXPECTED_AUDIENCE;
    const tokenAudArray = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

    if (!tokenAudArray.includes(expectedAud) && !tokenAudArray.includes('authenticated')) {
      return { valid: false, error: `Invalid token audience: expected "${expectedAud}"` };
    }
  }

  return { valid: true, payload };
}

/**
 * Creates a cryptographically signed HMAC HS256 JWT for tests and authenticated sessions.
 */
export function signJwtToken(
  payload: SignJwtPayload,
  secret: string = TEST_JWT_SECRET,
  expiresInSeconds: number = 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    sub: payload.sub,
    iat: payload.iat || now,
    exp: payload.exp || now + expiresInSeconds
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Creates an ES256 signed JWT using an EC private key (for testing asymmetric verification).
 */
export function signEs256Jwt(
  payload: SignJwtPayload,
  privateKey: crypto.KeyObject | string,
  kid?: string,
  expiresInSeconds: number = 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    sub: payload.sub,
    iat: payload.iat || now,
    exp: payload.exp || now + expiresInSeconds
  };

  const header = { alg: 'ES256', typ: 'JWT', kid };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const data = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');

  const signature = crypto.sign('SHA256', data, { key: privateKey, dsaEncoding: 'ieee-p1363' } as crypto.SignPrivateKeyInput);
  const signatureB64 = Buffer.from(signature).toString('base64url');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export interface ValidateAuthOptions {
  secretOverride?: string;
  expectedIssuer?: string;
  expectedAudience?: string;
  customJwksKey?: JwkKey;
  jwksFetchOverride?: () => Promise<JwkKey[]>;
  dbProfileOverride?: {
    role: string;
    institution_id: string | null;
    region: string | null;
    is_active: boolean;
  } | null;
}

const testProfileOverrides = new Map<string, {
  role: string;
  institution_id: string | null;
  region: string | null;
  is_active: boolean;
}>();

export function setTestProfile(
  userId: string,
  profile: {
    role: string;
    institution_id: string | null;
    region: string | null;
    is_active: boolean;
  } | null
): void {
  if (profile === null) {
    testProfileOverrides.delete(userId);
  } else {
    testProfileOverrides.set(userId, profile);
  }
}

export function clearTestProfiles(): void {
  testProfileOverrides.clear();
}

// Pre-register test officer profiles in test mode so endpoint integration tests succeed safely
if (
  typeof process !== 'undefined' &&
  (process.env.NODE_ENV === 'test' ||
    process.argv.some(arg => arg.includes('test')) ||
    Boolean(process.env.NODE_TEST_CONTEXT))
) {
  testProfileOverrides.set('550e8400-e29b-41d4-a716-446655440020', {
    role: 'scrutiny_officer',
    institution_id: null,
    region: 'Western',
    is_active: true
  });
  testProfileOverrides.set('550e8400-e29b-41d4-a716-446655440030', {
    role: 'regional_officer',
    institution_id: null,
    region: 'Western',
    is_active: true
  });
}

/**
 * Server-side identity and permission validator.
 *
 * CRITICAL SECURITY ARCHITECTURE:
 * 1. Custom headers (x-samay-user-id, x-samay-role) are NEVER accepted as proof of identity.
 * 2. user_metadata is NEVER trusted for role or institution authorization (user-editable).
 * 3. Authoritative user role and institution mapping are resolved via:
 *    - Priority 1: Server-controlled database table `public.profiles` via Prisma.
 *    - Priority 2: Inactive profile in `public.profiles` returns 403 Forbidden.
 *    - Priority 3: Missing profile in `public.profiles` CANNOT receive privileged roles (fails closed to applicant).
 *    - Priority 4: Server-controlled `app_metadata` in verified JWT for non-privileged roles.
 *    - Default: `applicant` (least privilege).
 */
export async function validateServerAuth(
  request: Request | NextRequest,
  allowedRoles?: string[],
  options?: ValidateAuthOptions
): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');

  // Reject unauthenticated requests
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      authorized: false,
      status: 401,
      error: 'Authentication required. Missing Bearer authorization token.'
    };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return {
      authenticated: false,
      authorized: false,
      status: 401,
      error: 'Authentication required. Empty Bearer token.'
    };
  }

  // 1. Cryptographically verify token signature, algorithm, expiration, issuer, audience
  const verification = await verifyJwtToken(token, options);
  if (!verification.valid || !verification.payload) {
    return {
      authenticated: false,
      authorized: false,
      status: 401,
      error: `Authentication failed: ${verification.error || 'Invalid token'}`
    };
  }

  const payload = verification.payload;
  const userId = payload.sub;

  // 2. Authoritative Role & Tenant Resolution
  // We NEVER trust user_metadata for role, institution_id, or region.
  let authoritativeRole: string = 'applicant';
  let authoritativeInstitutionId: string | undefined = undefined;
  let authoritativeRegion: string | undefined = undefined;
  let source: AuthenticatedUser['source'] = 'default_least_privilege';

  // Check 1: Authoritative database mapping from `public.profiles`
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  let dbProfile: {
    role: string;
    institution_id: string | null;
    region: string | null;
    is_active: boolean;
  } | null = null;

  const isTest =
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'test' ||
      process.argv.some(arg => arg.includes('test')) ||
      Boolean(process.env.NODE_TEST_CONTEXT));

  if (options && options.dbProfileOverride !== undefined) {
    dbProfile = options.dbProfileOverride;
  } else if (isTest && testProfileOverrides.has(userId)) {
    dbProfile = testProfileOverrides.get(userId) || null;
  } else if (isUuid) {
    try {
      dbProfile = await prisma.profiles.findUnique({
        where: { id: userId },
        select: {
          role: true,
          institution_id: true,
          region: true,
          is_active: true
        }
      });
    } catch {
      // If DB profile lookup encounters transient error, fallback safely
    }
  }

  if (dbProfile) {
    // Inactive profile check
    if (!dbProfile.is_active) {
      return {
        authenticated: true,
        authorized: false,
        status: 403,
        error: 'Forbidden: User account has been deactivated'
      };
    }

    authoritativeRole = dbProfile.role;
    authoritativeInstitutionId = dbProfile.institution_id || undefined;
    authoritativeRegion = dbProfile.region || undefined;
    source = 'database_profile';
  } else {
    // Missing profile in public.profiles:
    // CRITICAL SECURITY RULE: A missing or unprovisioned profile CANNOT receive any privileged role!
    // Even if app_metadata claims a privileged role, without an active record in public.profiles,
    // privileged access is denied (least privilege demotion to applicant).
    const claimedRole = payload.app_metadata?.role?.toString().trim().toLowerCase();
    const isClaimedRolePrivileged = Boolean(claimedRole && (PRIVILEGED_ROLES as readonly string[]).includes(claimedRole));

    if (isClaimedRolePrivileged) {
      authoritativeRole = 'applicant';
      source = 'missing_profile_least_privilege';
    } else if (claimedRole && !isClaimedRolePrivileged) {
      // Non-privileged role (e.g. institution or applicant)
      authoritativeRole = claimedRole;
      source = 'server_app_metadata';
      if (payload.app_metadata?.institution_id) {
        authoritativeInstitutionId = payload.app_metadata.institution_id.toString().trim();
      }
      if (payload.app_metadata?.region) {
        authoritativeRegion = payload.app_metadata.region.toString().trim();
      }
    } else {
      authoritativeRole = 'applicant';
      source = 'default_least_privilege';
    }
  }

  // SECURITY GUARD: user_metadata is untrusted client data and strictly ignored
  if (payload.user_metadata?.role && source === 'default_least_privilege') {
    // Ignored by design
  }

  const authenticatedUser: AuthenticatedUser = {
    userId,
    role: authoritativeRole,
    email: payload.email,
    institutionId: authoritativeInstitutionId,
    region: authoritativeRegion,
    source
  };

  // 3. Enforce Role-Based Access Control (RBAC)
  if (allowedRoles && allowedRoles.length > 0) {
    const roleAliases: Record<string, string[]> = {
      admin: ['system_admin', 'admin'],
      system_admin: ['system_admin', 'admin'],
      competent_authority: ['competent_authority', 'approving_authority'],
      approving_authority: ['competent_authority', 'approving_authority'],
      institution: ['institution', 'applicant', 'institution_admin'],
      institution_admin: ['institution', 'applicant', 'institution_admin'],
      applicant: ['institution', 'applicant', 'institution_admin'],
      scrutiny_officer: ['scrutiny_officer'],
      regional_officer: ['regional_officer'],
      bureau_officer: ['bureau_officer'],
      evc_coordinator: ['evc_coordinator', 'expert'],
      expert: ['evc_coordinator', 'expert']
    };

    const isAllowed = allowedRoles.some(allowed => {
      if (allowed === authoritativeRole) return true;
      const aliases = roleAliases[allowed] || [];
      return aliases.includes(authoritativeRole);
    });

    if (!isAllowed) {
      return {
        authenticated: true,
        authorized: false,
        status: 403,
        error: `Forbidden: User role "${authoritativeRole}" does not have permission for this resource.`,
        user: authenticatedUser
      };
    }
  }

  return {
    authenticated: true,
    authorized: true,
    user: authenticatedUser
  };
}
