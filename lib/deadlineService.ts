import { prisma } from '@/lib/prisma';
import { getWorkingDaysDiff } from '@/lib/workingCalendar';

export interface ApplicationDeadlineStatus {
  applicationId: string;
  applicationNumber: string;
  stage: string;
  submissionDate: Date | null;
  statutoryDeadline: Date | null;
  workingDaysLeft: number;
  calendarDaysLeft: number;
  isOverdue: boolean;
  isDueSoon: boolean; // within 7 working days
  riskLevel: 'normal' | 'moderate' | 'high' | 'critical';
}

/**
 * Calculates deadline metrics for an application given current system time.
 */
export function evaluateDeadlineMetrics(
  app: {
    id: string;
    application_number: string;
    stage: string;
    submitted_at: Date | null;
    statutory_deadline: Date | null;
    created_at: Date;
  },
  referenceDate: Date = new Date()
): ApplicationDeadlineStatus {
  // If statutory deadline is not specified, default to April 30 of academic year
  const deadline = app.statutory_deadline
    ? new Date(app.statutory_deadline)
    : new Date(`${referenceDate.getFullYear()}-04-30T23:59:59Z`);

  const now = referenceDate;
  const isPastDeadline = now.getTime() > deadline.getTime();
  const calendarDaysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const workingDaysLeft = isPastDeadline ? 0 : getWorkingDaysDiff(now, deadline);

  const isOverdue = calendarDaysLeft < 0;
  const isDueSoon = !isOverdue && workingDaysLeft <= 7;

  let riskLevel: ApplicationDeadlineStatus['riskLevel'] = 'normal';
  if (isOverdue) {
    riskLevel = 'critical';
  } else if (workingDaysLeft <= 3) {
    riskLevel = 'high';
  } else if (workingDaysLeft <= 7) {
    riskLevel = 'moderate';
  }

  return {
    applicationId: app.id,
    applicationNumber: app.application_number,
    stage: app.stage,
    submissionDate: app.submitted_at || app.created_at,
    statutoryDeadline: deadline,
    workingDaysLeft,
    calendarDaysLeft,
    isOverdue,
    isDueSoon,
    riskLevel
  };
}

/**
 * Evaluates all pending applications in the database and identifies overdue or approaching deadlines.
 */
export async function scanPendingDeadlines(referenceDate: Date = new Date()) {
  const pendingApps = await prisma.applications.findMany({
    where: {
      stage: {
        notIn: ['approved', 'rejected', 'withdrawn', 'closed']
      }
    },
    select: {
      id: true,
      application_number: true,
      stage: true,
      submitted_at: true,
      statutory_deadline: true,
      assigned_officer_id: true,
      submitted_by: true,
      institution_id: true,
      created_at: true
    }
  });

  const evaluations: ApplicationDeadlineStatus[] = [];
  for (const app of pendingApps) {
    evaluations.push(evaluateDeadlineMetrics(app, referenceDate));
  }

  return evaluations;
}
