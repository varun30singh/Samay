import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';
import { CsvAdapter } from '@/lib/dataAdapters';
import { recordAuditEvent } from '@/lib/auditService';
import { application_stage, application_type } from '@prisma/client';

export async function POST(request: NextRequest) {
  // Only administrative roles can execute bulk CSV data ingestion into the database
  const auth = await validateServerAuth(request, [
    'system_admin',
    'admin',
    'bureau_officer'
  ]);

  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized: Only system administrators can import bulk CSV data' },
      { status: auth.status || 403 }
    );
  }

  try {
    const body = await request.json();
    const { csvContent, fileName } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ success: false, error: 'CSV content string is required' }, { status: 400 });
    }

    const adapter = new CsvAdapter();
    const fileBytes = Buffer.byteLength(csvContent, 'utf8');
    const metaCheck = adapter.validateFileMeta(fileName || 'import.csv', fileBytes);

    if (!metaCheck.valid) {
      return NextResponse.json({ success: false, error: metaCheck.error || 'Invalid file format or size' }, { status: 400 });
    }

    // Server-side validation of CSV rows
    const result = await adapter.importApplications(csvContent);

    if (result.validRecords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid records found in CSV file',
          validationErrors: result.errors
        },
        { status: 400 }
      );
    }

    // Transactionally ingest valid records
    let importedInstitutionsCount = 0;
    let importedApplicationsCount = 0;

    await prisma.$transaction(async tx => {
      for (const rec of result.validRecords) {
        const instCode = rec.aictePermanentId || 'AICTE-IMPORT';
        const legalName = rec.institutionName || 'Imported Technical College';
        const region = rec.region || 'Western';
        const state = rec.state || 'Maharashtra';

        // 1. Upsert institution record
        let institution = await tx.institutions.findFirst({
          where: { institution_code: instCode }
        });

        if (!institution) {
          institution = await tx.institutions.create({
            data: {
              institution_code: instCode,
              legal_name: legalName,
              display_name: legalName,
              region,
              state,
              category: 'Engineering & Technology',
              institution_type: 'Government-Aided'
            }
          });
          importedInstitutionsCount++;
        }

        // 2. Check if application already exists
        const appNumber = rec.applicationNumber || `AICTE-${instCode}-${Date.now().toString().slice(-4)}`;
        const existingApp = await tx.applications.findUnique({
          where: { application_number: appNumber }
        });

        const stageMap: Record<string, application_stage> = {
          draft: application_stage.draft,
          submitted: application_stage.submitted,
          scrutiny: application_stage.under_scrutiny,
          under_scrutiny: application_stage.under_scrutiny,
          deficiency_raised: application_stage.deficiency_raised,
          deficiency_return: application_stage.deficiency_raised,
          returned_to_institution: application_stage.deficiency_raised,
          resubmitted: application_stage.resubmitted,
          ready_for_evc: application_stage.ready_for_evc,
          evc: application_stage.ready_for_evc,
          evc_scheduled: application_stage.evc_scheduled,
          evc_completed: application_stage.evc_completed,
          under_final_review: application_stage.under_final_review,
          decision_pending: application_stage.under_final_review,
          approved: application_stage.approved,
          rejected: application_stage.rejected
        };
        const rawStageKey = (rec.currentStage || 'under_scrutiny').toLowerCase().replace(/[\s-]+/g, '_');
        const resolvedStage = stageMap[rawStageKey] || application_stage.under_scrutiny;

        if (!existingApp) {
          const app = await tx.applications.create({
            data: {
              application_number: appNumber,
              institution_id: institution.id,
              application_type: application_type.extension_of_approval,
              stage: resolvedStage,
              academic_year: '2026-2027',
              requested_intake: rec.approvedIntake || 360,
              submitted_at: rec.submissionDate ? new Date(rec.submissionDate) : new Date(),
              last_action_at: new Date(),
              statutory_deadline: new Date('2026-04-30T23:59:59Z'),
              risk_score: rec.delayRiskScore ? parseFloat(rec.delayRiskScore.toString()) : 20.0
            }
          });

          await tx.application_stage_history.create({
            data: {
              application_id: app.id,
              previous_stage: null,
              new_stage: app.stage,
              changed_by: isUuid(auth.user!.userId) ? auth.user!.userId : null,
              reason: 'Bulk CSV Ingestion'
            }
          });

          importedApplicationsCount++;
        }
      }
    });

    await recordAuditEvent({
      actorId: isUuid(auth.user.userId) ? auth.user.userId : null,
      action: 'BULK_CSV_IMPORT_EXECUTED',
      entityType: 'DataImport',
      payload: {
        fileName,
        validCount: result.validRecords.length,
        importedInstitutionsCount,
        importedApplicationsCount
      }
    });

    return NextResponse.json({
      success: true,
      totalRows: result.totalRows,
      validCount: result.validRecords.length,
      invalidCount: result.invalidCount,
      summary: {
        totalRows: result.totalRows,
        validCount: result.validRecords.length,
        invalidCount: result.invalidCount,
        importedInstitutions: importedInstitutionsCount,
        importedApplications: importedApplicationsCount,
        errors: result.errors
      }
    });
  } catch (err) {
    console.error('[API data-import error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Failed to execute bulk data import' }, { status: 500 });
  }
}

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
