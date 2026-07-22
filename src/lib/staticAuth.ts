const STATIC_AUTH_ACCOUNTS = [
  {
    identifier: 'yjw@con-cost.com',
    userId: 'user-admin-yjw',
    salt: 'con-cost-yjw-v1',
    iterations: 210_000,
    passwordHash: 'Ffvfw8uO26srkO1fbx5gfrG8cm0cNZ3PrmjyXaiWa8U=',
  },
] as const;

const decodeBase64 = (value: string) =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const constantTimeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
};

export async function verifyStaticCredential(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase();
  const account = STATIC_AUTH_ACCOUNTS.find((candidate) => candidate.identifier === normalized);
  if (!account || !password || !globalThis.crypto?.subtle) return null;

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await globalThis.crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: new TextEncoder().encode(account.salt),
    iterations: account.iterations,
  }, key, 256);

  return constantTimeEqual(new Uint8Array(bits), decodeBase64(account.passwordHash))
    ? account.userId
    : null;
}
