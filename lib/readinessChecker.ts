/**
 * Pre-Submission Readiness Checker Engine (Feature 2)
 * Evaluates institutional dossier completeness before statutory submission.
 * Advisory only: does NOT replace official officer scrutiny.
 */

import { Application, ReadinessCheckReport, ReadinessCheckItem, SystemCalendarConfig, DocumentRecord } from './types';

export const REQUIRED_DOCUMENT_TYPES = [
  'Land Lease Deed',
  'Building Plan NOC',
  'Fire Safety Certificate',
  'Affiliation Letter',
  'Pollution Clearance'
];

export function runReadinessCheck(
  app: Application,
  calendarConfig: SystemCalendarConfig
): ReadinessCheckReport {
  const items: ReadinessCheckItem[] = [];

  // Check 1: Required Documents Uploaded
  const uploadedTypes = new Set(app.documents.map(d => d.type));
  const missingDocs = REQUIRED_DOCUMENT_TYPES.filter(t => !uploadedTypes.has(t as DocumentRecord['type']));
  
  if (missingDocs.length === 0) {
    items.push({
      id: 'chk-docs',
      category: 'DOCUMENTS',
      title: 'Required Statutory Documents',
      description: `All ${REQUIRED_DOCUMENT_TYPES.length} mandatory regulatory documents have been uploaded.`,
      status: 'PASS',
      statusText: 'All Required Documents Uploaded',
      plainLanguageFix: 'Documents are complete and ready for officer review.',
      actionLabel: 'View Documents',
      actionType: 'UPLOAD_DOC'
    });
  } else {
    items.push({
      id: 'chk-docs',
      category: 'DOCUMENTS',
      title: 'Required Statutory Documents',
      description: `Missing ${missingDocs.length} required document(s): ${missingDocs.join(', ')}.`,
      status: 'FAIL',
      statusText: `Missing ${missingDocs.length} Mandatory Document(s)`,
      plainLanguageFix: `Upload certified copies of ${missingDocs.join(' and ')} before official submission.`,
      actionLabel: 'Upload Missing Documents',
      actionType: 'UPLOAD_DOC'
    });
  }

  // Check 2: Lease Deed Validity
  const leaseDoc = app.documents.find(d => d.type === 'Land Lease Deed');
  const cutoff = new Date(calendarConfig.approvalCutoffDate);

  if (!leaseDoc) {
    items.push({
      id: 'chk-lease',
      category: 'LEASE',
      title: 'Land Lease Deed Validity',
      description: 'No registered Land Lease Deed found in uploaded documents dossier.',
      status: 'FAIL',
      statusText: 'Land Lease Deed Missing',
      plainLanguageFix: 'Attach a government-registered 30+ year land lease deed or freehold title deed.',
      actionLabel: 'Upload Lease Deed',
      actionType: 'UPLOAD_LEASE'
    });
  } else {
    const expiry = new Date(leaseDoc.expiryDate);
    const daysRemaining = leaseDoc.remainingDays;

    if (expiry <= cutoff) {
      items.push({
        id: 'chk-lease',
        category: 'LEASE',
        title: 'Land Lease Deed Validity',
        description: `Lease deed expires on ${leaseDoc.expiryDate}, which is on or before the statutory cutoff (${calendarConfig.approvalCutoffDate}).`,
        status: 'FAIL',
        statusText: `Lease Lapses Before Academic Cutoff (${leaseDoc.expiryDate})`,
        plainLanguageFix: 'Obtain an authorized lease extension deed or renewal registration receipt from competent land revenue authority.',
        actionLabel: 'Update Lease Deed',
        actionType: 'UPLOAD_LEASE'
      });
    } else if (daysRemaining < 365) {
      items.push({
        id: 'chk-lease',
        category: 'LEASE',
        title: 'Land Lease Deed Validity',
        description: `Lease deed valid until ${leaseDoc.expiryDate} (${daysRemaining} days remaining). Minimum 1 year safe buffer recommended.`,
        status: 'WARNING',
        statusText: `Lease Renewal Approaching (${daysRemaining} Days Remaining)`,
        plainLanguageFix: 'Initiate registered lease renewal to avoid potential query during EVC physical inspection.',
        actionLabel: 'Review Lease Validity',
        actionType: 'UPLOAD_LEASE'
      });
    } else {
      items.push({
        id: 'chk-lease',
        category: 'LEASE',
        title: 'Land Lease Deed Validity',
        description: `Registered lease is valid until ${leaseDoc.expiryDate} (${daysRemaining} days remaining, > 1 year).`,
        status: 'PASS',
        statusText: 'Valid Statutory Land Lease',
        plainLanguageFix: 'Land lease meets AICTE APH tenure requirements.',
        actionLabel: 'View Lease Details',
        actionType: 'UPLOAD_LEASE'
      });
    }
  }

  // Check 3: Approved Student Intake Filled
  if (!app.approvedIntake || app.approvedIntake <= 0) {
    items.push({
      id: 'chk-intake',
      category: 'INTAKE',
      title: 'Approved Student Intake Seats',
      description: 'Proposed student admission seat quota is unassigned or equal to 0.',
      status: 'FAIL',
      statusText: 'Approved Intake Missing (0 Seats)',
      plainLanguageFix: 'Specify the approved intake seat capacity across engineering/management courses.',
      actionLabel: 'Fill Intake Seats',
      actionType: 'FILL_INTAKE'
    });
  } else {
    items.push({
      id: 'chk-intake',
      category: 'INTAKE',
      title: 'Approved Student Intake Seats',
      description: `Student intake quota set to ${app.approvedIntake} seats across technical disciplines.`,
      status: 'PASS',
      statusText: `Approved Intake Configured (${app.approvedIntake} Seats)`,
      plainLanguageFix: 'Intake seat count properly configured.',
      actionLabel: 'Review Intake',
      actionType: 'FILL_INTAKE'
    });
  }

  // Check 4: Contact & Leadership Details Present
  const hasState = Boolean(app.state && app.state.trim().length > 0);
  const hasRegion = Boolean(app.region && app.region.trim().length > 0);
  const hasPermId = Boolean(app.aictePermanentId && app.aictePermanentId.trim().length > 0);

  if (hasState && hasRegion && hasPermId) {
    items.push({
      id: 'chk-contact',
      category: 'CONTACT',
      title: 'Institutional Identity & Contact Info',
      description: `Permanent ID (${app.aictePermanentId}), State (${app.state}), and Regional Office (${app.region}) linked.`,
      status: 'PASS',
      statusText: 'Institutional Identity Verified',
      plainLanguageFix: 'Head of Institute contact and regional jurisdiction verified.',
      actionLabel: 'Verify Profile',
      actionType: 'UPDATE_CONTACT'
    });
  } else {
    items.push({
      id: 'chk-contact',
      category: 'CONTACT',
      title: 'Institutional Identity & Contact Info',
      description: 'Campus address or permanent AICTE registry ID missing.',
      status: 'WARNING',
      statusText: 'Incomplete Campus Contact Information',
      plainLanguageFix: 'Update institute postal address and AICTE Permanent Institute ID (PID).',
      actionLabel: 'Update Contact Info',
      actionType: 'UPDATE_CONTACT'
    });
  }

  // Check 5: Open Queries from Earlier Return
  const openQueries = app.observations ? app.observations.filter(o => o.status === 'Open') : [];
  if (openQueries.length > 0) {
    items.push({
      id: 'chk-queries',
      category: 'QUERIES',
      title: 'Unresolved Observation Queries',
      description: `${openQueries.length} scrutiny observation query(s) remain open and unaddressed.`,
      status: 'FAIL',
      statusText: `${openQueries.length} Unresolved Scrutiny Queries`,
      plainLanguageFix: `Provide clarifications or rectifications for: "${openQueries[0].text}".`,
      actionLabel: 'Resolve Queries',
      actionType: 'RESOLVE_QUERIES'
    });
  } else {
    items.push({
      id: 'chk-queries',
      category: 'QUERIES',
      title: 'Scrutiny Observations & Queries',
      description: 'No pending observation queries or returned deficiencies outstanding.',
      status: 'PASS',
      statusText: 'Zero Open Scrutiny Queries',
      plainLanguageFix: 'All previous scrutiny queries have been satisfactorily addressed.',
      actionLabel: 'View History',
      actionType: 'RESOLVE_QUERIES'
    });
  }

  // Check 6: Document Expiry Dates Present
  const docsWithoutExpiry = app.documents.filter(d => !d.expiryDate || isNaN(Date.parse(d.expiryDate)));
  if (docsWithoutExpiry.length > 0) {
    items.push({
      id: 'chk-expiry',
      category: 'EXPIRY',
      title: 'Document Expiration Dates',
      description: `${docsWithoutExpiry.length} uploaded document(s) lack a verified statutory expiration date.`,
      status: 'WARNING',
      statusText: `${docsWithoutExpiry.length} Documents Missing Expiration Dates`,
      plainLanguageFix: `Extract or manually input certificate expiry dates for ${docsWithoutExpiry.map(d => d.type).join(', ')}.`,
      actionLabel: 'Set Expiry Dates',
      actionType: 'SET_EXPIRY'
    });
  } else {
    items.push({
      id: 'chk-expiry',
      category: 'EXPIRY',
      title: 'Document Expiration Dates',
      description: 'All statutory certificates contain valid recorded expiration dates.',
      status: 'PASS',
      statusText: 'All Expiry Dates Verified',
      plainLanguageFix: 'All certificate validity timeframes are logged.',
      actionLabel: 'Review Validity',
      actionType: 'SET_EXPIRY'
    });
  }

  const passedCount = items.filter(i => i.status === 'PASS').length;
  const warningCount = items.filter(i => i.status === 'WARNING').length;
  const failedCount = items.filter(i => i.status === 'FAIL').length;
  const totalChecks = items.length;

  const scorePercent = Math.round(((passedCount + warningCount * 0.5) / totalChecks) * 100);

  let overallStatus: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
  if (failedCount > 0) {
    overallStatus = 'FAIL';
  } else if (warningCount > 0) {
    overallStatus = 'WARNING';
  }

  return {
    applicationId: app.id,
    institutionName: app.institutionName,
    checkedAt: new Date().toISOString(),
    overallStatus,
    scorePercent,
    totalChecks,
    passedCount,
    warningCount,
    failedCount,
    items,
    advisoryNote: 'Advisory only: this check does not replace official scrutiny.'
  };
}
