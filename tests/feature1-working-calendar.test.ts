import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WORKING_CALENDAR,
  isWorkingDay,
  addWorkingDays,
  subtractWorkingDays,
  getWorkingDaysDiff,
  isSecondOrFourthSaturday
} from '../lib/workingCalendar';

test('FEATURE 1: Working-Days Calendar - Holiday and Weekend Detection', () => {
  // Sunday detection (2026-03-01 is a Sunday)
  const sunday = new Date('2026-03-01T00:00:00');
  assert.equal(sunday.getDay(), 0);
  assert.equal(isWorkingDay(sunday, DEFAULT_WORKING_CALENDAR), false, 'Sunday should not be a working day');

  // Gazetted holiday detection: Holi on 2026-03-03 (Tuesday)
  const holi = new Date('2026-03-03T00:00:00');
  assert.equal(isWorkingDay(holi, DEFAULT_WORKING_CALENDAR), false, 'Holi (2026-03-03) should not be a working day');

  // Normal working day: 2026-03-02 (Monday)
  const monday = new Date('2026-03-02T00:00:00');
  assert.equal(isWorkingDay(monday, DEFAULT_WORKING_CALENDAR), true, 'Monday 2026-03-02 should be a working day');

  // 2nd Saturday detection: 2026-03-14 (14th is 2nd Saturday: Math.floor((14-1)/7) === 1)
  const secondSat = new Date('2026-03-14T00:00:00');
  assert.equal(secondSat.getDay(), 6);
  assert.equal(isSecondOrFourthSaturday(secondSat), true);
  assert.equal(isWorkingDay(secondSat, DEFAULT_WORKING_CALENDAR), false, '2nd Saturday should be an off day');

  // 1st Saturday is working day if only 2nd/4th off: 2026-03-07
  const firstSat = new Date('2026-03-07T00:00:00');
  assert.equal(firstSat.getDay(), 6);
  assert.equal(isSecondOrFourthSaturday(firstSat), false);
  assert.equal(isWorkingDay(firstSat, DEFAULT_WORKING_CALENDAR), true, '1st Saturday should be a working day');
});

test('FEATURE 1: Stage spanning weekend and holiday computes correct working days due date', () => {
  // Starting on Friday 2026-02-27. Add 5 working days:
  // - Day 1: Saturday 2026-02-28 (Working 4th Sat? Feb 28: (28-1)/7 = 3 -> 4th Sat! So off!)
  //   Wait: Feb 28 is 4th Sat, so off.
  // - Sunday 2026-03-01: off
  // - Day 1: Monday 2026-03-02: Working Day #1
  // - Tuesday 2026-03-03: Holi (Holiday!) -> skipped!
  // - Day 2: Wednesday 2026-03-04: Working Day #2
  // - Day 3: Thursday 2026-03-05: Working Day #3
  // - Day 4: Friday 2026-03-06: Working Day #4
  // - Day 5: Saturday 2026-03-07 (1st Sat): Working Day #5
  // Result should be 2026-03-07!
  const dueDate = addWorkingDays('2026-02-27', 5, DEFAULT_WORKING_CALENDAR);
  assert.equal(dueDate, '2026-03-07', 'Stage spanning weekend + Holi computes correct due date');

  // Test subtractWorkingDays: subtracting 5 working days from 2026-03-07 should yield 2026-02-27
  const safeDate = subtractWorkingDays('2026-03-07', 5, DEFAULT_WORKING_CALENDAR);
  assert.equal(safeDate, '2026-02-27', 'Backward working days calculation matches forward progression');

  // Test getWorkingDaysDiff
  const diff = getWorkingDaysDiff('2026-02-27', '2026-03-07', DEFAULT_WORKING_CALENDAR);
  assert.equal(diff, 5, 'Working days difference strictly excludes weekend and holiday');
});
