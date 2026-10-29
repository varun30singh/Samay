import { prisma } from '@/lib/prisma';
import { alert_status } from '@prisma/client';

export interface AlertParams {
  recipientId: string;
  title: string;
  message: string;
  alertType?: string;
  applicationId?: string;
  deficiencyId?: string;
  channel?: 'in_app' | 'email' | 'sms';
  metadata?: Record<string, unknown>;
}

/**
 * Creates an in-app notification in public.alerts.
 */
export async function createAlert(params: AlertParams) {
  try {
    return await prisma.alerts.create({
      data: {
        recipient_id: params.recipientId,
        title: params.title,
        message: params.message,
        alert_type: params.alertType || 'workflow_event',
        channel: params.channel || 'in_app',
        application_id: params.applicationId || null,
        deficiency_id: params.deficiencyId || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (params.metadata || {}) as any,
        status: alert_status.pending,
        scheduled_at: new Date()
      }
    });
  } catch (err) {
    console.error('[ALERT_CREATION_ERROR]', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Marks an alert as read.
 */
export async function markAlertRead(alertId: string, recipientId: string) {
  return await prisma.alerts.updateMany({
    where: {
      id: alertId,
      recipient_id: recipientId
    },
    data: {
      status: alert_status.read,
      read_at: new Date()
    }
  });
}
