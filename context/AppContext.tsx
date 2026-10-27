'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import {
  Application,
  UserRole,
  Region,
  SystemCalendarConfig,
  AuditEntry,
  AlertNotification,
  SupportedLanguage,
  StageName,
  WorkingCalendarConfig,
  ReadinessCheckReport,
  OfficerLeaveRecord,
  QueueCoverageSummary,
  DeficiencyRecord,
  DataQualityMetrics
} from '@/lib/types';
import {
  INITIAL_CALENDAR_CONFIG,
  DEFAULT_SIMULATED_DATE,
  generateSeedApplications,
  generateInitialAuditLog,
  generateInitialAlerts,
  evaluateDeadlineGuard
} from '@/lib/seedData';
import { DEFAULT_WORKING_CALENDAR } from '@/lib/workingCalendar';
import { runReadinessCheck } from '@/lib/readinessChecker';
import { INITIAL_OFFICER_LEAVES, REGIONAL_OFFICER_REGISTRY, computeQueueCoverage, applyDelegationToApplications } from '@/lib/officerDelegation';
import { INITIAL_DEFICIENCIES, evaluateDeficiencyReminders } from '@/lib/deficiencyTracker';
import { CsvAdapter, evaluateDataQuality, RowError } from '@/lib/dataAdapters';
import { createBlockHash, verifyAuditChain, VerificationResult } from '@/lib/crypto';
import { TRANSLATIONS } from '@/lib/aphRules';

export interface CurrentUser {
  userId: string;
  role: UserRole;
  roleLabel: string;
  email: string;
}

interface AppContextType {
  // State
  applications: Application[];
  simulatedDate: string;
  calendarConfig: SystemCalendarConfig;
  currentRole: UserRole;
  currentRegion: Region | 'All';
  language: SupportedLanguage;
  auditLog: AuditEntry[];
  alerts: AlertNotification[];
  chainIntegrity: VerificationResult;
  selectedAppId: string | null;
  t: Record<string, string>;
  isTampered: boolean;
  theme: 'light' | 'dark';
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;

  // Feature 1: Working-Days Calendar
  workingCalendar: WorkingCalendarConfig;
  updateWorkingCalendar: (updated: Partial<WorkingCalendarConfig>, reason: string) => void;
  addHoliday: (holiday: { date: string; name: string }) => void;
  removeHoliday: (date: string) => void;

  // Feature 2: Pre-Submission Readiness Checker
  readinessReports: Record<string, ReadinessCheckReport>;
  runReadinessCheckForApp: (appId: string) => ReadinessCheckReport | null;
  submitApplicationWithReadiness: (appId: string, bypassWarning?: boolean) => { success: boolean; requiresConfirmation?: boolean; issuesCount?: number; report?: ReadinessCheckReport; error?: string };

  // Feature 3: Officer Delegation and Leave
  officerLeaves: OfficerLeaveRecord[];
  queueCoverageSummaries: QueueCoverageSummary[];
  effectiveApplications: Application[];
  markOfficerUnavailable: (officerName: string, officerRole: UserRole, region: Region, startDate: string, endDate: string, delegateName: string, reason: string) => { success: boolean; error?: string };
  cancelOfficerLeave: (leaveId: string) => void;

  // Feature 4: Deficiency Closure Tracker
  deficiencies: DeficiencyRecord[];
  recordDeficiencyResponse: (deficiencyId: string, responseText: string, evidenceFileName: string) => void;
  verifyDeficiency: (deficiencyId: string, decision: 'Accepted' | 'Query' | 'Rejected', remarks: string) => void;
  sendDeficiencyToHearing: (deficiencyId: string, hearingDate: string, hearingCommittee: string) => void;
  recordHearingOutcome: (deficiencyId: string, outcome: 'Closed' | 'Deficiency Maintained', remarks: string) => void;
  sendDeficiencyReminder: (deficiencyId: string) => void;
  escalateDeficiency: (deficiencyId: string) => void;

  // Feature 5: CSV Bulk Import and Integration Adapter
  dataQualityMetrics: DataQualityMetrics;
  importApplicationsFromCsv: (csvContent: string, fileName: string) => Promise<{ success: boolean; totalRows: number; validCount: number; invalidCount: number; errors: RowError[]; errorReportCsv?: string }>;

