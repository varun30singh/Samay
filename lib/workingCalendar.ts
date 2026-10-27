/**
 * SAMAY - Working-Days Calendar Engine (Feature 1)
 * Statutory AICTE Working Days calculator adhering to APH regulatory rules.
 * Correctly accounts for Sundays, optional 2nd/4th Saturdays, and national/gazetted holidays.
 */

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface WorkingCalendarConfig {
  version: string;
  academicYear: string;
  weeklyOffSunday: boolean;
  weeklyOffSecondFourthSaturday: boolean;
  weeklyOffAllSaturdays: boolean;
  holidays: Holiday[];
  lastUpdated: string;
  updatedBy: string;
}

export const DEFAULT_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-03', name: 'Holi' },
  { date: '2026-03-21', name: 'Id-ul-Fitr' },
  { date: '2026-03-31', name: 'Mahavir Jayanti' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-14', name: 'Dr. B. R. Ambedkar Jayanti' },
  { date: '2026-05-01', name: 'Maharashtra Day / Labour Day' },
  { date: '2026-05-27', name: 'Bakrid / Eid al-Adha' },
  { date: '2026-08-15', name: 'Independence Day' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti' },
  { date: '2026-10-20', name: 'Dussehra / Vijayadashami' },
  { date: '2026-11-08', name: 'Diwali (Deepavali)' },
  { date: '2026-12-25', name: 'Christmas Day' }
];

export const DEFAULT_WORKING_CALENDAR: WorkingCalendarConfig = {
  version: 'APH-WC-2026.v1.0',
  academicYear: '2026-2027',
  weeklyOffSunday: true,
  weeklyOffSecondFourthSaturday: true,
  weeklyOffAllSaturdays: false,
  holidays: DEFAULT_HOLIDAYS_2026,
  lastUpdated: '2026-01-15T10:00:00Z',
  updatedBy: 'Dr. V. K. Sharma (Regulation Bureau Head)'
};

/**
 * Checks whether a given calendar date is an off-Saturday (2nd or 4th Saturday of the month)
 */
export function isSecondOrFourthSaturday(d: Date): boolean {
  if (d.getDay() !== 6) return false;
  const dayOfMonth = d.getDate();
  const weekIndex = Math.floor((dayOfMonth - 1) / 7); // 0=1st, 1=2nd, 2=3rd, 3=4th, 4=5th
  return weekIndex === 1 || weekIndex === 3;
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a specific date is a valid working day under the configured working calendar.
 */
export function isWorkingDay(dateInput: string | Date, config: WorkingCalendarConfig = DEFAULT_WORKING_CALENDAR): boolean {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput.getTime());
  const isoStr = formatDateISO(d);

  // 1. Check gazetted holidays
  const isHoliday = config.holidays.some(h => h.date === isoStr);
  if (isHoliday) return false;

  const dayOfWeek = d.getDay();

  // 2. Check Sundays
  if (config.weeklyOffSunday && dayOfWeek === 0) return false;

  // 3. Check All Saturdays
  if (config.weeklyOffAllSaturdays && dayOfWeek === 6) return false;

  // 4. Check 2nd and 4th Saturdays
  if (config.weeklyOffSecondFourthSaturday && isSecondOrFourthSaturday(d)) return false;

  return true;
}

/**
 * Adds a given number of statutory working days to a starting date, skipping weekends & holidays.
 */
export function addWorkingDays(
  startDateInput: string | Date,
  workingDaysToAdd: number,
  config: WorkingCalendarConfig = DEFAULT_WORKING_CALENDAR
): string {
  if (workingDaysToAdd <= 0) {
    const start = typeof startDateInput === 'string' ? new Date(startDateInput) : startDateInput;
    return formatDateISO(start);
  }

  const d = typeof startDateInput === 'string' ? new Date(startDateInput) : new Date(startDateInput.getTime());
  let added = 0;

  while (added < workingDaysToAdd) {
    d.setDate(d.getDate() + 1);
    if (isWorkingDay(d, config)) {
      added++;
    }
  }

  return formatDateISO(d);
}

/**
 * Subtracts a given number of statutory working days from a reference date (used for Latest Safe Date).
 */
export function subtractWorkingDays(
  referenceDateInput: string | Date,
  workingDaysToSubtract: number,
  config: WorkingCalendarConfig = DEFAULT_WORKING_CALENDAR
): string {
  if (workingDaysToSubtract <= 0) {
    const ref = typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : referenceDateInput;
    return formatDateISO(ref);
  }

  const d = typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : new Date(referenceDateInput.getTime());
  let subtracted = 0;

  while (subtracted < workingDaysToSubtract) {
    d.setDate(d.getDate() - 1);
    if (isWorkingDay(d, config)) {
      subtracted++;
    }
  }

  return formatDateISO(d);
}

/**
 * Calculates the number of working days between two dates (exclusive of start, inclusive of end if working day).
 * Positive if endDate > startDate, negative if endDate < startDate.
 */
export function getWorkingDaysDiff(
  startDateInput: string | Date,
  endDateInput: string | Date,
  config: WorkingCalendarConfig = DEFAULT_WORKING_CALENDAR
): number {
  const start = typeof startDateInput === 'string' ? new Date(startDateInput) : new Date(startDateInput.getTime());
  const end = typeof endDateInput === 'string' ? new Date(endDateInput) : new Date(endDateInput.getTime());

  // Normalize time to midnight
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start.getTime() === end.getTime()) {
    return 0;
  }

  const isForward = end.getTime() > start.getTime();
  const cur = new Date(start.getTime());
  let count = 0;

  if (isForward) {
    while (cur.getTime() < end.getTime()) {
      cur.setDate(cur.getDate() + 1);
      if (isWorkingDay(cur, config)) {
        count++;
      }
    }
    return count;
  } else {
    while (cur.getTime() > end.getTime()) {
      cur.setDate(cur.getDate() - 1);
      if (isWorkingDay(cur, config)) {
        count++;
      }
    }
    return -count;
  }
}
