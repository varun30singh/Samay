import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_OFFICER_LEAVES,
  isOfficerOnLeave,
  getDelegateForOfficer,
  applyDelegationToApplications,
  computeQueueCoverage,
  REGIONAL_OFFICER_REGISTRY
} from '../lib/officerDelegation';
import { generateSeedApplications, DEFAULT_SIMULATED_DATE } from '../lib/seedData';
import { OfficerLeaveRecord } from '../lib/types';

test('FEATURE 3: Officer Delegation and Leave Routing', () => {
  // S. N. Patil is on leave from 2026-02-25 to 2026-03-10
  // On 2026-03-01 (DEFAULT_SIMULATED_DATE), S. N. Patil should be actively on leave
  const patilStatus = isOfficerOnLeave('S. N. Patil (RO Mumbai)', DEFAULT_SIMULATED_DATE, INITIAL_OFFICER_LEAVES);
  assert.equal(patilStatus.onLeave, true, 'Patil must be detected on leave during leave period');
  assert.equal(patilStatus.leaveRecord?.delegateName, 'R. K. Shinde (RO Pune)');

  // Delegate for Patil should be R. K. Shinde
  const delegate = getDelegateForOfficer('S. N. Patil (RO Mumbai)', DEFAULT_SIMULATED_DATE, INITIAL_OFFICER_LEAVES);
  assert.equal(delegate, 'R. K. Shinde (RO Pune)');

  // Officer not on leave
  const sharmaStatus = isOfficerOnLeave('Dr. R. Sharma (AICTE RO)', DEFAULT_SIMULATED_DATE, INITIAL_OFFICER_LEAVES);
  assert.equal(sharmaStatus.onLeave, false, 'Sharma should be available');
  assert.equal(getDelegateForOfficer('Dr. R. Sharma (AICTE RO)', DEFAULT_SIMULATED_DATE, INITIAL_OFFICER_LEAVES), null);

  // Apply delegation to applications: items originally assigned to Patil should now show R. K. Shinde with delegation tags
  const seedApps = generateSeedApplications(DEFAULT_SIMULATED_DATE);
  const delegatedApps = applyDelegationToApplications(seedApps, DEFAULT_SIMULATED_DATE, INITIAL_OFFICER_LEAVES);

  const shivajiApp = delegatedApps.find(a => a.id === 'APP-2026-W-1001')!;
  assert.equal(shivajiApp.assignedOfficer, 'R. K. Shinde (RO Pune)', 'Queue item must be reassigned to delegate');
  assert.equal(shivajiApp.isDelegated, true, 'Must bear delegation flag');
  assert.equal(shivajiApp.delegatedFrom, 'S. N. Patil (RO Mumbai)', 'Must preserve original assigning officer identity');
});

test('FEATURE 3: Automatic Return When Leave Ends', () => {
  // Check date after leave has ended: 2026-03-20
  const afterLeaveDate = '2026-03-20T10:00:00';
  const patilAfter = isOfficerOnLeave('S. N. Patil (RO Mumbai)', afterLeaveDate, INITIAL_OFFICER_LEAVES);
  assert.equal(patilAfter.onLeave, false, 'Leave must automatically expire once end date passes');

  const seedApps = generateSeedApplications(afterLeaveDate);
  const appsAfterLeave = applyDelegationToApplications(seedApps, afterLeaveDate, INITIAL_OFFICER_LEAVES);
  const shivajiAppAfter = appsAfterLeave.find(a => a.id === 'APP-2026-W-1001')!;
  
  assert.equal(shivajiAppAfter.assignedOfficer, 'S. N. Patil (RO Mumbai)', 'Queue item must automatically return to original officer');
  assert.equal(shivajiAppAfter.isDelegated, undefined, 'Delegation flag removed on return');
});

test('FEATURE 3: Coverage Panel Integrity - Detects Uncovered Queues', () => {
  // Test scenario with an uncovered leave (no delegate assigned)
  const uncoveredLeave: OfficerLeaveRecord = {
    id: 'LEAVE-UNCOVERED',
    officerName: 'Deepak Chouhan (RO Bhopal)',
    officerRole: 'regional_officer',
    region: 'Central',
    startDate: '2026-02-28',
    endDate: '2026-03-15',
    reason: 'Emergency hospital leave',
    delegateName: '', // NO DELEGATE!
    status: 'ACTIVE',
    createdAt: '2026-02-28T09:00:00Z'
  };

  const seedApps = generateSeedApplications(DEFAULT_SIMULATED_DATE);
  const coverage = computeQueueCoverage(REGIONAL_OFFICER_REGISTRY, seedApps, [...INITIAL_OFFICER_LEAVES, uncoveredLeave], DEFAULT_SIMULATED_DATE);

  const bhopalCoverage = coverage.find(c => c.officerName === 'Deepak Chouhan (RO Bhopal)')!;
  assert.ok(bhopalCoverage);
  assert.equal(bhopalCoverage.isOnLeave, true);
  assert.equal(bhopalCoverage.hasUncoveredQueue, true, 'Must flag uncovered queue in high-contrast warning');

  const patilCoverage = coverage.find(c => c.officerName === 'S. N. Patil (RO Mumbai)')!;
  assert.equal(patilCoverage.isOnLeave, true);
  assert.equal(patilCoverage.hasUncoveredQueue, false, 'Covered queue must not be flagged');
});
