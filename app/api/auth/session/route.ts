import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signJwtToken, getJwtSecret, TEST_JWT_SECRET, DEFAULT_SUPABASE_URL, EXPECTED_AUDIENCE } from '@/lib/serverAuth';

const DEMO_USER_EMAILS: Record<string, string> = {
  'SAM-SCR-0101': 'r.sharma@aicte-india.org',
  'SAM-REG-0201': 'p.joshi@wro-aicte.gov.in',
  'SAM-BUR-0301': 'vk.sharma@aicte-india.org',
  'SAM-EVC-0401': 'evc.coord@aicte-india.org',
  'SAM-CAU-0501': 'chairman@aicte-india.org',
  'SAM-ADM-0001': 'admin.samay@aicte-india.org',
  'INST-100234': 'registrar@spit.ac.in'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, email } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    let dbProfile: {
      id: string;
      role: string;
      institution_id: string | null;
      region: string | null;
      is_active: boolean;
      email: string | null;
      full_name: string;
    } | null = null;

    if (isUuid) {
      dbProfile = await prisma.profiles.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          institution_id: true,
          region: true,
          is_active: true,
          email: true,
          full_name: true
        }
      });
    }

    // Try finding by email if not found by UUID
    if (!dbProfile) {
      const targetEmail = email || (userId.includes('@') ? userId : DEMO_USER_EMAILS[userId.toUpperCase()]);
      if (targetEmail) {
        dbProfile = await prisma.profiles.findFirst({
          where: { email: targetEmail.toLowerCase() },
          select: {
            id: true,
            role: true,
            institution_id: true,
            region: true,
            is_active: true,
            email: true,
            full_name: true
          }
        });
      }
    }

    if (dbProfile && !dbProfile.is_active) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: User account has been deactivated' },
        { status: 403 }
      );
    }

    const resolvedRole = dbProfile?.role || (role ? String(role).toLowerCase() : 'applicant');
    const resolvedInstitutionId = dbProfile?.institution_id || undefined;
    const resolvedRegion = dbProfile?.region || (resolvedRole === 'regional_officer' ? 'Western' : undefined);

    const secret = getJwtSecret() || TEST_JWT_SECRET;
    const effectiveUserId = dbProfile?.id || userId;
    const effectiveEmail = dbProfile?.email || email || `${userId.toLowerCase()}@aicte-india.org`;

    const token = signJwtToken(
      {
        sub: effectiveUserId,
        email: effectiveEmail,
        iss: `${process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL}/auth/v1`,
        aud: EXPECTED_AUDIENCE,
        app_metadata: {
          role: resolvedRole,
          institution_id: resolvedInstitutionId,
          region: resolvedRegion
        }
      },
      secret,
      86400 // 24 hours
    );

    return NextResponse.json({
      success: true,
      token,
      user: {
        userId: effectiveUserId,
        role: resolvedRole,
        roleLabel: dbProfile?.full_name || (role ? String(role) : resolvedRole),
        email: effectiveEmail,
        institutionId: resolvedInstitutionId,
        region: resolvedRegion
      }
    });
  } catch (err) {
    console.error('[API auth/session error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to create authenticated session' }, { status: 500 });
  }
}
