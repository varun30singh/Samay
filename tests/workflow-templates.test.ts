import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { signJwtToken, TEST_JWT_SECRET } from '../lib/serverAuth';
import {
  validateWorkflowPolicy,
  DEFAULT_APH_TEMPLATES,
  WorkflowTemplate,
  canTransition
} from '../lib/workflowService';
import { GET as templatesGetHandler, POST as templatesPostHandler, PUT as templatesPutHandler } from '../app/api/workflow/templates/route';

process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;

test('WORKFLOW POLICY UNIT 1: All 4 Seeded APH Templates pass statutory policy safeguards', () => {
  for (const t of DEFAULT_APH_TEMPLATES) {
    const check = validateWorkflowPolicy(t);
    assert.equal(check.isValid, true, `Seeded template "${t.id}" failed policy check: ${check.errors.join('; ')}`);
    assert.equal(check.errors.length, 0);
  }
});

test('WORKFLOW POLICY UNIT 2: Template without approved/rejected terminations is rejected', () => {
  const invalidTemplate: WorkflowTemplate = {
    id: 'test-incomplete',
    name: 'Incomplete Test Template',
    code: 'INCOMPLETE',
    description: 'Missing final decisions',
    category: 'CUSTOM',
    version: '1.0.0',
    isActive: true,
    applicableTypes: ['extension_of_approval'],
    stages: ['submitted', 'under_scrutiny'],
    transitions: [
      { from: 'draft', to: 'submitted', allowedRoles: ['applicant'] },
      { from: 'submitted', to: 'under_scrutiny', allowedRoles: ['scrutiny_officer'] }
    ],
    policySafeguards: {
      requiresCompetentAuthorityDecision: true,
      requiresAuditLedger: true,
      allowDirectApprovalFromScrutiny: false,
      allowDirectApprovalFromEvc: false
    }
  };

  const result = validateWorkflowPolicy(invalidTemplate);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some(e => e.includes('approved') && e.includes('rejected')));
});

test('WORKFLOW POLICY UNIT 3: Template granting approval power to Scrutiny Officer is rejected', () => {
  const invalidRoleTemplate: WorkflowTemplate = {
    id: 'test-rogue-approver',
    name: 'Unauthorized Approver Template',
    code: 'ROGUE_APPROVER',
    description: 'Scrutiny officer improperly granted approval power',
    category: 'CUSTOM',
    version: '1.0.0',
    isActive: true,
    applicableTypes: ['extension_of_approval'],
    stages: ['submitted', 'under_scrutiny', 'under_final_review', 'approved', 'rejected'],
    transitions: [
      { from: 'draft', to: 'submitted', allowedRoles: ['applicant'] },
      { from: 'submitted', to: 'under_scrutiny', allowedRoles: ['scrutiny_officer'] },
      { from: 'under_scrutiny', to: 'under_final_review', allowedRoles: ['scrutiny_officer'] },
      // Rogue rule: scrutiny_officer allowed to approve!
      { from: 'under_final_review', to: 'approved', allowedRoles: ['scrutiny_officer', 'competent_authority'] },
      { from: 'under_final_review', to: 'rejected', allowedRoles: ['competent_authority'] }
    ],
    policySafeguards: {
      requiresCompetentAuthorityDecision: true,
      requiresAuditLedger: true,
      allowDirectApprovalFromScrutiny: false,
      allowDirectApprovalFromEvc: false
    }
  };

  const result = validateWorkflowPolicy(invalidRoleTemplate);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some(e => e.includes('Only Competent Authority')));
});

test('WORKFLOW POLICY UNIT 4: Auto-approval bypass jumping directly from scrutiny to approved is rejected', () => {
  const bypassTemplate: WorkflowTemplate = {
    id: 'test-bypass',
    name: 'Bypass Workflow Template',
    code: 'BYPASS_TEMPLATE',
    description: 'Attempts to skip final review',
    category: 'CUSTOM',
    version: '1.0.0',
    isActive: true,
    applicableTypes: ['extension_of_approval'],
    stages: ['submitted', 'under_scrutiny', 'approved', 'rejected'],
    transitions: [
      { from: 'draft', to: 'submitted', allowedRoles: ['applicant'] },
      { from: 'submitted', to: 'under_scrutiny', allowedRoles: ['scrutiny_officer'] },
      // Direct jump from scrutiny to approved!
      { from: 'under_scrutiny', to: 'approved', allowedRoles: ['competent_authority'] },
      { from: 'under_scrutiny', to: 'rejected', allowedRoles: ['competent_authority'] }
    ],
    policySafeguards: {
      requiresCompetentAuthorityDecision: true,
      requiresAuditLedger: true,
      allowDirectApprovalFromScrutiny: false,
      allowDirectApprovalFromEvc: false
    }
  };

  const result = validateWorkflowPolicy(bypassTemplate);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some(e => e.includes('Auto-approval bypass prohibited')));
});

test('WORKFLOW TEMPLATES API: GET /api/workflow/templates returns seeded templates', async () => {
  const officerToken = signJwtToken(
    { sub: '550e8400-e29b-41d4-a716-446655440002', app_metadata: { role: 'scrutiny_officer' } },
    TEST_JWT_SECRET
  );
  const req = new NextRequest('http://localhost:3000/api/workflow/templates', {
    headers: { authorization: `Bearer ${officerToken}` }
  });
  const res = await templatesGetHandler(req);
  assert.equal(res.status, 200);

  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.data.templates));
  assert.ok(json.data.templates.length >= 4);

  const templateIds = json.data.templates.map((t: WorkflowTemplate) => t.id);
  assert.ok(templateIds.includes('aph-scrutiny-only'));
  assert.ok(templateIds.includes('aph-scrutiny-evc'));
  assert.ok(templateIds.includes('aph-evc-sac-shc'));
  assert.ok(templateIds.includes('aph-evc-only'));
});

