export type Region =
  | 'Northern'
  | 'North-Western'
  | 'Western'
  | 'Central'
  | 'Eastern'
  | 'Southern'
  | 'South-Western'
  | 'South-Central';

export type UserRole =
  | 'institution'
  | 'scrutiny_officer'
  | 'regional_officer'
  | 'bureau_officer'
  | 'evc_coordinator'
  | 'competent_authority'
  | 'system_admin';

export type ApplicationType =
  | 'Extension of Approval (EoA)'
  | 'New Institution Approval'
  | 'Increase in Intake / New Course'
  | 'Change of Site / Location'
  | 'Closure of Course / Institution';

export type RouteType =
  | 'Only Scrutiny'
  | 'Scrutiny + EVC'
  | 'EVC + SAC/SHC'
  | 'Only EVC';

export type StageName =
  | 'Submitted'
  | 'Scrutiny'
  | 'Re-Scrutiny'
  | 'EVC'
  | 'SAC/SHC'
  | 'Decision Pending'
  | 'Approved'
  | 'Rejected'
  | 'Returned to Institution'
  | 'On Hold';

export type RiskStatus = 'On track' | 'Tight' | 'Will miss at current pace' | 'Data incomplete';

export interface StageHistoryItem {
  stage: StageName;
  startedAt: string;
  completedAt?: string;
  actor: string;
  actorRole: UserRole;
  outcome?: string;
  comments?: string;
  durationDays?: number;
}

export interface ObservationQuery {
  id: string;
  author: string;
  authorRole: UserRole;
  timestamp: string;
  text: string;
  status: 'Open' | 'Resolved' | 'Disputed';
  response?: string;
  responseTimestamp?: string;
}

export interface EVCVisitDetails {
  scheduledDate?: string;
  committeeMembers: string[];
  status: 'Not Scheduled' | 'Scheduled' | 'Completed' | 'Delayed';
  hasConflict?: boolean;
  conflictDetails?: string;
  outcomeRecord?: string;
  completedDate?: string;
  isNewInstitutionPriority?: boolean;
}

export interface UndertakingItem {
  id: string;
  condition: string;
  dueDate: string;
  requiredEvidence: string;
  status: 'Pending' | 'Evidence Submitted' | 'Verified' | 'Query Raised' | 'Rejected' | 'Overdue';
  submittedEvidenceName?: string;
  submittedAt?: string;
  verifiedBy?: string;
  verificationDate?: string;
  verificationComments?: string;
  escalationLevel?: number; // 0, 1, 2, 3
}

export interface DocumentRecord {
  id: string;
  type: 'Land Lease Deed' | 'Building Plan NOC' | 'Fire Safety Certificate' | 'Affiliation Letter' | 'Pollution Clearance';
  filename: string;
  fileSize: string;
  uploadDate: string;
  expiryDate: string;
  remainingDays: number;
  validityStatus: 'Valid' | 'Expiring Soon' | 'Expired';
  expirySource: 'AI-proposed and confirmed' | 'Manually Entered';
  aiConfidence?: number;
  highlightedText?: string;
  officerConfirmed: boolean;
  confirmedBy?: string;
}

export interface Application {
  id: string; // e.g. "APP-2026-N-1042"
  applicationNumber: string;
  institutionId: string;
  institutionName: string;
  aictePermanentId: string;
  region: Region;
  state: string;
  type: ApplicationType;
  route: RouteType;
  routeVersion: string;
  currentStage: StageName;
  submissionDate: string;
  approvedIntake: number; // Student seats affected
  assignedOfficer: string;
  supervisor: string;
  lastUpdated: string;
  stageHistory: StageHistoryItem[];
  observations: ObservationQuery[];
  evc?: EVCVisitDetails;
  undertakings: UndertakingItem[];
  documents: DocumentRecord[];
  
  // Deadline Guard computed metrics
  riskStatus: RiskStatus;
  delayRiskScore: number; // 0 - 100
  latestSafeDateForCurrentStage: string;
  daysRemainingInStage: number;
  daysToApprovalCutoff: number;
  workingDaysRemainingInStage?: number;
  workingDaysToCutoff?: number;
  workingCalendarVersion?: string;
  riskReasons: string[];
  complianceHealthScore: number; // 0 - 100

  // Feature 3: Officer delegation
  isDelegated?: boolean;
  delegatedFrom?: string;
  delegationReason?: string;

  // Feature 5: Incomplete data flag
  isIncompleteData?: boolean;
  incompleteReasons?: string[];
}

