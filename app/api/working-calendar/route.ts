import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [policySetting, activeCalendar, holidaysList] = await Promise.all([
      prisma.system_settings.findUnique({
        where: { setting_key: 'calendar_policy' }
      }),
      prisma.working_calendars.findFirst({
        where: { is_active: true },
        orderBy: { created_at: 'desc' }
      }),
      prisma.holidays.findMany({
        orderBy: { holiday_date: 'asc' },
        select: {
          id: true,
          holiday_date: true,
          name: true,
          holiday_type: true,
          region: true,
          is_gazetted: true
        }
      })
    ]);

    const policy = (policySetting?.setting_value as Record<string, boolean>) || {
      exclude_sundays: true,
      exclude_second_saturday: true,
      exclude_fourth_saturday: true
    };

    return NextResponse.json(
      {
        success: true,
        calendar: {
          calendarName: activeCalendar?.calendar_name || 'AICTE Sovereign Working-Days Calendar 2026',
          academicYear: activeCalendar?.academic_year || '2026-2027',
          excludeSundays: activeCalendar?.exclude_sundays ?? policy.exclude_sundays ?? true,
          excludeSecondSaturday: activeCalendar?.exclude_second_saturday ?? policy.exclude_second_saturday ?? true,
          excludeFourthSaturday: activeCalendar?.exclude_fourth_saturday ?? policy.exclude_fourth_saturday ?? true,
          statutoryDeadline: activeCalendar?.deadline_date
            ? activeCalendar.deadline_date.toISOString().split('T')[0]
            : '2026-04-30'
        },
        holidays: holidaysList,
        source: 'Supabase PostgreSQL'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API working-calendar error]:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve working calendar'
      },
      { status: 500 }
    );
  }
}
