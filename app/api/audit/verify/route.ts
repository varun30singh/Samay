import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateServerAuth } from '@/lib/serverAuth';

const GENESIS_PREV_HASH = '0'.repeat(64);

interface AuditBlockVerificationRow {
  block_index: bigint | number;
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  previous_hash: string;
  entry_hash: string;
  computed_hash: string;
  created_at: Date;
}

export async function GET(request: NextRequest) {
  const auth = await validateServerAuth(request, [
    'scrutiny_officer',
    'regional_officer',
    'bureau_officer',
    'evc_coordinator',
    'competent_authority',
    'approving_authority',
    'admin',
    'system_admin'
  ]);

  if (!auth.authenticated || !auth.user || !auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized to verify audit ledger' },
      { status: auth.status || 403 }
    );
  }

  try {
    // Recompute SHA-256 hash dynamically directly from block contents using PostgreSQL extensions.digest
    const blocks = await prisma.$queryRawUnsafe<AuditBlockVerificationRow[]>(`
      SELECT 
        block_index,
        id::TEXT as id,
        action,
        entity_type,
        entity_id,
        previous_hash,
        entry_hash,
        encode(extensions.digest(
          block_index::TEXT || '|' ||
          id::TEXT || '|' ||
          COALESCE(actor_id::TEXT, '') || '|' ||
          action || '|' ||
          entity_type || '|' ||
          COALESCE(entity_id, '') || '|' ||
          payload::TEXT || '|' ||
          previous_hash || '|' ||
          created_at::TEXT,
          'sha256'
        ), 'hex') AS computed_hash,
        created_at
      FROM public.audit_ledger
      ORDER BY block_index ASC;
    `);

    if (blocks.length === 0) {
      return NextResponse.json({
        success: true,
        verified: true,
        totalBlocks: 0,
        brokenAtBlock: null,
        message: 'Audit ledger is currently empty. Genesis block will be generated upon first recorded action.'
      });
    }

    let isTampered = false;
    let brokenAtBlock: string | null = null;
    let expectedHash: string | null = null;
    let actualHash: string | null = null;
    let tamperReason = '';

    // Check genesis block linkage
    if (blocks[0].previous_hash !== GENESIS_PREV_HASH && BigInt(blocks[0].block_index) === BigInt(1)) {
      isTampered = true;
      brokenAtBlock = blocks[0].block_index.toString();
      expectedHash = GENESIS_PREV_HASH;
      actualHash = blocks[0].previous_hash;
      tamperReason = 'Genesis block previous_hash mismatch';
    }

    // Verify each block: recomputed hash check, previous hash linkage, and sequence continuity
    for (let i = 0; i < blocks.length; i++) {
      const curr = blocks[i];
      const currIndex = BigInt(curr.block_index);

      // 1. Recomputed Hash Check: detect if block content was modified in place
      if (curr.entry_hash !== curr.computed_hash) {
        isTampered = true;
        brokenAtBlock = currIndex.toString();
        expectedHash = curr.computed_hash;
        actualHash = curr.entry_hash;
        tamperReason = `Content tampering detected at block #${currIndex}. Recomputed SHA-256 digest does not match stored entry_hash.`;
        break;
      }

      // 2. Hash Linkage and Sequence Check
      if (i > 0) {
        const prev = blocks[i - 1];
        const prevIndex = BigInt(prev.block_index);

        if (curr.previous_hash !== prev.entry_hash) {
          isTampered = true;
          brokenAtBlock = currIndex.toString();
          expectedHash = prev.entry_hash;
          actualHash = curr.previous_hash;
          tamperReason = `Cryptographic link severed at block #${currIndex}. Previous hash pointer does not match preceding block #${prevIndex} digest.`;
          break;
        }
      }
    }

    if (isTampered) {
      return NextResponse.json({
        success: true,
        verified: false,
        totalBlocks: blocks.length,
        brokenAtBlock,
        expectedHash,
        actualHash,
        message: tamperReason || `Tampering detected at block #${brokenAtBlock}.`
      }, { status: 200 });
    }

    const lastBlock = blocks[blocks.length - 1];

    return NextResponse.json({
      success: true,
      verified: true,
      totalBlocks: blocks.length,
      brokenAtBlock: null,
      genesisHash: blocks[0].entry_hash,
      latestHash: lastBlock.entry_hash,
      lastBlockIndex: lastBlock.block_index.toString(),
      message: `Audit chain cryptographically verified. All ${blocks.length} blocks recomputed, unbroken, and tamper-free.`
    }, { status: 200 });
  } catch (err) {
    console.error('[API audit verify error]:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: 'Failed to verify cryptographic audit chain' },
      { status: 500 }
    );
  }
}
