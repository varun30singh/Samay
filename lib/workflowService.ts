import { prisma } from '@/lib/prisma';
import { application_stage, deficiency_status, deficiency_severity } from '@prisma/client';
import { AuthenticatedUser } from '@/lib/serverAuth';
import { recordAuditEvent } from '@/lib/auditService';
import { createAlert } from '@/lib/notificationService';

export interface TransitionRule {
  from: application_stage;
  to: application_stage;
  allowedRoles: string[];
}

export const WORKFLOW_TRANSITION_RULES: TransitionRule[] = [
  { from: 'draft', to: 'submitted', allowedRoles: ['applicant', 'institution', 'institution_admin'] },
  { from: 'submitted', to: 'under_scrutiny', allowedRoles: ['scrutiny_officer', 'regional_officer', 'admin', 'system_admin'] },
  { from: 'under_scrutiny', to: 'deficiency_raised', allowedRoles: ['scrutiny_officer', 'regional_officer', 'admin', 'system_admin'] },
  { from: 'under_scrutiny', to: 'ready_for_evc', allowedRoles: ['scrutiny_officer', 'regional_officer', 'admin', 'system_admin'] },
  { from: 'under_scrutiny', to: 'under_final_review', allowedRoles: ['scrutiny_officer', 'regional_officer', 'admin', 'system_admin'] },
  { from: 'deficiency_raised', to: 'resubmitted', allowedRoles: ['applicant', 'institution', 'institution_admin'] },
  { from: 'resubmitted', to: 'under_scrutiny', allowedRoles: ['scrutiny_officer', 'regional_officer', 'admin', 'system_admin'] },
  { from: 'ready_for_evc', to: 'evc_scheduled', allowedRoles: ['evc_coordinator', 'regional_officer', 'admin', 'system_admin'] },
  { from: 'evc_scheduled', to: 'evc_completed', allowedRoles: ['evc_coordinator', 'regional_officer', 'admin', 'system_admin'] },
  { from: 'evc_completed', to: 'under_final_review', allowedRoles: ['scrutiny_officer', 'regional_officer', 'admin', 'system_admin'] },
  { from: 'under_final_review', to: 'approved', allowedRoles: ['competent_authority', 'approving_authority'] },
  { from: 'under_final_review', to: 'rejected', allowedRoles: ['competent_authority', 'approving_authority'] },
  // Universal withdrawal allowed before final decision
  { from: 'draft', to: 'withdrawn', allowedRoles: ['applicant', 'institution', 'institution_admin'] },
  { from: 'submitted', to: 'withdrawn', allowedRoles: ['applicant', 'institution', 'institution_admin'] },
  { from: 'under_scrutiny', to: 'withdrawn', allowedRoles: ['applicant', 'institution', 'institution_admin'] },
  { from: 'deficiency_raised', to: 'withdrawn', allowedRoles: ['applicant', 'institution', 'institution_admin'] },
  { from: 'resubmitted', to: 'withdrawn', allowedRoles: ['applicant', 'institution', 'institution_admin'] },
  { from: 'ready_for_evc', to: 'withdrawn', allowedRoles: ['applicant', 'institution', 'institution_admin'] },
  { from: 'evc_scheduled', to: 'withdrawn', allowedRoles: ['applicant', 'institution', 'institution_admin'] },
  { from: 'under_final_review', to: 'withdrawn', allowedRoles: ['applicant', 'institution', 'institution_admin'] },
];

let cachedDynamicRules: TransitionRule[] | null = null;
let lastRulesCacheTime = 0;
const RULES_CACHE_TTL_MS = 30000;

