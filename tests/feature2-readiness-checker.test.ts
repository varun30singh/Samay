import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runReadinessCheck } from '../lib/readinessChecker';
import { generateSeedApplications, INITIAL_CALENDAR_CONFIG, DEFAULT_SIMULATED_DATE } from '../lib/seedData';
import { Application } from '../lib/types';

test('FEATURE 2: Pre-Submission Readiness Checker - Rule Evaluation & Fix Guidance', () => {
  const seedApps = generateSeedApplications(DEFAULT_SIMULATED_DATE);
  
  // Shivaji Institute: has lease expiring 2026-05-15 (near cutoff)
  const shivajiApp = seedApps.find(a => a.id === 'APP-2026-W-1001')!;
  assert.ok(shivajiApp, 'Shivaji Institute must exist');

  const report = runReadinessCheck(shivajiApp, INITIAL_CALENDAR_CONFIG);

  assert.equal(report.applicationId, 'APP-2026-W-1001');
  assert.equal(report.totalChecks, 6);
  assert.ok(report.items.length === 6, 'All 6 configured checks must run');
  assert.ok(report.advisoryNote.includes('Advisory only'), 'Must clearly display statutory advisory note');

  // Verify each rule is present
  const docRule = report.items.find(i => i.category === 'DOCUMENTS')!;
  const leaseRule = report.items.find(i => i.category === 'LEASE')!;
  const intakeRule = report.items.find(i => i.category === 'INTAKE')!;
  const contactRule = report.items.find(i => i.category === 'CONTACT')!;
  const queriesRule = report.items.find(i => i.category === 'QUERIES')!;
  const expiryRule = report.items.find(i => i.category === 'EXPIRY')!;

  assert.ok(docRule, 'Documents rule must exist');
  assert.ok(leaseRule, 'Lease rule must exist');
  assert.ok(intakeRule, 'Intake rule must exist');
  assert.ok(contactRule, 'Contact rule must exist');
  assert.ok(queriesRule, 'Queries rule must exist');
  assert.ok(expiryRule, 'Expiry rule must exist');

  // Shivaji intake is 1420 -> INTAKE should PASS
  assert.equal(intakeRule.status, 'PASS');

  // Test failure on zero intake
  const zeroIntakeApp: Application = {
    ...shivajiApp,
    approvedIntake: 0
  };
  const zeroReport = runReadinessCheck(zeroIntakeApp, INITIAL_CALENDAR_CONFIG);
  const zeroIntakeCheck = zeroReport.items.find(i => i.category === 'INTAKE')!;
  assert.equal(zeroIntakeCheck.status, 'FAIL', 'Zero intake must fail readiness check');
  assert.ok(zeroIntakeCheck.plainLanguageFix.includes('Specify the approved intake'), 'Must provide plain-language guidance');
  assert.equal(zeroIntakeCheck.actionType, 'FILL_INTAKE');

  // Test failure on missing lease document
  const noLeaseApp: Application = {
    ...shivajiApp,
    documents: shivajiApp.documents.filter(d => d.type !== 'Land Lease Deed')
  };
  const noLeaseReport = runReadinessCheck(noLeaseApp, INITIAL_CALENDAR_CONFIG);
  const noLeaseCheck = noLeaseReport.items.find(i => i.category === 'LEASE')!;
  assert.equal(noLeaseCheck.status, 'FAIL', 'Missing lease document must fail');
  assert.equal(noLeaseCheck.actionType, 'UPLOAD_LEASE');
});
