import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Strict allowlist of settings safe for public statutory display
const PUBLIC_STATUTORY_KEYS = [
  'statutory_deadline',
  'calendar_policy',
  'timezone',
  'human_decision_required'
] as const;

export async function GET() {
  try {
    const rawSettings = await prisma.system_settings.findMany({
      where: {
        setting_key: {
          in: [...PUBLIC_STATUTORY_KEYS]
        }
      },
      select: {
        setting_key: true,
        setting_value: true
      },
      orderBy: {
        setting_key: 'asc'
      }
    });

    const settingsMap: Record<string, unknown> = {};
    for (const item of rawSettings) {
      settingsMap[item.setting_key] = item.setting_value;
    }

    return NextResponse.json(
      {
        success: true,
        settings: settingsMap,
        source: 'Supabase PostgreSQL'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API system-settings error]:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve system settings'
      },
      { status: 500 }
    );
  }
}
