/**
 * Military-grade AES-256-GCM Cryptographic Implementation
 * Uses standard Web Crypto API (SubtleCrypto) with PBKDF2 key derivation
 */

import { EncryptedEnvelope } from '../types/index';

// Convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Convert ArrayBuffer to Hex string
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Calculate SHA-256 of data
export async function calculateSha256(data: string | Uint8Array | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
  } else if (data instanceof Uint8Array) {
    buffer = data.buffer as ArrayBuffer;
  } else {
    buffer = data;
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hashBuffer);
}

// Generate random cryptographically strong 256-bit key in Hex format
export function generateRandom256BitKey(): string {
  const bytes = new Uint8Array(32); // 256 bits
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes);
}

// Derive AES-GCM 256-bit CryptoKey from passphrase & salt via PBKDF2
async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt arbitrary plaintext or binary data using AES-256-GCM
 */
export async function encryptPayload(
  rawContent: string,
  passphrase: string,
  metadata?: { fileName?: string; fileType?: string; isBinary?: boolean }
): Promise<EncryptedEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16)); // 128-bit salt
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit recommended IV for AES-GCM

  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const dataBytes = new TextEncoder().encode(rawContent);

  // Compute original content SHA-256
  const rawHash = await calculateSha256(dataBytes);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    dataBytes.buffer as ArrayBuffer
  );

  const transferId = 'AIR-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

  return {
    version: 2,
    transferId,
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    ciphertext: bufferToBase64(encryptedBuffer),
    hash: rawHash,
    totalBytes: dataBytes.byteLength,
    fileName: metadata?.fileName,
    fileType: metadata?.fileType || 'text/plain',
    timestamp: Date.now(),
  };
}

/**
 * Decrypt envelope with AES-256-GCM and verify authenticity & integrity
 */
export async function decryptPayload(
  envelope: EncryptedEnvelope,
  passphrase: string
): Promise<{ content: string; verified: boolean; sha256: string }> {
  try {
    const salt = base64ToBuffer(envelope.salt);
    const iv = base64ToBuffer(envelope.iv);
    const ciphertext = base64ToBuffer(envelope.ciphertext);

    const key = await deriveKeyFromPassphrase(passphrase, salt);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      ciphertext.buffer as ArrayBuffer
    );

    const content = new TextDecoder().decode(decryptedBuffer);
    const computedHash = await calculateSha256(content);
    const verified = computedHash.toLowerCase() === envelope.hash.toLowerCase();

    return {
      content,
      verified,
      sha256: computedHash,
    };
  } catch (error) {
    throw new Error('رمزگشایی ناموفق بود! ممکن است گذرواژه اشتباه باشد یا داده‌ها دستکاری شده باشند.');
  }
}

// Password strength evaluator
export function evaluatePasswordStrength(password: string): {
  score: number; // 0 to 4
  labelFa: string;
  labelEn: string;
  color: string;
} {
  if (!password) {
    return { score: 0, labelFa: 'خالی', labelEn: 'Empty', color: 'bg-slate-700' };
  }
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 14) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  switch (score) {
    case 0:
    case 1:
      return { score: 1, labelFa: 'ضعیف', labelEn: 'Weak', color: 'bg-rose-500' };
    case 2:
      return { score: 2, labelFa: 'متوسط', labelEn: 'Medium', color: 'bg-amber-500' };
    case 3:
      return { score: 3, labelFa: 'قوی', labelEn: 'Strong', color: 'bg-emerald-500' };
    default:
      return { score: 4, labelFa: 'بسیار امن (درجه نظامی)', labelEn: 'Military Grade', color: 'bg-cyan-400' };
  }
}
