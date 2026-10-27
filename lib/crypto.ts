/**
 * SHA-256 and Hash Chain Engine for SAMAY Tamper-Evident Audit Trail
 * Works seamlessly in Browser and Node.js environments.
 */

// Universal SHA-256 hash calculation
export async function calculateSHA256(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Pure JavaScript SHA-256 fallback (standard 32-bit bitwise implementation)
  return fallbackSha256(text);
}

// Synchronous SHA-256 helper for immediate UI rendering
export function sha256Sync(ascii: string): string {
  return fallbackSha256(ascii);
}

function fallbackSha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const lengthProperty = 'length';
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (let idx = 0; idx < ascii[lengthProperty]; idx++) {
    words[idx >> 2] |= (ascii.charCodeAt(idx) & 255) << (8 * (3 - (idx % 4)));
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w: number[] = new Array(64);
  for (i = 0; i < words.length; i += 16) {
    const copy = hash.slice(0);

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const s1b = rightRotate(copy[4], 6) ^ rightRotate(copy[4], 11) ^ rightRotate(copy[4], 25);
      const ch = (copy[4] & copy[5]) ^ (~copy[4] & copy[6]);
      const temp1 = (copy[7] + s1b + ch + k[j] + w[j]) | 0;
      const s0b = rightRotate(copy[0], 2) ^ rightRotate(copy[0], 13) ^ rightRotate(copy[0], 22);
      const maj = (copy[0] & copy[1]) ^ (copy[0] & copy[2]) ^ (copy[1] & copy[2]);
      const temp2 = (s0b + maj) | 0;

      copy[7] = copy[6];
      copy[6] = copy[5];
      copy[5] = copy[4];
      copy[4] = (copy[3] + temp1) | 0;
      copy[3] = copy[2];
      copy[2] = copy[1];
      copy[1] = copy[0];
      copy[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + copy[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export interface VerificationResult {
  isValid: boolean;
  tamperedIndex?: number;
  expectedHash?: string;
  actualHash?: string;
  message: string;
  blocksVerified: number;
}

/**
 * Validates the full audit chain from genesis block to current block.
 * If any block has been modified, detects the exact index and hash mismatch.
 */
export function verifyAuditChain(entries: Array<{
  blockIndex: number;
  timestamp: string;
  actor: string;
  action: string;
  objectId: string;
  details: string;
  previousHash: string;
  hash: string;
}>): VerificationResult {
  if (entries.length === 0) {
    return {
      isValid: true,
      blocksVerified: 0,
      message: 'Chain is empty, no blocks to verify.'
    };
  }

  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];
    
    // Check previous hash linkage (except genesis block)
    if (i > 0) {
      const prev = entries[i - 1];
      if (current.previousHash !== prev.hash) {
        return {
          isValid: false,
          tamperedIndex: current.blockIndex,
          expectedHash: prev.hash,
          actualHash: current.previousHash,
          blocksVerified: i,
          message: `Chain Broken: Block #${current.blockIndex} points to previous hash (${current.previousHash.slice(0, 10)}...) which does not match Block #${prev.blockIndex} (${prev.hash.slice(0, 10)}...).`
        };
      }
    }

    // Recompute the block hash
    const blockPayload = `${current.previousHash}|${current.blockIndex}|${current.timestamp}|${current.actor}|${current.action}|${current.objectId}|${current.details}`;
    const calculated = sha256Sync(blockPayload);

    if (calculated !== current.hash) {
      return {
        isValid: false,
        tamperedIndex: current.blockIndex,
        expectedHash: calculated,
        actualHash: current.hash,
        blocksVerified: i,
        message: `Tamper Detected: Payload of Block #${current.blockIndex} was modified! Calculated SHA-256 does not match recorded hash.`
      };
    }
  }

  return {
    isValid: true,
    blocksVerified: entries.length,
    message: `All ${entries.length} cryptographic audit blocks verified successfully. Hash chain is intact and tamper-free.`
  };
}

/**
 * Creates a new block hash chained to previousHash
 */
export function createBlockHash(
  previousHash: string,
  blockIndex: number,
  timestamp: string,
  actor: string,
  action: string,
  objectId: string,
  details: string
): string {
  const payload = `${previousHash}|${blockIndex}|${timestamp}|${actor}|${action}|${objectId}|${details}`;
  return sha256Sync(payload);
}

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
