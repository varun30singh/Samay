import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function GET(request: NextRequest) {
  // 1. Enforce cryptographic server-side authentication
  const auth = await validateServerAuth(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      {
        success: false,
        error: auth.error || 'Authentication required'
      },
      { status: auth.status || 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    // 2. Validate and bound pagination parameters
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '10', 10);

    const page = Number.isSafeInteger(pageParam) && pageParam > 0 && pageParam <= 10000 ? pageParam : 1;
    const limit = Number.isSafeInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
    const skip = (page - 1) * limit;

    // 3. Sanitize query inputs to prevent injection and resource exhaustion
    const rawSearch = searchParams.get('search')?.trim();
    const search = rawSearch ? rawSearch.slice(0, 100).replace(/[^\w\s-]/g, '') : undefined;

    const rawRegion = searchParams.get('region')?.trim();
    const region = rawRegion && rawRegion !== 'All' ? rawRegion.slice(0, 50) : undefined;

    // 4. Construct where filter safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (region) {
      where.region = region;
    }

    if (search) {
      where.OR = [
        { legal_name: { contains: search, mode: 'insensitive' } },
        { institution_code: { contains: search, mode: 'insensitive' } },
        { display_name: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 5. Enforce strict tenant isolation based on authenticated role
    const userRole = auth.user.role;
    if (userRole === 'applicant' || userRole === 'institution' || userRole === 'institution_admin') {
      // Must be locked to their own institution
      if (!isUuid(auth.user.institutionId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: Institution user account is not linked to a valid institution record'
          },
          { status: 403 }
        );
      }
      where.id = auth.user.institutionId;
    } else if (userRole === 'regional_officer') {
      // Regional officer jurisdiction boundary - fail closed if unassigned
      if (!auth.user.region) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: Regional officer account is not assigned to a valid regional jurisdiction'
          },
          { status: 403 }
        );
      }
      where.region = auth.user.region;
    }

    // 6. Execute bounded, explicit query via Prisma
    const [total, records] = await Promise.all([
      prisma.institutions.count({ where }),
      prisma.institutions.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          legal_name: 'asc'
        },
        select: {
          id: true,
          institution_code: true,
          legal_name: true,
          display_name: true,
          category: true,
          institution_type: true,
          state: true,
          district: true,
          region: true,
          contact_email: true,
          contact_phone: true,
          established_year: true,
          is_active: true,
          created_at: true
        }
      })
    ]);

    return NextResponse.json(
      {
        success: true,
        data: records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      { status: 200 }
    );
  } catch (error) {
    // Log details server-side only; never leak Prisma internals or SQL to client
    console.error('[API institutions error]:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve institutions'
      },
      { status: 500 }
    );
  }
}