export interface AlertNotification {
  id: string;
  uniqueKey: string; // For idempotency
  applicationId: string;
  institutionName: string;
  region: Region;
  eventType:
    | 'Stage Nearing Deadline'
    | 'Stage Overdue'
    | 'EVC Due'
    | 'EVC Overdue'
    | 'Undertaking Due'
    | 'Undertaking Overdue'
    | 'Lease Expiring Soon'
    | 'Lease Expired'
    | 'Deficiency Due'
    | 'Deficiency Overdue'
    | 'Officer Delegated'
    | 'Readiness Check Completed'
    | 'Data Import Error';
  recipientRole: UserRole;
  recipientName: string;
  title: string;
  message: string;
  timestamp: string;
  escalationLevel: number; // 0 = standard, 1 = supervisor, 2 = regional, 3 = bureau
  status: 'Pending' | 'Sent' | 'Late' | 'Acknowledged' | 'Resolved';
  read: boolean;
  channel: 'In-App' | 'Email' | 'SMS/WhatsApp';
}

export interface AuditEntry {
  id: string;
  blockIndex: number;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  objectType: 'Application' | 'EVC' | 'Undertaking' | 'Document' | 'Alert' | 'System' | 'WorkingCalendar' | 'Readiness' | 'Delegation' | 'Deficiency' | 'DataImport';
  objectId: string;
  details: string;
  previousHash: string;
  hash: string;
  isTampered?: boolean;
}

export interface SystemCalendarConfig {
  academicYear: string;
  approvalCutoffDate: string; // e.g. "2027-04-30" or demo date "2026-04-30"
  scrutinyTypicalDays: number;
  evcTypicalDays: number;
  sacShcTypicalDays: number;
  decisionTypicalDays: number;
  advanceAlertDays: number; // default 14 days
  leaseWarningThresholdYears: number; // default 5 years / 20 years
  version: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
}

export type SupportedLanguage = 'en' | 'hi' | 'mr';

// =========================================================================
// FEATURE 1: WORKING-DAYS CALENDAR TYPES
// =========================================================================
export interface HolidayItem {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface WorkingCalendarConfig {
  version: string;
  academicYear: string;
  weeklyOffSunday: boolean;
  weeklyOffSecondFourthSaturday: boolean;
  weeklyOffAllSaturdays: boolean;
  holidays: HolidayItem[];
  lastUpdated: string;
  updatedBy: string;
}

// =========================================================================
// FEATURE 2: PRE-SUBMISSION READINESS CHECKER TYPES
// =========================================================================
export type ReadinessStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface ReadinessCheckItem {
  id: string;
  category: 'DOCUMENTS' | 'LEASE' | 'INTAKE' | 'CONTACT' | 'QUERIES' | 'EXPIRY';
  title: string;
  description: string;
  status: ReadinessStatus;
  statusText: string;
  plainLanguageFix: string;
  actionLabel: string;
  actionType: 'UPLOAD_LEASE' | 'FILL_INTAKE' | 'UPDATE_CONTACT' | 'RESOLVE_QUERIES' | 'SET_EXPIRY' | 'UPLOAD_DOC';
}

export interface ReadinessCheckReport {
  applicationId: string;
  institutionName: string;
  checkedAt: string;
  overallStatus: ReadinessStatus;
  scorePercent: number;
  totalChecks: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  items: ReadinessCheckItem[];
  advisoryNote: string;
}

// =========================================================================
// FEATURE 3: OFFICER DELEGATION AND LEAVE TYPES
// =========================================================================
export interface OfficerLeaveRecord {
  id: string;
  officerName: string;
  officerRole: UserRole;
  region: Region;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  delegateName: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface QueueCoverageSummary {
  officerName: string;
  role: UserRole;
  region: Region;
  isOnLeave: boolean;
  leaveDetails?: OfficerLeaveRecord;
  delegateName?: string;
  activeQueueCount: number;
  delegatedQueueCount: number;
  hasUncoveredQueue: boolean;
}

// =========================================================================
// FEATURE 4: DEFICIENCY CLOSURE TRACKER TYPES
// =========================================================================
export type DeficiencySeverity = 'minor' | 'major';

export type DeficiencyStatus =
  | 'Open'
  | 'Institution responded'
  | 'Under verification'
  | 'Accepted'
  | 'Query Raised'
  | 'Rejected'
  | 'Sent to hearing'
  | 'Hearing outcome recorded'
  | 'Closed';

export interface DeficiencyTimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  remarks?: string;
  evidenceName?: string;
}

export interface DeficiencyRecord {
  id: string;
  applicationId: string;
  institutionName: string;
  region: Region;
  description: string;
  severity: DeficiencySeverity;
  dueDate: string; // YYYY-MM-DD
  evidenceRequired: string;
  status: DeficiencyStatus;
  daysOpen: number;
  hearingDate?: string;
  hearingOutcome?: string;
  recordedBy?: string;
  lastReminderSentAt?: string;
  escalationLevel: number;
  timeline: DeficiencyTimelineEvent[];
}

// =========================================================================
// FEATURE 5: CSV BULK IMPORT AND INTEGRATION ADAPTER TYPES
// =========================================================================
export interface DataQualityMetrics {
  totalAnalyzed: number;
  missingIntakeCount: number;
  missingLeaseDateCount: number;
  invalidDatesCount: number;
  dataIncompleteCount: number;
}
