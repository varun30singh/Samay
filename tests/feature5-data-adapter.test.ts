import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CsvAdapter, MockAicteApiAdapter } from '../lib/dataAdapters';
import { evaluateDeadlineGuard, INITIAL_CALENDAR_CONFIG, DEFAULT_SIMULATED_DATE } from '../lib/seedData';
import { Application } from '../lib/types';

test('FEATURE 5: CSV Data Adapter - Valid Import & File Constraints', async () => {
  const adapter = new CsvAdapter();

  // Test File Constraints: Reject non-csv and files > 5MB
  const invalidExt = adapter.validateFileMeta('applications.xlsx', 1024);
  assert.equal(invalidExt.valid, false);
  assert.ok(invalidExt.error?.includes('Only official .csv files'));

  const oversized = adapter.validateFileMeta('applications.csv', 6 * 1024 * 1024);
  assert.equal(oversized.valid, false);
  assert.ok(oversized.error?.includes('exceeds 5 MB'));

  const validMeta = adapter.validateFileMeta('applications_batch_1.csv', 250 * 1024);
  assert.equal(validMeta.valid, true);

  // Valid CSV Applications content
  const validCsv = `applicationId,institutionName,aictePermanentId,region,approvedIntake,type,route
APP-TEST-001,"Symbiosis Institute of Technology",1-11223344,Western,360,Extension of Approval (EoA),Scrutiny + EVC
APP-TEST-002,"VJTI Mumbai",1-55667788,Western,720,Extension of Approval (EoA),Only Scrutiny`;

  const result = await adapter.importApplications(validCsv);
  assert.equal(result.success, true);
  assert.equal(result.totalRows, 2);
  assert.equal(result.validCount, 2);
  assert.equal(result.invalidCount, 0);
  assert.equal(result.validRecords[0].id, 'APP-TEST-001');
  assert.equal(result.validRecords[1].approvedIntake, 720);
});

test('FEATURE 5: CSV Data Adapter - Mixed Valid/Invalid Rows & Duplicate IDs', async () => {
  const adapter = new CsvAdapter();

  // Mixed CSV:
  // Row 2: Valid
  // Row 3: Missing intake
  // Row 4: Duplicate ID
  const mixedCsv = `applicationId,institutionName,aictePermanentId,region,approvedIntake
APP-DUP-001,"College Alpha",1-1001,Western,300
APP-BAD-002,"College Beta",1-1002,Western,invalid_intake
APP-DUP-001,"College Gamma",1-1003,Western,450`;

  const result = await adapter.importApplications(mixedCsv);
  assert.equal(result.success, false);
  assert.equal(result.totalRows, 3);
  assert.equal(result.validCount, 1);
  assert.equal(result.invalidCount, 2);

  // Check specific row errors
  const intakeErr = result.errors.find(e => e.rowNumber === 3)!;
  assert.ok(intakeErr, 'Row 3 must fail on invalid intake');
  assert.equal(intakeErr.field, 'approvedIntake');
  assert.ok(intakeErr.reason.includes('positive integer'));

  const dupErr = result.errors.find(e => e.rowNumber === 4)!;
  assert.ok(dupErr, 'Row 4 must fail on duplicate ID');
  assert.equal(dupErr.field, 'applicationId');
  assert.ok(dupErr.reason.includes('Duplicate Application ID'));
});

test('FEATURE 5: Data Incomplete Handling in Deadline Guard', () => {
  // Application with missing intake (0 intake)
  const incompleteApp: Application = {
    id: 'APP-INCOMPLETE-01',
    applicationNumber: 'APP-INCOMPLETE-01',
    institutionId: '1-999999',
    institutionName: 'Incomplete Data Engineering College',
    aictePermanentId: '1-999999',
    region: 'Western',
    state: 'Maharashtra',
    type: 'Extension of Approval (EoA)',
    route: 'Scrutiny + EVC',
    routeVersion: 'APH-2026.v1',
    currentStage: 'Scrutiny',
    submissionDate: '2026-01-15',
    approvedIntake: 0, // MISSING INTAKE!
    assignedOfficer: 'Dr. R. Sharma',
    supervisor: 'Dr. P. Joshi',
    lastUpdated: '2026-02-01',
    stageHistory: [],
    observations: [],
    undertakings: [],
    documents: [],
    riskStatus: 'On track',
    delayRiskScore: 0,
    latestSafeDateForCurrentStage: '',
    daysRemainingInStage: 0,
    daysToApprovalCutoff: 0,
    riskReasons: [],
    complianceHealthScore: 0
  };

  const dg = evaluateDeadlineGuard(incompleteApp, DEFAULT_SIMULATED_DATE, INITIAL_CALENDAR_CONFIG);
  assert.equal(dg.riskStatus, 'Data incomplete', 'Incomplete data must yield "Data incomplete" status instead of guessing');
  assert.equal(dg.isIncompleteData, true);
  assert.ok(dg.riskReasons.some(r => r.includes('Data incomplete')), 'Reasons must cite incomplete data');
});

test('FEATURE 5: MockAicteApiAdapter Stub Interface', async () => {
  const apiAdapter = new MockAicteApiAdapter();
  const res = await apiAdapter.importApplications();
  assert.equal(res.success, true);
  assert.equal(res.sourceType, 'AICTE_API_SYNC');
  assert.ok(res.validRecords.length > 0);

  const status = await apiAdapter.fetchLiveStatus('APP-2026-API-9901');
  assert.equal(status.appId, 'APP-2026-API-9901');
  assert.ok(status.syncRemarks.includes('AICTE National Gateway'));
});