export async function getActiveWorkflowRules(): Promise<{ rules: TransitionRule[]; version: string; source: string; updatedAt?: string }> {
  const now = Date.now();
  if (cachedDynamicRules && (now - lastRulesCacheTime < RULES_CACHE_TTL_MS)) {
    return { rules: cachedDynamicRules, version: 'dynamic', source: 'cache' };
  }

  try {
    const setting = await prisma.system_settings.findUnique({
      where: { setting_key: 'workflow_rules' }
    });
    if (setting && setting.setting_value && typeof setting.setting_value === 'object') {
      const val = setting.setting_value as { rules?: TransitionRule[]; version?: string; updatedAt?: string };
      if (Array.isArray(val.rules) && val.rules.length > 0) {
        cachedDynamicRules = val.rules;
        lastRulesCacheTime = now;
        return {
          rules: val.rules,
          version: val.version || '1.1.0',
          source: 'database',
          updatedAt: val.updatedAt || setting.updated_at.toISOString()
        };
      }
    }
  } catch (err) {
    console.warn('[WorkflowService] Could not read workflow_rules from system_settings, using defaults:', err);
  }

  return { rules: WORKFLOW_TRANSITION_RULES, version: '1.0.0', source: 'default' };
}

export function invalidateWorkflowRulesCache() {
  cachedDynamicRules = null;
  lastRulesCacheTime = 0;
}

export function canTransition(
  currentStage: application_stage,
  targetStage: application_stage,
  role: string,
  rulesList?: TransitionRule[]
): { allowed: boolean; reason?: string } {
  const activeRules = rulesList || cachedDynamicRules || WORKFLOW_TRANSITION_RULES;
  const rule = activeRules.find(
    r => r.from === currentStage && r.to === targetStage
  );

  if (!rule) {
    return {
      allowed: false,
      reason: `Transition from stage "${currentStage}" to "${targetStage}" is not a valid regulatory workflow path.`
    };
  }

  const roleNormalized = role.toLowerCase();
  const roleAliases: Record<string, string[]> = {
    admin: ['system_admin', 'admin'],
    system_admin: ['system_admin', 'admin'],
    competent_authority: ['competent_authority', 'approving_authority'],
    approving_authority: ['competent_authority', 'approving_authority'],
    institution: ['institution', 'applicant', 'institution_admin'],
    institution_admin: ['institution', 'applicant', 'institution_admin'],
    applicant: ['institution', 'applicant', 'institution_admin'],
    scrutiny_officer: ['scrutiny_officer'],
    regional_officer: ['regional_officer'],
    bureau_officer: ['bureau_officer'],
    evc_coordinator: ['evc_coordinator', 'expert'],
    expert: ['evc_coordinator', 'expert']
  };
  const userRoles = roleAliases[roleNormalized] || [roleNormalized];
  const hasRole = rule.allowedRoles.some(allowed => userRoles.includes(allowed));

  if (!hasRole) {
    return {
      allowed: false,
      reason: `Role "${role}" does not have authority to execute transition "${currentStage}" -> "${targetStage}". Required roles: ${rule.allowedRoles.join(', ')}.`
    };
  }

  return { allowed: true };
}

/**
 * Executes a transactional workflow stage transition with full audit logging and alert delivery.
 */
