import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_DEFICIENCIES,
  evaluateDeficiencyReminders
} from '../lib/deficiencyTracker';
import { generateSeedApplications, evaluateDeadlineGuard, INITIAL_CALENDAR_CONFIG, DEFAULT_SIMULATED_DATE } from '../lib/seedData';
import { DeficiencyRecord } from '../lib/types';

test('FEATURE 4: Deficiency Closure Tracker - Status Transitions & Milestones', () => {
  // Verify initial deficiencies exist with proper status flow
  assert.ok(INITIAL_DEFICIENCIES.length >= 4, 'Must have seeded physical/scrutiny deficiencies');

  const openDef = INITIAL_DEFICIENCIES.find(d => d.status === 'Open')!;
  assert.ok(openDef, 'Open deficiency must exist');
  assert.ok(openDef.timeline.length > 0, 'Must have initial timeline entry');

  const hearingDef = INITIAL_DEFICIENCIES.find(d => d.status === 'Sent to hearing')!;
  assert.ok(hearingDef, 'Sent to hearing deficiency must exist');
  assert.ok(hearingDef.hearingDate, 'Must have recorded hearing date');

  const closedDef = INITIAL_DEFICIENCIES.find(d => d.status === 'Closed')!;
  assert.ok(closedDef, 'Closed deficiency must exist');
});

test('FEATURE 4: Deficiency Reminders & Overdue Escalations', () => {
  const testDef: DeficiencyRecord = {
    id: 'DEF-TEST-001',
    applicationId: 'APP-2026-W-1001',
    institutionName: 'Shivaji Institute',
    region: 'Western',
    description: 'Cadre ratio shortfall',
    severity: 'major',
    dueDate: '2026-03-31',
    evidenceRequired: 'Recruitment minutes',
    status: 'Open',
    daysOpen: 10,
    escalationLevel: 0,
    timeline: []
  };

  // Exactly 30 days before: 2026-03-01
  const r30 = evaluateDeficiencyReminders([testDef], '2026-03-01T00:00:00');
  assert.equal(r30[0].actionRequired, 'REMINDER_30');

  // Exactly 7 days before: 2026-03-24
  const r7 = evaluateDeficiencyReminders([testDef], '2026-03-24T00:00:00');
  assert.equal(r7[0].actionRequired, 'REMINDER_7');

  // On Due Date: 2026-03-31
  const rDue = evaluateDeficiencyReminders([testDef], '2026-03-31T00:00:00');
  assert.equal(rDue[0].actionRequired, 'REMINDER_DUE');

  // 3 Days Overdue: 2026-04-03
  const rOverdue3 = evaluateDeficiencyReminders([testDef], '2026-04-03T00:00:00');
  assert.equal(rOverdue3[0].actionRequired, 'ESCALATE_3');
  assert.equal(rOverdue3[0].isOverdue, true);

  // 14 Days Overdue: 2026-04-14
  const rOverdue14 = evaluateDeficiencyReminders([testDef], '2026-04-14T00:00:00');
  assert.equal(rOverdue14[0].actionRequired, 'ESCALATE_14');
  assert.equal(rOverdue14[0].isOverdue, true);
});

test('FEATURE 4: Integration with Deadline Guard', () => {
  const seedApps = generateSeedApplications(DEFAULT_SIMULATED_DATE);
  const shivajiApp = seedApps.find(a => a.id === 'APP-2026-W-1001')!;

  const dg = evaluateDeadlineGuard(shivajiApp, DEFAULT_SIMULATED_DATE, INITIAL_CALENDAR_CONFIG);

  // Shivaji has open deficiencies in INITIAL_DEFICIENCIES
  const hasDeficiencyReason = dg.riskReasons.some(r => r.includes('Unresolved deficiency'));
  assert.ok(hasDeficiencyReason, 'Deadline Guard must flag unresolved deficiencies as a statutory risk reason');
  assert.ok(dg.riskStatus === 'Tight' || dg.riskStatus === 'Will miss at current pace');
});