test('WORKFLOW TEMPLATES API: POST /api/workflow/templates enforces RBAC & policy validation', async () => {
  // 1. Non-admin forbidden -> 403
  const officerToken = signJwtToken(
    { sub: '550e8400-e29b-41d4-a716-446655440002', app_metadata: { role: 'scrutiny_officer' } },
    TEST_JWT_SECRET
  );
  const nonAdminReq = new NextRequest('http://localhost:3000/api/workflow/templates', {
    method: 'POST',
    headers: { authorization: `Bearer ${officerToken}` },
    body: JSON.stringify({ template: { id: 'test' } })
  });
  const nonAdminRes = await templatesPostHandler(nonAdminReq);
  assert.equal(nonAdminRes.status, 403);

  // 2. Admin with invalid policy payload -> 400 Bad Request
  const adminToken = signJwtToken(
    { sub: '550e8400-e29b-41d4-a716-446655440001', app_metadata: { role: 'system_admin' } },
    TEST_JWT_SECRET
  );
  const invalidPolicyReq = new NextRequest('http://localhost:3000/api/workflow/templates', {
    method: 'POST',
    headers: { authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      template: {
        id: 'bad-template',
        name: 'Bad Template',
        transitions: [{ from: 'draft', to: 'submitted', allowedRoles: ['applicant'] }]
      }
    })
  });
  const invalidPolicyRes = await templatesPostHandler(invalidPolicyReq);
  assert.equal(invalidPolicyRes.status, 400);
  const invalidJson = await invalidPolicyRes.json();
  assert.equal(invalidJson.success, false);
  assert.ok(invalidJson.violations);

  // 3. Admin with valid custom template -> 201 Created
  const validCustom: WorkflowTemplate = {
    id: `custom-polytechnic-${Date.now()}`,
    name: 'Custom Polytechnic Fast-Track Approval',
    code: 'CUSTOM_POLYTECHNIC',
    description: 'Streamlined approval pathway for government polytechnic institutes.',
    category: 'CUSTOM',
    version: '1.0.0',
    isActive: true,
    applicableTypes: ['extension_of_approval'],
    stages: ['submitted', 'under_scrutiny', 'under_final_review', 'approved', 'rejected'],
    transitions: [
      { from: 'draft', to: 'submitted', allowedRoles: ['applicant', 'institution'] },
      { from: 'submitted', to: 'under_scrutiny', allowedRoles: ['scrutiny_officer', 'admin'] },
      { from: 'under_scrutiny', to: 'under_final_review', allowedRoles: ['scrutiny_officer', 'admin'] },
      { from: 'under_final_review', to: 'approved', allowedRoles: ['competent_authority'] },
      { from: 'under_final_review', to: 'rejected', allowedRoles: ['competent_authority'] },
      { from: 'submitted', to: 'withdrawn', allowedRoles: ['applicant'] }
    ],
    policySafeguards: {
      requiresCompetentAuthorityDecision: true,
      requiresAuditLedger: true,
      allowDirectApprovalFromScrutiny: false,
      allowDirectApprovalFromEvc: false
    }
  };

  const validReq = new NextRequest('http://localhost:3000/api/workflow/templates', {
    method: 'POST',
    headers: { authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ template: validCustom })
  });
  const validRes = await templatesPostHandler(validReq);
  assert.equal(validRes.status, 201);
  const validJson = await validRes.json();
  assert.equal(validJson.success, true);
  assert.equal(validJson.data.id, validCustom.id);
});

test('WORKFLOW DECISION SAFEGUARD: Only Competent Authority can record final approvals', async () => {
  // Scrutiny Officer cannot approve
  assert.equal(
    canTransition('under_final_review', 'approved', 'scrutiny_officer').allowed,
    false
  );

  // Regional Officer cannot approve
  assert.equal(
    canTransition('under_final_review', 'approved', 'regional_officer').allowed,
    false
  );

  // Competent Authority CAN approve
  assert.equal(
    canTransition('under_final_review', 'approved', 'competent_authority').allowed,
    true
  );
  assert.equal(
    canTransition('under_final_review', 'approved', 'approving_authority').allowed,
    true
  );

  // Direct approval from under_scrutiny is disallowed
  assert.equal(
    canTransition('under_scrutiny', 'approved', 'competent_authority').allowed,
    false
  );
});

test('WORKFLOW TEMPLATES API: PUT /api/workflow/templates updates existing template', async () => {
  const adminToken = signJwtToken(
    { sub: '550e8400-e29b-41d4-a716-446655440001', app_metadata: { role: 'system_admin' } },
    TEST_JWT_SECRET
  );

  const putReq = new NextRequest('http://localhost:3000/api/workflow/templates', {
    method: 'PUT',
    headers: { authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      templateId: 'aph-scrutiny-only',
      template: {
        description: 'Updated description for APH Template A (Scrutiny Only).'
      }
    })
  });
  const putRes = await templatesPutHandler(putReq);
  assert.equal(putRes.status, 200);
  const putJson = await putRes.json();
  assert.equal(putJson.success, true);
  assert.equal(putJson.data.id, 'aph-scrutiny-only');
  assert.equal(putJson.data.description, 'Updated description for APH Template A (Scrutiny Only).');
});
