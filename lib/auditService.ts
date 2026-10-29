import { prisma } from '@/lib/prisma';
import { createBlockHash, GENESIS_HASH } from '@/lib/crypto';

export interface AuditEventParams {
  actorId?: string | null;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Appends a tamper-evident cryptographic block to public.audit_ledger.
 * Computes chained SHA-256 hash connecting to the preceding block.
 */
export async function recordAuditEvent(params: AuditEventParams) {
  try {
    const lastEntry = await prisma.audit_ledger.findFirst({
      orderBy: { block_index: 'desc' }
    });

    const nextIndex = lastEntry ? Number(lastEntry.block_index) + 1 : 1;
    const prevHash = lastEntry ? lastEntry.entry_hash : GENESIS_HASH;
    const nowIso = new Date().toISOString();
    const details = JSON.stringify(params.payload || {});
    const hash = createBlockHash(
      prevHash,
      nextIndex,
      nowIso,
      params.actorName || params.actorId || 'system',
      params.action,
      params.entityId || 'N/A',
      details
    );

    let validActorId: string | null = null;
    if (params.actorId) {
      const profile = await prisma.profiles.findUnique({
        where: { id: params.actorId },
        select: { id: true }
      });
      if (profile) {
        validActorId = profile.id;
      }
    }

    return await prisma.audit_ledger.create({
      data: {
        actor_id: validActorId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: (params.payload || {}) as any,
        previous_hash: prevHash,
        entry_hash: hash,
        created_at: new Date(nowIso)
      }
    });
  } catch (err) {
    console.error('[AUDIT_LEDGER_ERROR]', err instanceof Error ? err.message : err);
    return null;
  }
}
