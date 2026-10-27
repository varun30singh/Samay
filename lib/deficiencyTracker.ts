/**
 * Deficiency Closure Tracker (Feature 4 - P0 Core Feature)
 * Tracks, alerts, and escalates physical inspection & scrutiny deficiencies through to formal closure.
 * System never decides hearing outcomes or approvals; authorized officers record formal determinations.
 */

import { DeficiencyRecord } from './types';

export const INITIAL_DEFICIENCIES: DeficiencyRecord[] = [
  {
    id: 'DEF-2026-W-1001-A',
    applicationId: 'APP-2026-W-1001',
    institutionName: 'Shivaji Institute of Technology & Engineering',
    region: 'Western',
    description: 'Block B Fire Safety sprinkler system and emergency exit stairwell width compliance certificate expired.',
    severity: 'major',
    dueDate: '2026-03-25',
    evidenceRequired: 'Fire Department Final NOC & Architect Structural Certificate',
    status: 'Open',
    daysOpen: 14,
    escalationLevel: 1,
    timeline: [
      {
        id: 'EVT-01',
        timestamp: '2026-02-15T11:00:00Z',
        actor: 'Prof. Ramesh Kulkarni',
        actorRole: 'evc_coordinator',
        action: 'Deficiency Flagged During EVC Visit',
        remarks: 'Physical inspection observed inadequate fire egress staircase width in newly added mechanical lab wing.'
      }
    ]
  },
  {
    id: 'DEF-2026-W-1001-B',
    applicationId: 'APP-2026-W-1001',
    institutionName: 'Shivaji Institute of Technology & Engineering',
    region: 'Western',
    description: 'Faculty cadre ratio deficiency: Shortage of 4 Associate Professors in Computer Engineering Department.',
    severity: 'minor',
    dueDate: '2026-03-18',
    evidenceRequired: 'Selection Committee Minutes & University Approval Letters',
    status: 'Institution responded',
    daysOpen: 21,
    escalationLevel: 0,
    timeline: [
      {
        id: 'EVT-02',
        timestamp: '2026-02-08T09:30:00Z',
        actor: 'S. N. Patil',
        actorRole: 'scrutiny_officer',
        action: 'Scrutiny Deficiency Noted',
        remarks: 'Faculty portal roster verified cadre shortfall under APH Table 2.1.'
      },
      {
        id: 'EVT-03',
        timestamp: '2026-02-24T16:00:00Z',
        actor: 'Dr. Suresh Gaikwad (Principal)',
        actorRole: 'institution',
        action: 'Response & Evidence Submitted',
        remarks: 'Offer letters issued to 4 candidates; joining scheduled for March 1st.',
        evidenceName: 'Faculty_Selection_Minutes_Pack.pdf'
      }
    ]
  },
  {
    id: 'DEF-2026-W-1002-A',
    applicationId: 'APP-2026-W-1002',
    institutionName: 'Vishwakarma Institute of Advanced Technology',
    region: 'Western',
    description: 'Cadre ratio in Artificial Intelligence & Data Science department requires registered Industry Adjunct Faculty endorsement.',
    severity: 'minor',
    dueDate: '2026-03-30',
    evidenceRequired: 'MoU with Industry Partner & AICTE NEAT Portal Enrollment',
    status: 'Under verification',
    daysOpen: 10,
    escalationLevel: 0,
    timeline: [
      {
        id: 'EVT-04',
        timestamp: '2026-02-20T14:00:00Z',
        actor: 'Prof. Sandeep Rawat',
        actorRole: 'evc_coordinator',
        action: 'EVC Deficiency Logged',
        remarks: 'Curriculum delivery requires proof of adjunct industry practitioner hours.'
      },
      {
        id: 'EVT-05',
        timestamp: '2026-02-26T12:00:00Z',
        actor: 'Dr. K. Joshi (Dean)',
        actorRole: 'institution',
        action: 'Evidence Uploaded',
        remarks: 'Submitted Tata Elxsi Industry Adjunct appointment credentials.',
        evidenceName: 'Industry_Adjunct_Endorsement.pdf'
      }
    ]
  },
  {
    id: 'DEF-2026-N-2002-A',
    applicationId: 'APP-2026-N-2002',
    institutionName: 'Dr. APJ Abdul Kalam Memorial Engg College',
    region: 'Northern',
    description: 'Pending statutory hearing regarding disputed land demarcation for sports ground buffer zone.',
    severity: 'major',
    dueDate: '2026-03-10',
    evidenceRequired: 'Tehsildar Demarcation Certificate & State Revenue Clearance',
    status: 'Sent to hearing',
    daysOpen: 35,
    hearingDate: '2026-03-08',
    escalationLevel: 2,
    timeline: [
      {
        id: 'EVT-06',
        timestamp: '2026-01-25T10:00:00Z',
        actor: 'Anil Verma',
        actorRole: 'scrutiny_officer',
        action: 'Deficiency Referred to SAC/SHC Hearing',
        remarks: 'Land revenue survey number discrepancy between deed and actual master plan.'
      }
    ]
  },
  {
    id: 'DEF-2026-W-1004-A',
    applicationId: 'APP-2026-W-1004',
    institutionName: 'Sardar Patel College of Engineering and Management',
    region: 'Western',
    description: 'Central library subscription short of mandatory international IEEE/Elsevier e-journals.',
    severity: 'minor',
    dueDate: '2026-02-20',
    evidenceRequired: 'Publisher Subscription Receipt & IP Access Audit Log',
    status: 'Closed',
    daysOpen: 18,
    escalationLevel: 0,
    timeline: [
      {
        id: 'EVT-07',
        timestamp: '2026-02-02T11:00:00Z',
        actor: 'R. K. Shinde',
        actorRole: 'regional_officer',
        action: 'Deficiency Raised',
        remarks: 'Library digital consortium verification required.'
      },
      {
        id: 'EVT-08',
        timestamp: '2026-02-18T15:30:00Z',
        actor: 'R. K. Shinde',
        actorRole: 'regional_officer',
        action: 'Verified & Closed',
        remarks: 'IEEE multi-user campus license receipt verified. Deficiency resolved.'
      }
    ]
  }
];