export async function transitionApplicationStage(params: {
  applicationId: string;
  targetStage: application_stage;
  actor: AuthenticatedUser;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  const { applicationId, targetStage, actor, reason, metadata } = params;

  // 1. Fetch current application state
  const app = await prisma.applications.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      application_number: true,
      stage: true,
      institution_id: true,
      submitted_by: true,
      institutions: { select: { id: true, region: true, legal_name: true } }
    }
  });

  if (!app) {
    throw new Error('Application not found');
  }

  // 2. Enforce tenant isolation for the actor
  if (actor.role === 'applicant' || actor.role === 'institution' || actor.role === 'institution_admin') {
    if (actor.institutionId && actor.institutionId !== app.institution_id) {
      throw new Error('Forbidden: Cannot modify an application belonging to another institution');
    }
    if (!actor.institutionId && actor.userId !== app.submitted_by) {
      throw new Error('Forbidden: Cannot modify an application not submitted by your account');
    }
  } else if (actor.role === 'regional_officer') {
    if (!actor.region || actor.region !== app.institutions.region) {
      throw new Error('Forbidden: Application belongs to outside your assigned regional jurisdiction');
    }
  }

  // 3. Validate transition rules
  const { rules: activeRules } = await getActiveWorkflowRules();
  const check = canTransition(app.stage, targetStage, actor.role, activeRules);
  if (!check.allowed) {
    throw new Error(check.reason);
  }

  const now = new Date();
  const isFinalDecision = targetStage === 'approved' || targetStage === 'rejected';

  // 4. Perform transactional database updates
  const updatedApp = await prisma.$transaction(async tx => {
    // A. Update application record
    const updated = await tx.applications.update({
      where: { id: applicationId },
      data: {
        stage: targetStage,
        last_action_at: now,
        ...(isFinalDecision
          ? {
              final_decision_at: now,
              final_decision_by: actor.userId,
              decision_reason: reason || `Decision: ${targetStage}`,
              decision_reference: `DEC-${app.application_number}-${Date.now().toString().slice(-4)}`
            }
          : {})
      }
    });

    // B. Record stage history
    await tx.application_stage_history.create({
      data: {
        application_id: applicationId,
        previous_stage: app.stage,
        new_stage: targetStage,
        changed_by: actor.userId,
        reason: reason || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (metadata || {}) as any
      }
    });

    return updated;
  });

  // 5. Audit Logging
  await recordAuditEvent({
    actorId: actor.userId,
    actorName: `${actor.role}:${actor.userId}`,
    action: `STAGE_TRANSITION_${app.stage.toUpperCase()}_TO_${targetStage.toUpperCase()}`,
    entityType: 'Application',
    entityId: applicationId,
    payload: {
      applicationNumber: app.application_number,
      previousStage: app.stage,
      newStage: targetStage,
      reason: reason || null,
      metadata: metadata || null
    }
  });

  // 6. Generate Alert for Applicant or Officer
  if (app.submitted_by) {
    await createAlert({
      recipientId: app.submitted_by,
      applicationId: app.id,
      title: `Application Stage Updated: ${targetStage.replace(/_/g, ' ').toUpperCase()}`,
      message: `Application ${app.application_number} transitioned from "${app.stage}" to "${targetStage}". ${reason ? `Reason: ${reason}` : ''}`,
      alertType: 'stage_transition'
    });
  }

  return updatedApp;
}

/**
 * Records a formal regulatory deficiency and transitions application to deficiency_raised.
 */
export async function raiseApplicationDeficiency(params: {
  applicationId: string;
  title: string;
  description: string;
  severity?: deficiency_severity;
  dueAt?: Date;
  actor: AuthenticatedUser;
}) {
  const { applicationId, title, description, severity, dueAt, actor } = params;

  const app = await prisma.applications.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      application_number: true,
      institution_id: true,
      submitted_by: true,
      stage: true,
      institutions: { select: { region: true } }
    }
  });

  if (!app) throw new Error('Application not found');

  if (actor.role === 'regional_officer' && actor.region !== app.institutions.region) {
    throw new Error('Forbidden: Application is outside your regional jurisdiction');
  }

  // Create deficiency and transition stage transactionally
  const result = await prisma.$transaction(async tx => {
    const deficiency = await tx.deficiencies.create({
      data: {
        application_id: applicationId,
        institution_id: app.institution_id,
        title,
        description,
        severity: severity || deficiency_severity.medium,
        status: deficiency_status.open,
        raised_by: actor.userId,
        due_at: dueAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Default 14 statutory days
      }
    });

    // Create initial timeline event
    await tx.deficiency_timeline.create({
      data: {
        deficiency_id: deficiency.id,
        actor_id: actor.userId,
        event_type: 'deficiency_raised',
        comment: description
      }
    });

    // Update application stage if under scrutiny
    if (app.stage === 'under_scrutiny' || app.stage === 'resubmitted') {
      await tx.applications.update({
        where: { id: applicationId },
        data: {
          stage: 'deficiency_raised',
          last_action_at: new Date()
        }
      });

      await tx.application_stage_history.create({
        data: {
          application_id: applicationId,
          previous_stage: app.stage,
          new_stage: 'deficiency_raised',
          changed_by: actor.userId,
          reason: `Deficiency raised: ${title}`
        }
      });
    }

    return deficiency;
  });

  // Log audit
  await recordAuditEvent({
    actorId: actor.userId,
    action: 'DEFICIENCY_RAISED',
    entityType: 'Deficiency',
    entityId: result.id,
    payload: { applicationId, title, description, severity }
  });

  // Alert applicant
  if (app.submitted_by) {
    await createAlert({
      recipientId: app.submitted_by,
      applicationId: app.id,
      deficiencyId: result.id,
      title: `Deficiency Raised: ${title}`,
      message: `A compliance deficiency has been recorded for application ${app.application_number}. Prompt rectification is required.`,
      alertType: 'deficiency_raised'
    });
  }

  return result;
}

