import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StorageResult {
  storagePath: string;
  storageBucket: string;
  sha256Hash: string;
  fileSizeBytes: number;
}

export interface StorageDiagnostics {
  driver: 'local_disk' | 'supabase_storage';
  storageRoot: string;
  isEphemeral: boolean;
  isConfiguredPersistent: boolean;
}

// Ensure the storage directory is strictly outside of Next.js 'public/' directory
const DEFAULT_LOCAL_ROOT = path.join(process.cwd(), 'storage', 'documents');

export function getStorageRoot(): string {
  const customRoot = process.env.STORAGE_ROOT_DIR?.trim();
  if (customRoot) {
    return path.resolve(customRoot);
  }
  return DEFAULT_LOCAL_ROOT;
}

export function getStorageDiagnostics(): StorageDiagnostics {
  const customRoot = process.env.STORAGE_ROOT_DIR?.trim();
  const hasSupabaseStorage = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (hasSupabaseStorage) {
    return {
      driver: 'supabase_storage',
      storageRoot: 'supabase-storage://samay-private',
      isEphemeral: false,
      isConfiguredPersistent: true
    };
  }

  const isConfiguredPersistent = Boolean(customRoot);
  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.K_SERVICE
  );

  return {
    driver: 'local_disk',
    storageRoot: getStorageRoot(),
    isEphemeral: isServerless && !isConfiguredPersistent,
    isConfiguredPersistent
  };
}

/**
 * Persists an uploaded document securely to private storage with path sanitization
 * and SHA-256 verification.
 */
export async function saveDocumentFile(params: {
  institutionId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<StorageResult> {
  const { institutionId, fileName, buffer } = params;

  // Compute cryptographic SHA-256 digest
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Sanitize path against directory traversal
  const safeInstId = institutionId.replace(/[^a-zA-Z0-9-]/g, '_');
  const safeBaseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const docId = crypto.randomUUID();

  const root = getStorageRoot();
  const institutionDir = path.join(/*turbopackIgnore: true*/ root, safeInstId);

  // Ensure target directory exists
  await fs.promises.mkdir(institutionDir, { recursive: true });

  const finalFilePath = path.join(/*turbopackIgnore: true*/ institutionDir, `${docId}_${safeBaseName}`);

  // Prevent path traversal outside root
  if (!finalFilePath.startsWith(root)) {
    throw new Error('Security Error: Illegal path traversal detected during document storage');
  }

  await fs.promises.writeFile(finalFilePath, buffer);

  return {
    storagePath: finalFilePath,
    storageBucket: 'samay-private',
    sha256Hash: hash,
    fileSizeBytes: buffer.length
  };
}

/**
 * Retrieves a private document stream or buffer from storage.
 */
export async function readDocumentFile(storagePath: string): Promise<Buffer | null> {
  if (!storagePath) return null;

  const root = getStorageRoot();
  const resolved = path.resolve(storagePath);

  // Path traversal safeguard
  if (!resolved.startsWith(root) && !resolved.startsWith(DEFAULT_LOCAL_ROOT)) {
    throw new Error('Security Error: Document access outside authorized storage root is forbidden');
  }

  if (fs.existsSync(resolved)) {
    return await fs.promises.readFile(resolved);
  }

  return null;
}
