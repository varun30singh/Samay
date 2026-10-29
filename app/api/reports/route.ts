import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  const auth = await validateServerAuth(request, [
    'scrutiny_officer',
    'regional_officer',
    'bureau_officer',
    'competent_authority',
    'approving_authority',
    'admin',
    'system_admin'
  ]);

  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized to access regulatory reports' },
      { status: auth.status || 403 }
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereApp: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereInst: Record<string, any> = {};

    if (auth.user.role === 'regional_officer') {
      if (!auth.user.region) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Regional officer account has no assigned jurisdiction' },
          { status: 403 }
        );
      }
      whereApp.institutions = { region: auth.user.region };
      whereInst.region = auth.user.region;
    }

    const [
      totalApps,
      totalInsts,
      stageCountsRaw,
      pendingDeficiencies,
      scheduledEvcs,
      expiringDocs
    ] = await Promise.all([
      prisma.applications.count({ where: whereApp }),
      prisma.institutions.count({ where: whereInst }),
      prisma.applications.groupBy({
        by: ['stage'],
        where: whereApp,
        _count: { id: true }
      }),
      prisma.deficiencies.count({
        where: {
          status: 'open',
          ...(auth.user.role === 'regional_officer' && auth.user.region
            ? { institutions: { region: auth.user.region } }
            : {})
        }
      }),
      prisma.evc_visits.count({
        where: {
          status: 'scheduled',
          ...(auth.user.role === 'regional_officer' && auth.user.region
            ? { institutions: { region: auth.user.region } }
            : {})
        }
      }),
      prisma.documents.count({
        where: {
          expires_on: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          },
          ...(auth.user.role === 'regional_officer' && auth.user.region
            ? { institutions: { region: auth.user.region } }
            : {})
        }
      })
    ]);

    const stageBreakdown: Record<string, number> = {};
    for (const item of stageCountsRaw) {
      stageBreakdown[item.stage] = item._count.id;
    }

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalApplications: totalApps,
          totalInstitutions: totalInsts,
          stageBreakdown,
          pendingDeficiencies,
          scheduledEvcs,
          expiringDocuments30Days: expiringDocs,
          jurisdiction: auth.user.role === 'regional_officer' ? auth.user.region : 'National'
        },
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[API reports GET error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to generate regulatory report' }, { status: 500 });
  }
}
