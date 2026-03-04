import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

let _cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (_cachedKey) return _cachedKey;
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error('ENCRYPTION_KEY is not set');
  _cachedKey = scryptSync(secret, 'moa-salt', 32);
  return _cachedKey;
}

/** 숫자를 암호화하여 base64 문자열로 반환 */
export function encrypt(value: number): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = String(value);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // iv(12) + tag(16) + ciphertext → base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/** base64 암호문을 복호화하여 숫자로 반환 */
export function decrypt(ciphertext: string): number {
  const key = getKey();
  const buf = Buffer.from(ciphertext, 'base64');

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return Number(decrypted.toString('utf8'));
}

/** 거래 레코드의 민감 필드(amount, price, quantity)를 암호화 */
export function encryptTransaction(tx: { amount: number; price: number; quantity: number }) {
  return {
    amount: encrypt(tx.amount),
    price: encrypt(tx.price),
    quantity: encrypt(tx.quantity),
  };
}

/** 암호화된 거래 레코드의 민감 필드를 복호화 */
export function decryptTransaction<T extends { amount: string; price: string; quantity: string }>(
  row: T
): Omit<T, 'amount' | 'price' | 'quantity'> & { amount: number; price: number; quantity: number } {
  return {
    ...row,
    amount: decrypt(row.amount),
    price: decrypt(row.price),
    quantity: decrypt(row.quantity),
  };
}
