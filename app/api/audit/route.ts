import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  const auth = await validateServerAuth(request, [
    'scrutiny_officer',
    'regional_officer',
    'bureau_officer',
    'evc_coordinator',
    'competent_authority',
    'approving_authority',
    'admin',
    'system_admin'
  ]);

  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized to view regulatory audit ledger' },
      { status: auth.status || 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = entityId;

    const entries = await prisma.audit_ledger.findMany({
      where,
      orderBy: { block_index: 'desc' },
      take: 100,
      include: {
        profiles: { select: { id: true, full_name: true, role: true } }
      }
    });

    const serialized = entries.map(e => ({
      ...e,
      block_index: e.block_index.toString()
    }));

    return NextResponse.json({ success: true, data: serialized }, { status: 200 });
  } catch (err) {
    console.error('[API audit GET error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to retrieve audit ledger' }, { status: 500 });
  }
}