/**
 * Computes reminder milestones (at 30, 15, 7, 0 days before due date)
 * and escalation milestones (at +3, +7, +14 days after due date).
 */
export function evaluateDeficiencyReminders(
  deficiencies: DeficiencyRecord[],
  simulatedDate: string
): Array<{
  deficiency: DeficiencyRecord;
  actionRequired: 'REMINDER_30' | 'REMINDER_15' | 'REMINDER_7' | 'REMINDER_DUE' | 'ESCALATE_3' | 'ESCALATE_7' | 'ESCALATE_14' | 'NONE';
  daysToDue: number;
  isOverdue: boolean;
}> {
  const curTime = new Date(simulatedDate.split('T')[0]).getTime();

  return deficiencies.map(def => {
    if (def.status === 'Closed' || def.status === 'Accepted') {
      return { deficiency: def, actionRequired: 'NONE', daysToDue: 999, isOverdue: false };
    }

    const dueTime = new Date(def.dueDate).getTime();
    const daysToDue = Math.round((dueTime - curTime) / (1000 * 60 * 60 * 24));
    const isOverdue = daysToDue < 0;

    let action: 'REMINDER_30' | 'REMINDER_15' | 'REMINDER_7' | 'REMINDER_DUE' | 'ESCALATE_3' | 'ESCALATE_7' | 'ESCALATE_14' | 'NONE' = 'NONE';

    if (daysToDue === 30) action = 'REMINDER_30';
    else if (daysToDue === 15) action = 'REMINDER_15';
    else if (daysToDue === 7) action = 'REMINDER_7';
    else if (daysToDue === 0) action = 'REMINDER_DUE';
    else if (daysToDue === -3) action = 'ESCALATE_3';
    else if (daysToDue === -7) action = 'ESCALATE_7';
    else if (daysToDue <= -14) action = 'ESCALATE_14';

    return {
      deficiency: def,
      actionRequired: action,
      daysToDue,
      isOverdue
    };
  });
}

export const evaluateDeficiencyMilestones = evaluateDeficiencyReminders;

