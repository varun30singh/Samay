/**
 * Officer Delegation and Leave Management (Feature 3)
 * Manages officer availability, regional delegation routing, and queue coverage integrity.
 */

import { Application, OfficerLeaveRecord, QueueCoverageSummary, Region, UserRole } from './types';

export const INITIAL_OFFICER_LEAVES: OfficerLeaveRecord[] = [
  {
    id: 'LEAVE-2026-001',
    officerName: 'S. N. Patil (RO Mumbai)',
    officerRole: 'regional_officer',
    region: 'Western',
    startDate: '2026-02-25',
    endDate: '2026-03-10',
    reason: 'Medical leave & official APH state court deposition',
    delegateName: 'R. K. Shinde (RO Pune)',
    status: 'ACTIVE',
    createdAt: '2026-02-24T10:00:00Z'
  },
  {
    id: 'LEAVE-2026-002',
    officerName: 'Anil Verma (Scrutiny Off)',
    officerRole: 'scrutiny_officer',
    region: 'Northern',
    startDate: '2026-02-28',
    endDate: '2026-03-15',
    reason: 'Deputed to National Cyber-Security Assessment Panel',
    delegateName: 'S. K. Gupta (Scrutiny Off)',
    status: 'ACTIVE',
    createdAt: '2026-02-27T14:30:00Z'
  }
];

export const REGIONAL_OFFICER_REGISTRY: Array<{ name: string; role: UserRole; region: Region }> = [
  { name: 'Dr. R. Sharma (AICTE RO)', role: 'scrutiny_officer', region: 'Western' },
  { name: 'S. N. Patil (RO Mumbai)', role: 'regional_officer', region: 'Western' },
  { name: 'R. K. Shinde (RO Pune)', role: 'regional_officer', region: 'Western' },
  { name: 'P. Joshi (RO Western)', role: 'regional_officer', region: 'Western' },
  { name: 'Anil Verma (Scrutiny Off)', role: 'scrutiny_officer', region: 'Northern' },
  { name: 'S. K. Gupta (Scrutiny Off)', role: 'scrutiny_officer', region: 'Northern' },
  { name: 'Deepak Chouhan (RO Bhopal)', role: 'regional_officer', region: 'Central' },
  { name: 'K. V. Raman (RO Chennai)', role: 'regional_officer', region: 'Southern' },
  { name: 'B. S. Murthy (RO Bengaluru)', role: 'regional_officer', region: 'South-Western' },
  { name: 'Dr. V. K. Sharma (Adviser)', role: 'bureau_officer', region: 'Northern' }
];

/**
 * Checks if a date falls inside the leave interval [startDate, endDate] inclusive
 */
export function isDateInsideInterval(checkDateStr: string, startDateStr: string, endDateStr: string): boolean {
  const check = new Date(checkDateStr.split('T')[0]).getTime();
  const start = new Date(startDateStr).getTime();
  const end = new Date(endDateStr).getTime();
  return check >= start && check <= end;
}

/**
 * Determines whether an officer is actively on leave as of simulatedDate
 */
export function isOfficerOnLeave(
  officerName: string,
  simulatedDate: string,
  leaves: OfficerLeaveRecord[]
): { onLeave: boolean; leaveRecord?: OfficerLeaveRecord } {
  const activeLeave = leaves.find(l => {
    if (l.officerName !== officerName) return false;
    if (l.status === 'CANCELLED') return false;
    return isDateInsideInterval(simulatedDate, l.startDate, l.endDate);
  });

  return {
    onLeave: Boolean(activeLeave),
    leaveRecord: activeLeave
  };
}

/**
 * Gets the active delegate for an officer, or null if officer is available.
 */
export function getDelegateForOfficer(
  officerName: string,
  simulatedDate: string,
  leaves: OfficerLeaveRecord[]
): string | null {
  const { onLeave, leaveRecord } = isOfficerOnLeave(officerName, simulatedDate, leaves);
  return onLeave && leaveRecord ? leaveRecord.delegateName : null;
}

/**
 * Applies delegation mapping across all applications based on simulatedDate.
 */
export function applyDelegationToApplications(
  applications: Application[],
  simulatedDate: string,
  leaves: OfficerLeaveRecord[]
): Application[] {
  return applications.map(app => {
    const { onLeave, leaveRecord } = isOfficerOnLeave(app.assignedOfficer, simulatedDate, leaves);
    if (onLeave && leaveRecord) {
      return {
        ...app,
        isDelegated: true,
        delegatedFrom: app.assignedOfficer,
        assignedOfficer: leaveRecord.delegateName, // Delegate now handles the queue item
        delegationReason: leaveRecord.reason
      };
    }
    return app;
  });
}

/**
 * Computes queue coverage integrity across all officers and regions.
 * Detects queues with NO active coverage and flags them.
 */
export function computeQueueCoverage(
  officers: Array<{ name: string; role: UserRole; region: Region }>,
  applications: Application[],
  leaves: OfficerLeaveRecord[],
  simulatedDate: string
): QueueCoverageSummary[] {
  return officers.map(officer => {
    const { onLeave, leaveRecord } = isOfficerOnLeave(officer.name, simulatedDate, leaves);

    // Direct items assigned to this officer
    const directCount = applications.filter(a => a.assignedOfficer === officer.name).length;

    // Items delegated TO this officer from colleagues on leave
    const delegatedCount = applications.filter(a => a.isDelegated && a.assignedOfficer === officer.name).length;

    // A queue is uncovered if an officer is on leave without a designated active delegate
    const hasUncoveredQueue = onLeave && (!leaveRecord || !leaveRecord.delegateName || leaveRecord.delegateName.trim() === '');

    return {
      officerName: officer.name,
      role: officer.role,
      region: officer.region,
      isOnLeave: onLeave,
      leaveDetails: leaveRecord,
      delegateName: leaveRecord?.delegateName,
      activeQueueCount: directCount,
      delegatedQueueCount: delegatedCount,
      hasUncoveredQueue
    };
  });
}
