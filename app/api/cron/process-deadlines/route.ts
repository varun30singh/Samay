import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scanPendingDeadlines } from '@/lib/deadlineService';
import { createAlert } from '@/lib/notificationService';
import { recordAuditEvent } from '@/lib/auditService';
import crypto from 'crypto';

/**
 * Scheduled background job: Scans pending applications and creates alerts for approaching or overdue deadlines.
 * Protected via CRON_SECRET header or system_admin Bearer token.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronHeader = request.headers.get('x-cron-secret');
    const providedSecret = cronHeader || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

    // In production, CRON_SECRET must be explicitly configured in environment variables
    const configuredSecret =
      process.env.CRON_SECRET ||
      (process.env.NODE_ENV !== 'production' ? 'samay-cron-internal-job-key-2026' : undefined);

    if (!configuredSecret || !providedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing or invalid cron secret' },
        { status: 401 }
      );
    }

    // Constant-time comparison to prevent timing attacks
    const providedBuf = Buffer.from(providedSecret);
    const configuredBuf = Buffer.from(configuredSecret);
    const isAuthorized =
      providedBuf.length === configuredBuf.length &&
      crypto.timingSafeEqual(providedBuf, configuredBuf);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing or invalid cron secret' },
        { status: 401 }
      );
    }

    const evaluations = await scanPendingDeadlines();
    let createdAlertsCount = 0;
    const now = new Date();

    for (const item of evaluations) {
      if (item.isOverdue || item.isDueSoon) {
        // Find application to get submitter & assigned officer
        const app = await prisma.applications.findUnique({
          where: { id: item.applicationId },
          select: { id: true, application_number: true, submitted_by: true, assigned_officer_id: true }
        });

        if (!app) continue;

        const alertType = item.isOverdue ? 'statutory_overdue' : 'statutory_due_soon';
        const title = item.isOverdue
          ? `STATUTORY DEADLINE EXCEEDED: ${app.application_number}`
          : `DEADLINE APPROACHING: ${app.application_number} (${item.workingDaysLeft} working days left)`;

        const message = item.isOverdue
          ? `Application ${app.application_number} is overdue by ${Math.abs(item.calendarDaysLeft)} days. Immediate statutory intervention required.`
          : `Application ${app.application_number} has ${item.workingDaysLeft} working days remaining until the statutory cutoff.`;

        // Idempotency: Check if an alert for this app and type was created in the last 24 hours
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const existingAlert = await prisma.alerts.findFirst({
          where: {
            application_id: app.id,
            alert_type: alertType,
            created_at: { gte: twentyFourHoursAgo }
          }
        });

        if (!existingAlert) {
          const recipientId = app.assigned_officer_id || app.submitted_by;
          if (recipientId) {
            await createAlert({
              recipientId,
              applicationId: app.id,
              title,
              message,
              alertType,
              metadata: { workingDaysLeft: item.workingDaysLeft, isOverdue: item.isOverdue }
            });
            createdAlertsCount++;
          }
        }
      }
    }

    await recordAuditEvent({
      actorId: null,
      actorName: 'SYSTEM_CRON_SCHEDULER',
      action: 'CRON_DEADLINE_SCAN_COMPLETED',
      entityType: 'SystemScheduler',
      payload: {
        applicationsScanned: evaluations.length,
        alertsCreated: createdAlertsCount
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        scanned: evaluations.length,
        alertsCreated: createdAlertsCount,
        timestamp: now.toISOString()
      }
    });
  } catch (err) {
    console.error('[CRON process-deadlines error]:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Background deadline processing failed' }, { status: 500 });
  }
}