  // Actions
  login: (userId: string, role: UserRole, roleLabel?: string, email?: string) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  setRegion: (region: Region | 'All') => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setSelectedAppId: (id: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  advanceSimulatedDate: (days: number) => void;
  jumpToSixtyDaysBeforeCutoff: () => void;
  resetSimulation: () => void;
  
  // Workflow Actions
  moveToNextStage: (appId: string, nextStage: StageName, comments?: string) => { success: boolean; error?: string };
  returnApplication: (appId: string, reason: string) => { success: boolean; error?: string };
  recordStatutoryDecision: (appId: string, decision: 'Approved' | 'Rejected', orderDetails: string) => { success: boolean; error?: string };
  
  // EVC Actions
  scheduleEVC: (appId: string, date: string, members: string[]) => { success: boolean; conflictWarning?: string };
  resolveEVCConflict: (appId: string, replacementMember: string) => void;
  completeEVCVisit: (appId: string, outcome: string) => void;

  // Undertakings Actions
  submitUndertakingEvidence: (appId: string, undertakingId: string, fileName: string) => void;
  verifyUndertaking: (appId: string, undertakingId: string, decision: 'Verified' | 'Query Raised' | 'Rejected', comments: string) => void;

  // Document & Expiry Actions
  proposeAndConfirmLeaseExpiry: (appId: string, newExpiryDate: string, confirmed: boolean) => void;

  // Audit Actions
  simulateAuditTampering: () => void;
  restoreAuditIntegrity: () => void;
  
  // Config
  updateCutoffDate: (newDate: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [simulatedDate, setSimulatedDate] = useState<string>(DEFAULT_SIMULATED_DATE);
  const [calendarConfig, setCalendarConfig] = useState<SystemCalendarConfig>(INITIAL_CALENDAR_CONFIG);
  const [currentRegion, setCurrentRegion] = useState<Region | 'All'>('All');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isTampered, setIsTampered] = useState<boolean>(false);

  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem('samay_theme') as 'light' | 'dark' | null;
        if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
      } catch {
        // ignore
      }
    }
    return 'light';
  });

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAuth = localStorage.getItem('samay_auth');
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);
          if (parsed && parsed.userId && parsed.role) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAuth = localStorage.getItem('samay_auth');
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);
          return !!(parsed && parsed.userId && parsed.role);
        }
      } catch {
        // ignore
      }
    }
    return false;
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAuth = localStorage.getItem('samay_auth');
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);
          if (parsed && parsed.role) return parsed.role;
        }
      } catch {
        // ignore
      }
    }
    return 'bureau_officer';
  });

  // Synchronize document element class with theme on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('samay_theme');
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch {
      // localStorage may not be available in SSR or strict mode
    }
  }, []);

  const login = (userId: string, role: UserRole, roleLabel?: string, email?: string) => {
    const user: CurrentUser = {
      userId,
      role,
      roleLabel: roleLabel || role,
      email: email || `${userId.toLowerCase()}@aicte-india.org`
    };
    setIsAuthenticated(true);
    setCurrentUser(user);
    setCurrentRole(role);
    try {
      localStorage.setItem('samay_auth', JSON.stringify(user));
    } catch {}
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    try {
      localStorage.removeItem('samay_auth');
    } catch {}
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    try {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      localStorage.setItem('samay_theme', newTheme);
    } catch {}
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const [rawApplications, setRawApplications] = useState<Application[]>(() => {
    return generateSeedApplications(DEFAULT_SIMULATED_DATE);
  });

  // Feature 1: Working-Days Calendar State
  const [workingCalendar, setWorkingCalendar] = useState<WorkingCalendarConfig>(DEFAULT_WORKING_CALENDAR);

  // Feature 2: Readiness Reports State
  const [readinessReports, setReadinessReports] = useState<Record<string, ReadinessCheckReport>>({});

  // Feature 3: Officer Leaves State
  const [officerLeaves, setOfficerLeaves] = useState<OfficerLeaveRecord[]>(INITIAL_OFFICER_LEAVES);

  // Feature 4: Deficiency Closure Tracker State
  const [deficiencies, setDeficiencies] = useState<DeficiencyRecord[]>(INITIAL_DEFICIENCIES);

  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => {
    return generateInitialAuditLog();
  });

  const [alerts, setAlerts] = useState<AlertNotification[]>(() => {
    return generateInitialAlerts();
  });

  // Verify chain integrity whenever auditLog changes
  const chainIntegrity = useMemo(() => {
    return verifyAuditChain(auditLog);
  }, [auditLog]);

  // Recalculate Deadline Guard whenever rawApplications, simulatedDate, calendarConfig, workingCalendar, or deficiencies change
  const applications = useMemo(() => {
    return rawApplications.map(app => {
      const dg = evaluateDeadlineGuard(app, simulatedDate, calendarConfig, workingCalendar, deficiencies);
      return {
        ...app,
        ...dg
      };
    });
  }, [rawApplications, simulatedDate, calendarConfig, workingCalendar, deficiencies]);

  // Effective applications with delegation routing applied
  const effectiveApplications = useMemo(() => {
    return applyDelegationToApplications(applications, simulatedDate, officerLeaves);
  }, [applications, simulatedDate, officerLeaves]);

  // Queue Coverage Summary
  const queueCoverageSummaries = useMemo(() => {
    return computeQueueCoverage(REGIONAL_OFFICER_REGISTRY, applications, officerLeaves, simulatedDate);
  }, [applications, officerLeaves, simulatedDate]);

  // Feature 5: Data Quality Metrics
  const dataQualityMetrics = useMemo(() => {
    return evaluateDataQuality(applications);
  }, [applications]);

  // Internal helper to append an audit entry
  const appendAudit = (
    actor: string,
    actorRole: UserRole,
    action: string,
    objectType: AuditEntry['objectType'],
    objectId: string,
    details: string
  ) => {
    setAuditLog(prevLog => {
      const prevBlock = prevLog[prevLog.length - 1];
      const prevHash = prevBlock ? prevBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000';
      const blockIndex = prevLog.length + 1;
      const hash = createBlockHash(
        prevHash,
        blockIndex,
        simulatedDate,
        actor,
        action,
        objectId,
        details
      );

      const newEntry: AuditEntry = {
        id: `AUDIT-BLK-${blockIndex}`,
        blockIndex,
        timestamp: simulatedDate,
        actor,
        actorRole,
        action,
        objectType,
        objectId,
        details,
        previousHash: prevHash,
        hash
      };

      return [...prevLog, newEntry];
    });
  };

  // Internal helper to create idempotent alert
  const triggerAlert = useCallback((
    key: string,
    appId: string,
    instName: string,
    region: Region,
    type: AlertNotification['eventType'],
    recipientRole: UserRole,
    recipientName: string,
    title: string,
    message: string,
    escalationLevel: number = 0,
    channel: AlertNotification['channel'] = 'In-App'
  ) => {
    setAlerts(prev => {
      // Check idempotency: if unique key exists, do not duplicate!
      if (prev.some(a => a.uniqueKey === key)) {
        return prev;
      }
      const newAlert: AlertNotification = {
        id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        uniqueKey: key,
        applicationId: appId,
        institutionName: instName,
        region,
        eventType: type,
        recipientRole,
        recipientName,
        title,
        message,
        timestamp: simulatedDate,
        escalationLevel,
        status: 'Pending',
        read: false,
        channel
      };
      return [newAlert, ...prev];
    });
  }, [simulatedDate]);

  // Advance simulated clock
  const advanceSimulatedDate = (days: number) => {
    const cur = new Date(simulatedDate);
    const newDate = new Date(cur.getTime() + days * 24 * 60 * 60 * 1000);
    const newDateStr = newDate.toISOString().replace('.000Z', '');
    setSimulatedDate(newDateStr);

    appendAudit(
      'System Scheduler',
      'system_admin',
      'SIMULATED_CLOCK_ADVANCED',
      'System',
      'SIM-CLOCK',
      `Simulated time advanced by +${days} days to ${newDateStr.split('T')[0]}. Evaluated stage ageing and escalation ladders.`
    );

    // Trigger alerts for newly overdue applications
    applications.forEach(app => {
      if (app.currentStage === 'EVC' && app.evc?.status === 'Not Scheduled') {
        const uniqueKey = `ALT_EVC_NOT_SCHED_${app.id}_${newDateStr.split('T')[0]}`;
        triggerAlert(
          uniqueKey,
          app.id,
          app.institutionName,
          app.region,
          'EVC Due',
          'evc_coordinator',
          'EVC Coordinator',
          `Urgent EVC Scheduling Required: ${app.institutionName}`,
          `Application has reached critical stage with no EVC visit scheduled. Threat to 30 April cutoff.`,
          days >= 7 ? 2 : 1
        );
      }
      
      const leaseDoc = app.documents.find(d => d.type === 'Land Lease Deed');
      if (leaseDoc && new Date(leaseDoc.expiryDate) <= new Date(calendarConfig.approvalCutoffDate)) {
        const uniqueKey = `ALT_LEASE_CRITICAL_${app.id}_${leaseDoc.expiryDate}`;
        triggerAlert(
          uniqueKey,
          app.id,
          app.institutionName,
          app.region,
          'Lease Expiring Soon',
          'regional_officer',
          app.supervisor,
          `Critical Lease Expiry: ${app.institutionName}`,
          `Land lease deed validity (${leaseDoc.expiryDate}) lapses before approval cycle completes. Escalate to Regional Officer.`,
          2,
          'Email'
        );
      }
    });
  };

  const jumpToSixtyDaysBeforeCutoff = () => {
    setSimulatedDate(DEFAULT_SIMULATED_DATE);
    appendAudit(
      'System Administrator',
      'system_admin',
      'SIMULATION_DATE_JUMP',
      'System',
      'SIM-CLOCK',
      `Clock reset to 60 days before cutoff date: 1 March 2026. Seeded baseline active.`
    );
  };

  const resetSimulation = () => {
    setSimulatedDate(DEFAULT_SIMULATED_DATE);
    setRawApplications(generateSeedApplications(DEFAULT_SIMULATED_DATE));
    setAuditLog(generateInitialAuditLog());
    setAlerts(generateInitialAlerts());
    setIsTampered(false);
  };

  // Move application to next stage with guard conditions
  const moveToNextStage = (appId: string, nextStage: StageName, comments: string = '') => {
    const app = applications.find(a => a.id === appId);
    if (!app) return { success: false, error: 'Application not found' };

    // Guard conditions check
    if (['Approved', 'Rejected'].includes(nextStage)) {
      if (currentRole !== 'competent_authority') {
        return {
          success: false,
          error: 'Statutory Safeguard Violation (FR-A7): Final Grant / Rejection decisions can ONLY be taken by the Competent AICTE Authority.'
        };
      }
    }

    setRawApplications(prev =>
      prev.map(item => {
        if (item.id !== appId) return item;

        const updatedHistory = [
          ...item.stageHistory,
          {
            stage: nextStage,
            startedAt: simulatedDate,
            actor: getActorNameForRole(currentRole),
            actorRole: currentRole,
            outcome: `Transitioned from ${item.currentStage} to ${nextStage}`,
            comments: comments || 'Stage transition completed under APH guidelines.'
          }
        ];

        return {
          ...item,
          currentStage: nextStage,
          lastUpdated: simulatedDate,
          stageHistory: updatedHistory
        };
      })
    );

    appendAudit(
      getActorNameForRole(currentRole),
      currentRole,
      'STAGE_TRANSITION',
      'Application',
      appId,
      `Application ${appId} moved from ${app.currentStage} to ${nextStage}. Remarks: ${comments || 'None'}`
    );

    return { success: true };
  };

  // Return/revert application to earlier stage or institution with mandatory reason
  const returnApplication = (appId: string, reason: string) => {
    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'Mandatory Reason Required: A detailed deficiency explanation must be recorded.' };
    }

    const app = applications.find(a => a.id === appId);
    if (!app) return { success: false, error: 'Application not found' };

    setRawApplications(prev =>
      prev.map(item => {
        if (item.id !== appId) return item;

        const updatedHistory = [
          ...item.stageHistory,
          {
            stage: 'Returned to Institution' as StageName,
            startedAt: simulatedDate,
            actor: getActorNameForRole(currentRole),
            actorRole: currentRole,
            outcome: 'Deficiency returned for clarification/rectification',
            comments: reason
          }
        ];

        return {
          ...item,
          currentStage: 'Returned to Institution',
          lastUpdated: simulatedDate,
          stageHistory: updatedHistory,
          observations: [
            ...item.observations,
            {
              id: `OBS-${Date.now()}`,
              author: getActorNameForRole(currentRole),
              authorRole: currentRole,
              timestamp: simulatedDate,
              text: reason,
              status: 'Open'
            }
          ]
        };
      })
    );

    appendAudit(
      getActorNameForRole(currentRole),
      currentRole,
      'APPLICATION_RETURNED_DEFICIENCY',
      'Application',
      appId,
      `Application returned to institution with recorded reason: "${reason}".`
    );

    triggerAlert(
      `ALT_RETURN_${appId}_${Date.now()}`,
      appId,
      app.institutionName,
      app.region,
      'Stage Overdue',
      'institution',
      app.institutionName,
      `Action Required: Application Returned with Deficiencies`,
      `Your application was returned by ${getActorNameForRole(currentRole)}. Reason: ${reason}. Please upload compliance evidence promptly.`,
      1,
      'SMS/WhatsApp'
    );

    return { success: true };
  };

  // Final statutory decision
  const recordStatutoryDecision = (appId: string, decision: 'Approved' | 'Rejected', orderDetails: string) => {
    if (currentRole !== 'competent_authority') {
      return {
        success: false,
        error: 'Statutory Safeguard Violation (FR-A7): Only Competent Authority (Member Secretary / Chairman) can record final statutory approvals or rejections.'
      };
    }

    const app = applications.find(a => a.id === appId);
    if (!app) return { success: false, error: 'Application not found' };

    setRawApplications(prev =>
      prev.map(item => {
        if (item.id !== appId) return item;

        return {
          ...item,
          currentStage: decision,
          lastUpdated: simulatedDate,
          stageHistory: [
            ...item.stageHistory,
            {
              stage: decision,
              startedAt: simulatedDate,
              actor: 'Dr. T. G. Sitharam (Chairman / Member Secretary)',
              actorRole: 'competent_authority',
              outcome: decision === 'Approved' ? 'Statutory Extension of Approval Granted' : 'Rejected with Speaking Order',
              comments: orderDetails
            }
          ]
        };
      })
    );

    appendAudit(
      'Dr. T. G. Sitharam (Competent Authority)',
      'competent_authority',
      decision === 'Approved' ? 'STATUTORY_APPROVAL_GRANTED' : 'STATUTORY_REJECTION_ISSUED',
      'Application',
      appId,
      `Competent Authority issued final statutory order: ${decision}. Order details: ${orderDetails}`
    );

    return { success: true };
  };

  // Schedule EVC with conflict detection
  const scheduleEVC = (appId: string, date: string, members: string[]) => {
    // Check if any member has another scheduled visit on the exact same date
    let conflictFound = false;
    let conflictWarning = '';

    for (const app of applications) {
      if (app.id !== appId && app.evc?.status === 'Scheduled' && app.evc.scheduledDate === date) {
        const overlappingMember = members.find(m => app.evc?.committeeMembers.includes(m));
        if (overlappingMember) {
          conflictFound = true;
          conflictWarning = `Scheduling Conflict Detected: Committee member "${overlappingMember}" is already booked on ${date} for "${app.institutionName}" (${app.region} Region).`;
          break;
        }
      }
    }

    setRawApplications(prev =>
      prev.map(item => {
        if (item.id !== appId) return item;

        const updatedEVC = {
          status: 'Scheduled' as const,
          scheduledDate: date,
          committeeMembers: members,
          hasConflict: conflictFound,
          conflictDetails: conflictFound ? conflictWarning : undefined,
          isNewInstitutionPriority: item.type === 'New Institution Approval'
        };

        return {
          ...item,
          evc: updatedEVC,
          lastUpdated: simulatedDate
        };
      })
    );

    appendAudit(
      getActorNameForRole(currentRole),
      currentRole,
      conflictFound ? 'EVC_SCHEDULED_WITH_CONFLICT' : 'EVC_SCHEDULED',
      'EVC',
      appId,
      `EVC scheduled for ${date} with members [${members.join(', ')}]. ${conflictFound ? 'CONFLICT FLAGGED: ' + conflictWarning : 'No scheduling conflicts.'}`
    );

    return {
      success: true,
      conflictWarning: conflictFound ? conflictWarning : undefined
    };
  };

  // Resolve EVC conflict by replacing member
  const resolveEVCConflict = (appId: string, replacementMember: string) => {
    setRawApplications(prev =>
      prev.map(item => {
        if (item.id !== appId || !item.evc) return item;

        const updatedMembers = item.evc.committeeMembers.map((m, idx) =>
          idx === 0 ? replacementMember : m
        );

        return {
          ...item,
          evc: {
            ...item.evc,
            committeeMembers: updatedMembers,
            hasConflict: false,
            conflictDetails: undefined
          },
          lastUpdated: simulatedDate
        };
      })
    );

    appendAudit(
      getActorNameForRole(currentRole),
      currentRole,
      'EVC_CONFLICT_RESOLVED',
      'EVC',
      appId,
      `EVC scheduling conflict resolved. Committee member reassigned to ${replacementMember}. Status clear.`
    );
  };

  // Complete EVC visit
  const completeEVCVisit = (appId: string, outcome: string) => {
    setRawApplications(prev =>
      prev.map(item => {
        if (item.id !== appId || !item.evc) return item;

        return {
          ...item,
          currentStage: 'Decision Pending',
          evc: {
            ...item.evc,
            status: 'Completed',
            outcomeRecord: outcome,
            completedDate: simulatedDate
          },
          lastUpdated: simulatedDate
        };
      })
    );

    appendAudit(
      getActorNameForRole(currentRole),
      currentRole,
      'EVC_INSPECTION_COMPLETED',
      'EVC',
      appId,
      `EVC Inspection completed. Report uploaded: "${outcome}". Moving to Decision Pending stage.`
    );
  };

  // Submit Undertaking Evidence
  const submitUndertakingEvidence = (appId: string, undertakingId: string, fileName: string) => {
    setRawApplications(prev =>
      prev.map(item => {
        if (item.id !== appId) return item;

        const updatedUndertakings = item.undertakings.map(u => {
          if (u.id !== undertakingId) return u;
          return {
            ...u,
            status: 'Evidence Submitted' as const,
            submittedEvidenceName: fileName,
            submittedAt: simulatedDate
          };
        });

        return {
          ...item,
          undertakings: updatedUndertakings,
          lastUpdated: simulatedDate
        };
      })
    );

    appendAudit(
      getActorNameForRole(currentRole),
      currentRole,
      'UNDERTAKING_EVIDENCE_SUBMITTED',
      'Undertaking',
      undertakingId,
      `Evidence "${fileName}" uploaded for institutional undertaking condition by institute.`
    );
  };

  // Verify Undertaking
  const verifyUndertaking = (
    appId: string,
    undertakingId: string,
    decision: 'Verified' | 'Query Raised' | 'Rejected',
    comments: string
  ) => {
    setRawApplications(prev =>
      prev.map(item => {
        if (item.id !== appId) return item;

        const updatedUndertakings = item.undertakings.map(u => {
          if (u.id !== undertakingId) return u;
          return {
            ...u,
            status: decision,
            verifiedBy: getActorNameForRole(currentRole),
            verificationDate: simulatedDate,
            verificationComments: comments
          };
        });

        return {
          ...item,
          undertakings: updatedUndertakings,
          lastUpdated: simulatedDate
        };
      })
    );

    appendAudit(
      getActorNameForRole(currentRole),
      currentRole,
      `UNDERTAKING_${decision.toUpperCase().replace(' ', '_')}`,
      'Undertaking',
      undertakingId,
      `Officer recorded verification verdict: ${decision}. Remarks: ${comments}`
    );
  };

  // Propose & Confirm Lease Expiry (AI OCR demo)
  const proposeAndConfirmLeaseExpiry = (appId: string, newExpiryDate: string, confirmed: boolean) => {
    setRawApplications(prev =>
      prev.map(item => {
        if (item.id !== appId) return item;

        const updatedDocs = item.documents.map(d => {
          if (d.type !== 'Land Lease Deed') return d;
          return {
            ...d,
            expiryDate: newExpiryDate,
            officerConfirmed: confirmed,
            confirmedBy: confirmed ? getActorNameForRole(currentRole) : undefined,
            expirySource: 'AI-proposed and confirmed' as const,
            aiConfidence: 97.8,
            highlightedText: `Renewed Sub-Registrar Lease Deed Clause 2: "Valid and subsisting till ${newExpiryDate}."`
          };
        });

        return {
          ...item,
          documents: updatedDocs,
          lastUpdated: simulatedDate
        };
      })
    );

    appendAudit(
      getActorNameForRole(currentRole),
      currentRole,
      'LEASE_EXPIRY_CONFIRMED',
      'Document',
      `DOC-${appId}-LEASENEW`,
      `Renewed registered lease deed confirmed till ${newExpiryDate}. Deadline Guard updated.`
    );
  };

  // Tamper simulation
  const simulateAuditTampering = () => {
    setAuditLog(prev => {
      if (prev.length < 4) return prev;
      return prev.map((entry, idx) => {
        if (idx === 3) {
          return {
            ...entry,
            details: 'TAMPERED ILLEGALLY: Altered approval decision without quorum or authorization!',
            isTampered: true
          };
        }
        return entry;
      });
    });
    setIsTampered(true);
  };

  // Restore audit integrity
  const restoreAuditIntegrity = () => {
    setAuditLog(generateInitialAuditLog());
    setIsTampered(false);
  };

  const updateCutoffDate = (newDate: string) => {
    setCalendarConfig(prev => ({
      ...prev,
      approvalCutoffDate: newDate,
      version: `APH-2026.v${Math.floor(Math.random() * 10) + 2}`,
      lastModifiedAt: simulatedDate,
      lastModifiedBy: getActorNameForRole(currentRole)
    }));

    appendAudit(
      getActorNameForRole(currentRole),
      currentRole,
      'CUTOFF_CALENDAR_UPDATED',
      'System',
      'CALENDAR-CONFIG',
      `Statutory cutoff date updated to ${newDate}. Re-evaluating Deadline Guard across all active institutions.`
    );
  };

  // =========================================================================
  // FEATURE 1: WORKING-DAYS CALENDAR ACTIONS
  // =========================================================================
  const updateWorkingCalendar = (updated: Partial<WorkingCalendarConfig>, reason: string) => {
    setWorkingCalendar(prev => {
      const verNumber = parseFloat(prev.version.split('.v')[1] || '1.0') + 0.1;
      const nextVer = `APH-WC-2026.v${verNumber.toFixed(1)}`;
      const nextConfig: WorkingCalendarConfig = {
        ...prev,
        ...updated,
        version: nextVer,
        lastUpdated: simulatedDate,
        updatedBy: currentUser?.roleLabel || getActorNameForRole(currentRole)
      };

      appendAudit(
        currentUser?.roleLabel || getActorNameForRole(currentRole),
        currentRole,
        'UPDATE_WORKING_CALENDAR',
        'WorkingCalendar',
        nextVer,
        `Working calendar updated: ${reason}. Version advanced to ${nextVer}. Off-days: Sunday=${nextConfig.weeklyOffSunday}, 2nd/4th Saturday=${nextConfig.weeklyOffSecondFourthSaturday}, Total Holidays: ${nextConfig.holidays.length}.`
      );

      return nextConfig;
    });
  };

  const addHoliday = (holiday: { date: string; name: string }) => {
    setWorkingCalendar(prev => {
      if (prev.holidays.some(h => h.date === holiday.date)) {
        return prev;
      }
      const nextHolidays = [...prev.holidays, holiday].sort((a, b) => a.date.localeCompare(b.date));
      const verNumber = parseFloat(prev.version.split('.v')[1] || '1.0') + 0.1;
      const nextVer = `APH-WC-2026.v${verNumber.toFixed(1)}`;
      const nextConfig = {
        ...prev,
        holidays: nextHolidays,
        version: nextVer,
        lastUpdated: simulatedDate,
        updatedBy: currentUser?.roleLabel || getActorNameForRole(currentRole)
      };

      appendAudit(
        currentUser?.roleLabel || getActorNameForRole(currentRole),
        currentRole,
        'ADD_CALENDAR_HOLIDAY',
        'WorkingCalendar',
        holiday.date,
        `Gazetted holiday added: "${holiday.name}" on ${holiday.date}. Version advanced to ${nextVer}.`
      );

      return nextConfig;
    });
  };

  const removeHoliday = (date: string) => {
    setWorkingCalendar(prev => {
      const holidayToRemove = prev.holidays.find(h => h.date === date);
      const nextHolidays = prev.holidays.filter(h => h.date !== date);
      const verNumber = parseFloat(prev.version.split('.v')[1] || '1.0') + 0.1;
      const nextVer = `APH-WC-2026.v${verNumber.toFixed(1)}`;
      const nextConfig = {
        ...prev,
        holidays: nextHolidays,
        version: nextVer,
        lastUpdated: simulatedDate,
        updatedBy: currentUser?.roleLabel || getActorNameForRole(currentRole)
      };

      appendAudit(
        currentUser?.roleLabel || getActorNameForRole(currentRole),
        currentRole,
        'REMOVE_CALENDAR_HOLIDAY',
        'WorkingCalendar',
        date,
        `Holiday removed: "${holidayToRemove?.name || date}". Version advanced to ${nextVer}.`
      );

      return nextConfig;
    });
  };

  // =========================================================================
  // FEATURE 2: PRE-SUBMISSION READINESS CHECKER ACTIONS
  // =========================================================================
  const runReadinessCheckForApp = (appId: string): ReadinessCheckReport | null => {
    const app = applications.find(a => a.id === appId);
    if (!app) return null;
    const report = runReadinessCheck(app, calendarConfig);
    setReadinessReports(prev => ({ ...prev, [appId]: report }));

    appendAudit(
      currentUser?.roleLabel || app.institutionName,
      currentRole,
      'RUN_READINESS_CHECK',
      'Readiness',
      appId,
      `Pre-submission readiness check evaluated for ${app.institutionName}: ${report.overallStatus} (${report.scorePercent}% readiness score, ${report.passedCount} passed, ${report.warningCount} warnings, ${report.failedCount} failures). Advisory check.`
    );

    if (report.overallStatus === 'FAIL') {
      triggerAlert(
        `ALERT-READINESS-FAIL-${appId}-${simulatedDate.split('T')[0]}`,
        app.id,
        app.institutionName,
        app.region,
        'Readiness Check Completed',
        'institution',
        app.institutionName,
        `Readiness Advisory: ${report.failedCount} Potential Issue(s) Detected`,
        `Pre-submission check found ${report.failedCount} critical defect(s) that may cause return during official scrutiny. Please review and remediate before submission.`,
        1
      );
    }

    return report;
  };

  const submitApplicationWithReadiness = (appId: string, bypassWarning: boolean = false) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return { success: false, error: 'Application not found.' };

    const report = runReadinessCheck(app, calendarConfig);
    setReadinessReports(prev => ({ ...prev, [appId]: report }));

    if (report.failedCount > 0 && !bypassWarning) {
      return {
        success: false,
        requiresConfirmation: true,
        issuesCount: report.failedCount,
        report
      };
    }

    // Proceed with submission
    setRawApplications(prev =>
      prev.map(a => {
        if (a.id === appId) {
          const historyItem = {
            stage: 'Submitted' as StageName,
            startedAt: simulatedDate,
            actor: currentUser?.roleLabel || a.institutionName,
            actorRole: 'institution' as UserRole,
            outcome: 'Formally Submitted',
            comments: bypassWarning
              ? `Submitted by institution despite ${report.failedCount} advisory warning(s). Readiness score: ${report.scorePercent}%.`
              : `Submitted with 100% readiness pass score.`
          };
          return {
            ...a,
            currentStage: 'Submitted' as StageName,
            lastUpdated: simulatedDate,
            stageHistory: [...a.stageHistory, historyItem]
          };
        }
        return a;
      })
    );

    appendAudit(
      currentUser?.roleLabel || app.institutionName,
      'institution',
      'SUBMIT_APPLICATION',
      'Application',
      appId,
      `Application formally submitted to AICTE for 2026-2027 approval. Pre-submission readiness score: ${report.scorePercent}%. Advisory warning bypass: ${bypassWarning ? 'YES' : 'NO'}.`
    );

    return { success: true, report };
  };

  // =========================================================================
  // FEATURE 3: OFFICER DELEGATION AND LEAVE ACTIONS
  // =========================================================================
  const markOfficerUnavailable = (
    officerName: string,
    officerRole: UserRole,
    region: Region,
    startDate: string,
    endDate: string,
    delegateName: string,
    reason: string
  ) => {
    if (!officerName || !delegateName || !startDate || !endDate) {
      return { success: false, error: 'Officer name, delegate, start date, and end date are required.' };
    }
    if (startDate > endDate) {
      return { success: false, error: 'Start date cannot be after end date.' };
    }
    if (officerName === delegateName) {
      return { success: false, error: 'Delegate must be a different officer.' };
    }

    const leaveId = `LEAVE-${Date.now()}`;
    const newLeave: OfficerLeaveRecord = {
      id: leaveId,
      officerName,
      officerRole,
      region,
      startDate,
      endDate,
      reason,
      delegateName,
      status: 'ACTIVE',
      createdAt: simulatedDate
    };

    setOfficerLeaves(prev => [...prev, newLeave]);

    appendAudit(
      currentUser?.roleLabel || officerName,
      currentRole,
      'OFFICER_LEAVE_DELEGATED',
      'Delegation',
      leaveId,
      `Officer ${officerName} marked unavailable from ${startDate} to ${endDate}. Workload delegated to ${delegateName} (${region} region). Reason: ${reason}.`
    );

    triggerAlert(
      `ALT-DELEGATE-${leaveId}`,
      'DELEGATION',
      'Regional Office',
      region,
      'Officer Delegated',
      officerRole,
      delegateName,
      `Workload Delegated: ${officerName} on Leave`,
      `You have been assigned as the official delegate for ${officerName} from ${startDate} to ${endDate}. Their queue items are now active in your dashboard.`,
      1
    );

    triggerAlert(
      `ALT-DELEGATE-SUPERVISOR-${leaveId}`,
      'DELEGATION',
      'Regional Office',
      region,
      'Officer Delegated',
      'regional_officer',
      'Dr. P. R. Joshi (Regional Officer)',
      `Leave & Delegation Notice: ${officerName}`,
      `Officer ${officerName} is on leave until ${endDate}. Workload has been reassigned to ${delegateName}.`,
      1
    );

    return { success: true };
  };

  const cancelOfficerLeave = (leaveId: string) => {
    setOfficerLeaves(prev =>
      prev.map(l => (l.id === leaveId ? { ...l, status: 'CANCELLED' as const } : l))
    );
    appendAudit(
      currentUser?.roleLabel || 'Supervisor',
      currentRole,
      'CANCEL_OFFICER_LEAVE',
      'Delegation',
      leaveId,
      `Officer leave record ${leaveId} cancelled. Queue routing restored to original officer.`
    );
  };

  // =========================================================================
  // FEATURE 4: DEFICIENCY CLOSURE TRACKER ACTIONS
  // =========================================================================
  useEffect(() => {
    const milestones = evaluateDeficiencyReminders(deficiencies, simulatedDate);
    milestones.forEach(item => {
      if (item.actionRequired !== 'NONE') {
        const isEscalation = item.actionRequired.startsWith('ESCALATE');
        const def = item.deficiency;
        triggerAlert(
          `ALT-DEF-${def.id}-${item.actionRequired}-${simulatedDate.split('T')[0]}`,
          def.id,
          def.institutionName,
          def.region,
          isEscalation ? 'Deficiency Overdue' : 'Deficiency Due',
          isEscalation ? 'regional_officer' : 'institution',
          isEscalation ? 'Dr. P. R. Joshi (Regional Officer)' : def.institutionName,
          isEscalation ? `Deficiency Escalation: ${def.institutionName}` : `Deficiency Reminder: ${def.institutionName}`,
          `Deficiency "${def.description}" milestone reached (${item.actionRequired}). Due on ${def.dueDate} (${item.daysToDue} days relative).`,
          isEscalation ? 2 : 0
        );
      }
    });
  }, [simulatedDate, deficiencies, triggerAlert]);

  const recordDeficiencyResponse = (deficiencyId: string, responseText: string, evidenceFileName: string) => {
    setDeficiencies(prev =>
      prev.map(d => {
        if (d.id === deficiencyId) {
          const evt = {
            id: `EVT-${Date.now()}`,
            timestamp: simulatedDate,
            actor: currentUser?.roleLabel || d.institutionName,
            actorRole: 'institution' as UserRole,
            action: 'Institution Submitted Deficiency Rectification Evidence',
            remarks: responseText,
            evidenceName: evidenceFileName
          };
          return {
            ...d,
            status: 'Institution responded' as const,
            timeline: [...d.timeline, evt]
          };
        }
        return d;
      })
    );

    appendAudit(
      currentUser?.roleLabel || 'Institution Registrar',
      'institution',
      'SUBMIT_DEFICIENCY_RESPONSE',
      'Deficiency',
      deficiencyId,
      `Rectification response submitted for deficiency ${deficiencyId}. Evidence document: "${evidenceFileName}". Remarks: "${responseText}".`
    );
  };

  const verifyDeficiency = (deficiencyId: string, decision: 'Accepted' | 'Query' | 'Rejected', remarks: string) => {
    setDeficiencies(prev =>
      prev.map(d => {
        if (d.id === deficiencyId) {
          const nextStatus = 
            decision === 'Accepted' ? 'Accepted' as const :
            decision === 'Query' ? 'Query Raised' as const : 'Rejected' as const;
          const evt = {
            id: `EVT-${Date.now()}`,
            timestamp: simulatedDate,
            actor: currentUser?.roleLabel || 'Scrutiny Officer',
            actorRole: currentRole,
            action: `Scrutiny Officer Verification: ${decision}`,
            remarks
          };
          return {
            ...d,
            status: nextStatus,
            timeline: [...d.timeline, evt]
          };
        }
        return d;
      })
    );

    appendAudit(
      currentUser?.roleLabel || 'Scrutiny Officer',
      currentRole,
      'VERIFY_DEFICIENCY',
      'Deficiency',
      deficiencyId,
      `Deficiency ${deficiencyId} verification determination recorded: ${decision}. Remarks: ${remarks}.`
    );
  };

  const sendDeficiencyToHearing = (deficiencyId: string, hearingDate: string, hearingCommittee: string) => {
    setDeficiencies(prev =>
      prev.map(d => {
        if (d.id === deficiencyId) {
          const evt = {
            id: `EVT-${Date.now()}`,
            timestamp: simulatedDate,
            actor: currentUser?.roleLabel || 'Regional Officer',
            actorRole: currentRole,
            action: `Sent to Standing Hearing Committee (SHC)`,
            remarks: `Hearing scheduled on ${hearingDate} before ${hearingCommittee}.`
          };
          return {
            ...d,
            status: 'Sent to hearing' as const,
            hearingDate,
            timeline: [...d.timeline, evt]
          };
        }
        return d;
      })
    );

    appendAudit(
      currentUser?.roleLabel || 'Regional Officer',
      currentRole,
      'DEFICIENCY_SENT_TO_HEARING',
      'Deficiency',
      deficiencyId,
      `Deficiency ${deficiencyId} escalated to Standing Hearing Committee for ${hearingDate}. Committee: ${hearingCommittee}.`
    );
  };

  const recordHearingOutcome = (deficiencyId: string, outcome: 'Closed' | 'Deficiency Maintained', remarks: string) => {
    setDeficiencies(prev =>
      prev.map(d => {
        if (d.id === deficiencyId) {
          const nextStatus = outcome === 'Closed' ? 'Closed' as const : 'Hearing outcome recorded' as const;
          const evt = {
            id: `EVT-${Date.now()}`,
            timestamp: simulatedDate,
            actor: currentUser?.roleLabel || 'SAC/SHC Hearing Committee',
            actorRole: currentRole,
            action: `Statutory Hearing Outcome Recorded: ${outcome}`,
            remarks
          };
          return {
            ...d,
            status: nextStatus,
            hearingOutcome: outcome,
            timeline: [...d.timeline, evt]
          };
        }
        return d;
      })
    );

    appendAudit(
      currentUser?.roleLabel || 'SAC/SHC Committee Chair',
      currentRole,
      'RECORD_HEARING_OUTCOME',
      'Deficiency',
      deficiencyId,
      `Statutory hearing outcome recorded by authorized officer: "${outcome}". Remarks: ${remarks}. System does not decide outcome.`
    );
  };

  const sendDeficiencyReminder = (deficiencyId: string) => {
    const def = deficiencies.find(d => d.id === deficiencyId);
    if (!def) return;

    setDeficiencies(prev =>
      prev.map(d => (d.id === deficiencyId ? { ...d, lastReminderSentAt: simulatedDate } : d))
    );

    triggerAlert(
      `ALT-DEF-MANUAL-REMINDER-${deficiencyId}-${simulatedDate.split('T')[0]}`,
      deficiencyId,
      def.institutionName,
      def.region,
      'Deficiency Due',
      'institution',
      def.institutionName,
      `Urgent Statutory Reminder: Rectify Deficiency ${deficiencyId}`,
      `Formal reminder issued for pending deficiency "${def.description}". Statutory submission due on ${def.dueDate}.`,
      def.escalationLevel
    );

    appendAudit(
      currentUser?.roleLabel || 'Regional Officer',
      currentRole,
      'SEND_DEFICIENCY_REMINDER',
      'Deficiency',
      deficiencyId,
      `Manual deficiency reminder dispatched to ${def.institutionName} for ${deficiencyId}. Due date: ${def.dueDate}.`
    );
  };

  const escalateDeficiency = (deficiencyId: string) => {
    const def = deficiencies.find(d => d.id === deficiencyId);
    if (!def) return;

    const nextEscLevel = Math.min((def.escalationLevel || 0) + 1, 3);
    setDeficiencies(prev =>
      prev.map(d => {
        if (d.id === deficiencyId) {
          const evt = {
            id: `EVT-${Date.now()}`,
            timestamp: simulatedDate,
            actor: currentUser?.roleLabel || 'Regional Scrutiny Committee',
            actorRole: currentRole,
            action: `Deficiency Escalation Level Raised to Level ${nextEscLevel}`,
            remarks: `Overdue escalation triggered to Regional Officer and Bureau Adviser.`
          };
          return {
            ...d,
            escalationLevel: nextEscLevel,
            timeline: [...d.timeline, evt]
          };
        }
        return d;
      })
    );

    triggerAlert(
      `ALT-DEF-ESCALATE-${deficiencyId}-LVL${nextEscLevel}`,
      deficiencyId,
      def.institutionName,
      def.region,
      'Deficiency Overdue',
      'regional_officer',
      'Dr. P. R. Joshi (Regional Officer)',
      `Deficiency Escalation Level ${nextEscLevel}: ${def.institutionName}`,
      `Deficiency "${def.description}" has exceeded timeline by ${def.daysOpen} days. Escalated to statutory leadership.`,
      nextEscLevel
    );

    appendAudit(
      currentUser?.roleLabel || 'Regional Scrutiny Officer',
      currentRole,
      'ESCALATE_DEFICIENCY',
      'Deficiency',
      deficiencyId,
      `Deficiency ${deficiencyId} escalated to Level ${nextEscLevel}. Days open: ${def.daysOpen}. Alerts routed to Regional Officer.`
    );
  };

  // =========================================================================
  // FEATURE 5: CSV BULK IMPORT ACTIONS
  // =========================================================================
  const importApplicationsFromCsv = async (csvContent: string, fileName: string) => {
    const adapter = new CsvAdapter();
    const fileBytes = typeof Blob !== 'undefined' ? new Blob([csvContent]).size : Buffer.byteLength(csvContent, 'utf8');
    const metaCheck = adapter.validateFileMeta(fileName, fileBytes);
    if (!metaCheck.valid) {
      return {
        success: false,
        totalRows: 0,
        validCount: 0,
        invalidCount: 0,
        errors: [{ rowNumber: 1, recordIdentifier: fileName, field: 'file', reason: metaCheck.error || 'Invalid file format or size.' }]
      };
    }

    const result = await adapter.importApplications(csvContent);
    if (result.validRecords.length > 0) {
      setRawApplications(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newApps: Application[] = result.validRecords
          .filter(r => !existingIds.has(r.id!))
          .map(rec => {
            const baseApp: Application = {
              id: rec.id!,
              applicationNumber: rec.applicationNumber || rec.id!,
              institutionId: rec.aictePermanentId || '1-9999999',
              institutionName: rec.institutionName || 'Imported Technical College',
              aictePermanentId: rec.aictePermanentId || '1-9999999',
              region: rec.region || 'Western',
              state: rec.state || 'Maharashtra',
              type: rec.type || 'Extension of Approval (EoA)',
              route: rec.route || 'Scrutiny + EVC',
              routeVersion: 'APH-2026.v1',
              currentStage: rec.currentStage || 'Scrutiny',
              submissionDate: rec.submissionDate || simulatedDate.split('T')[0],
              approvedIntake: rec.approvedIntake ?? 360,
              assignedOfficer: rec.assignedOfficer || 'Dr. R. Sharma (AICTE RO)',
              supervisor: 'Dr. P. R. Joshi (RO Western)',
              lastUpdated: simulatedDate,
              stageHistory: [
                {
                  stage: rec.currentStage || 'Scrutiny',
                  startedAt: simulatedDate,
                  actor: 'AICTE CSV Bulk Ingestion Adapter',
                  actorRole: 'system_admin',
                  outcome: 'Imported via CSV',
                  comments: `Imported from verified CSV batch "${fileName}"`
                }
              ],
              observations: [],
              undertakings: [],
              documents: [
                {
                  id: `DOC-${Date.now()}-1`,
                  type: 'Land Lease Deed',
                  filename: 'Registered_Lease_Deed.pdf',
                  fileSize: '4.2 MB',
                  uploadDate: simulatedDate.split('T')[0],
                  expiryDate: '2045-03-31',
                  remainingDays: 7000,
                  validityStatus: 'Valid',
                  expirySource: 'AI-proposed and confirmed',
                  officerConfirmed: true
                }
              ],
              riskStatus: 'On track',
              delayRiskScore: 20,
              latestSafeDateForCurrentStage: calendarConfig.approvalCutoffDate,
              daysRemainingInStage: 45,
              daysToApprovalCutoff: 65,
              riskReasons: [],
              complianceHealthScore: 85
            };

            const dg = evaluateDeadlineGuard(baseApp, simulatedDate, calendarConfig, workingCalendar, deficiencies);
            return { ...baseApp, ...dg };
          });

        return [...newApps, ...prev];
      });
    }

    let errorReportCsv: string | undefined;
    if (result.errors.length > 0) {
      errorReportCsv = 'Row Number,Record Identifier,Failed Field,Rejection Reason\n' +
        result.errors.map(e => `${e.rowNumber},"${e.recordIdentifier}","${e.field}","${e.reason.replace(/"/g, '""')}"`).join('\n');
    }

    appendAudit(
      currentUser?.roleLabel || 'System Administrator',
      currentRole,
      'CSV_BULK_DATA_IMPORT',
      'DataImport',
      fileName,
      `CSV bulk batch processed: "${fileName}". Total rows: ${result.totalRows}, Valid rows imported: ${result.validCount}, Invalid rows flagged: ${result.invalidCount}. File contents omitted for privacy & statutory data security.`
    );

    return {
      success: result.success,
      totalRows: result.totalRows,
      validCount: result.validCount,
      invalidCount: result.invalidCount,
      errors: result.errors,
      errorReportCsv
    };
  };

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <AppContext.Provider
      value={{
        applications,
        simulatedDate,
        calendarConfig,
        currentRole,
        currentRegion,
        language,
        auditLog,
        alerts,
        chainIntegrity,
        selectedAppId,
        t,
        isTampered,
        theme,
        isAuthenticated,
        currentUser,
        login,
        logout,
        setRole: setCurrentRole,
        setRegion: setCurrentRegion,
        setLanguage,
        setSelectedAppId,
        setTheme,
        toggleTheme,
        advanceSimulatedDate,
        jumpToSixtyDaysBeforeCutoff,
        resetSimulation,
        moveToNextStage,
        returnApplication,
        recordStatutoryDecision,
        scheduleEVC,
        resolveEVCConflict,
        completeEVCVisit,
        submitUndertakingEvidence,
        verifyUndertaking,
        proposeAndConfirmLeaseExpiry,
        simulateAuditTampering,
        restoreAuditIntegrity,
        updateCutoffDate,
        // Feature 1: Working-Days Calendar
        workingCalendar,
        updateWorkingCalendar,
        addHoliday,
        removeHoliday,
        // Feature 2: Pre-Submission Readiness Checker
        readinessReports,
        runReadinessCheckForApp,
        submitApplicationWithReadiness,
        // Feature 3: Officer Delegation and Leave
        officerLeaves,
        queueCoverageSummaries,
        effectiveApplications,
        markOfficerUnavailable,
        cancelOfficerLeave,
        // Feature 4: Deficiency Closure Tracker
        deficiencies,
        recordDeficiencyResponse,
        verifyDeficiency,
        sendDeficiencyToHearing,
        recordHearingOutcome,
        sendDeficiencyReminder,
        escalateDeficiency,
        // Feature 5: CSV Bulk Import and Integration Adapter
        dataQualityMetrics,
        importApplicationsFromCsv
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

function getActorNameForRole(role: UserRole): string {
  switch (role) {
    case 'institution':
      return 'Registrar (Technical Institution)';
    case 'scrutiny_officer':
      return 'Anil Verma (Scrutiny Officer, AICTE)';
    case 'regional_officer':
      return 'Dr. P. R. Joshi (Regional Officer, Western)';
    case 'bureau_officer':
      return 'Dr. V. K. Sharma (Adviser, Regulation Bureau)';
    case 'evc_coordinator':
      return 'EVC Committee Coordinator';
    case 'competent_authority':
      return 'Dr. T. G. Sitharam (Chairman / Member Secretary, AICTE)';
    case 'system_admin':
      return 'System Administrator (Regulation IT)';
    default:
      return 'Authorized User';
  }
}
