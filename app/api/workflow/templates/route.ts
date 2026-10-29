import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';
import {
  getWorkflowTemplates,
  validateWorkflowPolicy,
  invalidateWorkflowRulesCache,
  WorkflowTemplate
} from '@/lib/workflowService';
import { recordAuditEvent } from '@/lib/auditService';

export async function GET(request: NextRequest) {
  const auth = await validateServerAuth(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.status || 401 }
    );
  }

  try {
    const { templates, version, source } = await getWorkflowTemplates();
    return NextResponse.json({
      success: true,
      data: {
        templates,
        version,
        source,
        totalTemplates: templates.length
      }
    });
  } catch (err) {
    console.error('[API /api/workflow/templates GET error]:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve workflow templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await validateServerAuth(request, ['admin', 'system_admin']);
  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Forbidden: Administrator privileges required to author regulatory workflow templates' },
      { status: auth.status || 403 }
    );
  }

  try {
    const body = await request.json();
    const { template } = body;

    if (!template || typeof template !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: "template" object is required' },
        { status: 400 }
      );
    }

    // 1. Enforce Statutory Policy Safeguards Validator
    const validation = validateWorkflowPolicy(template as WorkflowTemplate);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Statutory policy safeguard violations detected in workflow template',
          violations: validation.errors
        },
        { status: 400 }
      );
    }

    // 2. Fetch existing templates and append
    const { templates: currentTemplates, version: currentVersion } = await getWorkflowTemplates();

    if (currentTemplates.some(t => t.id === template.id)) {
      return NextResponse.json(
        { success: false, error: `Workflow template with ID "${template.id}" already exists. Use PUT to update.` },
        { status: 409 }
      );
    }

    const now = new Date();
    const newVersion = `1.${Number((currentVersion || '1.0.0').split('.')[1] || 0) + 1}.0`;

    const newTemplate: WorkflowTemplate = {
      ...template,
      category: 'CUSTOM',
      version: newVersion,
      isActive: template.isActive !== undefined ? Boolean(template.isActive) : true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    const updatedList = [...currentTemplates, newTemplate];

    const settingPayload = {
      version: newVersion,
      templates: updatedList,
      updatedAt: now.toISOString(),
      updatedBy: auth.user.email || auth.user.userId
    };

    await prisma.system_settings.upsert({
      where: { setting_key: 'workflow_templates' },
      update: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setting_value: settingPayload as any,
        description: 'AICTE Configurable Regulatory Workflow Templates & Safeguards',
        updated_by: auth.user.userId,
        updated_at: now
      },
      create: {
        setting_key: 'workflow_templates',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setting_value: settingPayload as any,
        description: 'AICTE Configurable Regulatory Workflow Templates & Safeguards',
        updated_by: auth.user.userId,
        updated_at: now
      }
    });

    invalidateWorkflowRulesCache();

    // 3. Cryptographic Audit Ledger Entry
    await recordAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.email || 'Administrator',
      action: 'WORKFLOW_TEMPLATE_CREATED',
      entityType: 'WorkflowTemplate',
      entityId: newTemplate.id,
      payload: {
        templateId: newTemplate.id,
        templateName: newTemplate.name,
        version: newVersion,
        stageCount: newTemplate.stages?.length || 0,
        transitionCount: newTemplate.transitions?.length || 0
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: `Workflow template "${newTemplate.name}" successfully created under version ${newVersion}`,
        data: newTemplate
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[API /api/workflow/templates POST error]:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'Failed to create workflow template' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await validateServerAuth(request, ['admin', 'system_admin']);
  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Forbidden: Administrator privileges required to update regulatory workflow templates' },
      { status: auth.status || 403 }
    );
  }

  try {
    const body = await request.json();
    const { template, templateId } = body;
    const targetId = templateId || template?.id;

    if (!targetId) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: "templateId" or "template.id" is required' },
        { status: 400 }
      );
    }

    const { templates: currentTemplates, version: currentVersion } = await getWorkflowTemplates();
    const existingIndex = currentTemplates.findIndex(t => t.id === targetId);

    if (existingIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Workflow template with ID "${targetId}" not found` },
        { status: 404 }
      );
    }

    const mergedTemplate: WorkflowTemplate = {
      ...currentTemplates[existingIndex],
      ...template,
      id: targetId,
      updatedAt: new Date().toISOString()
    };

    // Enforce Statutory Policy Safeguards Validator
    const validation = validateWorkflowPolicy(mergedTemplate);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Statutory policy safeguard violations detected in workflow template',
          violations: validation.errors
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const newVersion = `1.${Number((currentVersion || '1.0.0').split('.')[1] || 0) + 1}.0`;
    mergedTemplate.version = newVersion;

    const updatedList = [...currentTemplates];
    updatedList[existingIndex] = mergedTemplate;

    const settingPayload = {
      version: newVersion,
      templates: updatedList,
      updatedAt: now.toISOString(),
      updatedBy: auth.user.email || auth.user.userId
    };

    await prisma.system_settings.upsert({
      where: { setting_key: 'workflow_templates' },
      update: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setting_value: settingPayload as any,
        description: 'AICTE Configurable Regulatory Workflow Templates & Safeguards',
        updated_by: auth.user.userId,
        updated_at: now
      },
      create: {
        setting_key: 'workflow_templates',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setting_value: settingPayload as any,
        description: 'AICTE Configurable Regulatory Workflow Templates & Safeguards',
        updated_by: auth.user.userId,
        updated_at: now
      }
    });

    invalidateWorkflowRulesCache();

    // Cryptographic Audit Ledger Entry
    await recordAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.email || 'Administrator',
      action: 'WORKFLOW_TEMPLATE_UPDATED',
      entityType: 'WorkflowTemplate',
      entityId: targetId,
      payload: {
        templateId: targetId,
        templateName: mergedTemplate.name,
        version: newVersion,
        stageCount: mergedTemplate.stages?.length || 0,
        transitionCount: mergedTemplate.transitions?.length || 0
      }
    });

    return NextResponse.json({
      success: true,
      message: `Workflow template "${mergedTemplate.name}" updated successfully to version ${newVersion}`,
      data: mergedTemplate
    });
  } catch (err) {
    console.error('[API /api/workflow/templates PUT error]:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'Failed to update workflow template' },
      { status: 500 }
    );
  }
}