/**
 * Records an institution's response to a deficiency and advances application to resubmitted.
 */
export async function respondToDeficiency(params: {
  deficiencyId: string;
  responseComment: string;
  attachments?: unknown[];
  actor: AuthenticatedUser;
}) {
  const { deficiencyId, responseComment, attachments, actor } = params;

  const def = await prisma.deficiencies.findUnique({
    where: { id: deficiencyId },
    include: {
      applications: {
        select: {
          id: true,
          application_number: true,
          stage: true,
          assigned_officer_id: true,
          institution_id: true,
          submitted_by: true
        }
      }
    }
  });

  if (!def) throw new Error('Deficiency not found');

  if (actor.role === 'applicant' || actor.role === 'institution' || actor.role === 'institution_admin') {
    if (actor.institutionId && actor.institutionId !== def.institution_id) {
      throw new Error('Forbidden: Cannot respond to deficiency of another institution');
    }
  }

  const result = await prisma.$transaction(async tx => {
    // 1. Update deficiency status
    const updatedDef = await tx.deficiencies.update({
      where: { id: deficiencyId },
      data: {
        status: deficiency_status.responded,
        updated_at: new Date()
      }
    });

    // 2. Append timeline entry
    await tx.deficiency_timeline.create({
      data: {
        deficiency_id: deficiencyId,
        actor_id: actor.userId,
        event_type: 'institution_responded',
        comment: responseComment,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attachments: (attachments || []) as any
      }
    });

    // 3. Check if all deficiencies are responded; if so, move stage to resubmitted
    const openDeficiencies = await tx.deficiencies.count({
      where: {
        application_id: def.application_id,
        status: deficiency_status.open
      }
    });

    if (openDeficiencies === 0 && def.applications.stage === 'deficiency_raised') {
      await tx.applications.update({
        where: { id: def.application_id },
        data: {
          stage: 'resubmitted',
          last_action_at: new Date()
        }
      });

      await tx.application_stage_history.create({
        data: {
          application_id: def.application_id,
          previous_stage: 'deficiency_raised',
          new_stage: 'resubmitted',
          changed_by: actor.userId,
          reason: 'All open deficiencies responded by institution.'
        }
      });
    }

    return updatedDef;
  });

  // Audit event
  await recordAuditEvent({
    actorId: actor.userId,
    action: 'DEFICIENCY_RESPONDED',
    entityType: 'Deficiency',
    entityId: deficiencyId,
    payload: { responseComment }
  });

  // Alert assigned officer
  if (def.applications.assigned_officer_id) {
    await createAlert({
      recipientId: def.applications.assigned_officer_id,
      applicationId: def.application_id,
      deficiencyId: def.id,
      title: `Deficiency Responded: ${def.title}`,
      message: `The institution responded to deficiency for application ${def.applications.application_number}. Ready for review.`,
      alertType: 'deficiency_response'
    });
  }

  return result;
}
