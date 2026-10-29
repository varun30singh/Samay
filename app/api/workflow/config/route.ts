import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';
import { application_stage } from '@prisma/client';
import {
  getActiveWorkflowRules,
  invalidateWorkflowRulesCache,
  TransitionRule
} from '@/lib/workflowService';
import { recordAuditEvent } from '@/lib/auditService';

const VALID_STAGES = Object.values(application_stage);

export async function GET(request: NextRequest) {
  const auth = await validateServerAuth(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.status || 401 }
    );
  }

  try {
    const active = await getActiveWorkflowRules();
    return NextResponse.json({
      success: true,
      version: active.version,
      source: active.source,
      updatedAt: active.updatedAt || new Date().toISOString(),
      stages: VALID_STAGES,
      rules: active.rules,
      isDefault: active.source === 'default'
    });
  } catch (err) {
    console.error('[API workflow config GET error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to retrieve workflow configuration' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await validateServerAuth(request, ['admin', 'system_admin']);
  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Forbidden: Administrator privileges required to configure regulatory workflow engine' },
      { status: auth.status || 403 }
    );
  }

  try {
    const body = await request.json();
    const { rules, version, reason } = body;

    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: rules must be a non-empty array of transition definitions' },
        { status: 400 }
      );
    }

    // Validate each transition rule
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (!r || typeof r !== 'object') {
        return NextResponse.json(
          { success: false, error: `Invalid rule at index ${i}: rule must be an object` },
          { status: 400 }
        );
      }
      if (!VALID_STAGES.includes(r.from)) {
        return NextResponse.json(
          { success: false, error: `Invalid rule at index ${i}: "from" stage "${r.from}" is not a valid regulatory stage` },
          { status: 400 }
        );
      }
      if (!VALID_STAGES.includes(r.to)) {
        return NextResponse.json(
          { success: false, error: `Invalid rule at index ${i}: "to" stage "${r.to}" is not a valid regulatory stage` },
          { status: 400 }
        );
      }
      if (!Array.isArray(r.allowedRoles) || r.allowedRoles.length === 0) {
        return NextResponse.json(
          { success: false, error: `Invalid rule at index ${i}: "allowedRoles" must be a non-empty array of authorized roles` },
          { status: 400 }
        );
      }
    }

    const currentActive = await getActiveWorkflowRules();
    const newVersion = version || `1.${Number((currentActive.version || '1.0.0').split('.')[1] || 0) + 1}.0`;
    const now = new Date();

    const settingPayload = {
      version: newVersion,
      rules: rules as TransitionRule[],
      updatedAt: now.toISOString(),
      updatedBy: auth.user.email || auth.user.userId,
      reason: reason || 'Statutory workflow rule update'
    };

    await prisma.system_settings.upsert({
      where: { setting_key: 'workflow_rules' },
      update: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setting_value: settingPayload as any,
        description: 'AICTE Configurable Regulatory Workflow Transition Matrix',
        updated_by: auth.user.userId,
        updated_at: now
      },
      create: {
        setting_key: 'workflow_rules',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setting_value: settingPayload as any,
        description: 'AICTE Configurable Regulatory Workflow Transition Matrix',
        updated_by: auth.user.userId,
        updated_at: now
      }
    });

    invalidateWorkflowRulesCache();

    // Record in tamper-evident cryptographic audit ledger
    await recordAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.email || 'Administrator',
      action: 'WORKFLOW_RULES_UPDATED',
      entityType: 'system_settings',
      entityId: 'workflow_rules',
      payload: {
        version: newVersion,
        totalRules: rules.length,
        reason: reason || 'Statutory workflow rule update'
      }
    });

    return NextResponse.json({
      success: true,
      message: `Workflow rules successfully updated to version ${newVersion}`,
      version: newVersion,
      rulesCount: rules.length,
      updatedAt: now.toISOString()
    });
  } catch (err) {
    console.error('[API workflow config PUT error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to update workflow configuration' }, { status: 500 });
  }
}
