// Shared password hashing utilities using PBKDF2 (Web Crypto API).
// PBKDF2 with 100k iterations + a random per-user salt makes brute-force and
// rainbow-table attacks computationally expensive, unlike a bare SHA-256 digest.

const PBKDF2_ITERATIONS = 100_000;

async function deriveKey(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hash a new password. Returns `"<saltHex>:<hashHex>"` for storage. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveKey(password, salt);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hash}`;
}

/** Verify a plaintext password against a stored `"<saltHex>:<hashHex>"` value. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const colonIdx = stored.indexOf(':');
  if (colonIdx === -1) return false;
  const saltHex = stored.slice(0, colonIdx);
  const storedHash = stored.slice(colonIdx + 1);
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const hash = await deriveKey(password, salt);
  return hash === storedHash;
}
