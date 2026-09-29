export type Language = 'fa' | 'en';

export type AppMode = 'transmitter' | 'receiver' | 'integrations' | 'keys' | 'history';

export interface EncryptedEnvelope {
  version: number;
  transferId: string;
  iv: string; // Base64
  salt: string; // Base64
  ciphertext: string; // Base64
  hash: string; // SHA-256 of plaintext
  totalBytes: number;
  fileName?: string;
  fileType?: string;
  timestamp: number;
}

export interface ChunkPacket {
  version: number;
  transferId: string;
  index: number;
  total: number;
  fileName: string;
  fileType: string;
  totalBytes: number;
  chunkData: string;
  chunkHash: string;
  fullHash: string;
}

export interface AssemblyProgress {
  transferId: string;
  fileName: string;
  fileType: string;
  totalBytes: number;
  totalChunks: number;
  receivedIndices: Set<number>;
  chunks: Map<number, string>;
  fullHash: string;
  firstReceivedAt: number;
  lastReceivedAt: number;
}

export interface DecryptedPayload {
  transferId: string;
  fileName?: string;
  fileType: string;
  content: string; // Text or Base64
  isBinary: boolean;
  totalBytes: number;
  timestamp: number;
  verified: boolean;
  sha256: string;
}

export interface SystemIntegrationConfig {
  id: string;
  name: string;
  type: 'inbound_poll' | 'inbound_webhook' | 'outbound_forward';
  targetUrl: string;
  method: 'GET' | 'POST' | 'PUT';
  headers: Record<string, string>;
  pollIntervalSec: number;
  active: boolean;
  lastSync?: number;
  lastStatus?: 'success' | 'error' | 'idle';
  lastPayload?: string;
}

export interface StoredKey {
  id: string;
  name: string;
  keyHex: string;
  createdAt: number;
  notes?: string;
}

export interface AuditLog {
  id: string;
  type: 'sent' | 'received';
  fileName?: string;
  fileType: string;
  totalBytes: number;
  transferId: string;
  sha256: string;
  timestamp: number;
  status: 'success' | 'tampered' | 'corrupt';
}
