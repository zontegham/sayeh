/**
 * Packetizer & Reassembler for Optical Air-Gap Diode
 * Splits encrypted payloads into QR frames and reassembles them sequentially or out-of-order
 */

import { ChunkPacket, EncryptedEnvelope, AssemblyProgress } from '../types/index';

// Simple fast CRC32 for chunk validation
export function crc32(str: string): string {
  let crc = 0 ^ (-1);
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xff];
  }
  return ((crc ^ (-1)) >>> 0).toString(16).padStart(8, '0');
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c;
}

/**
 * Split an encrypted envelope string into QR frame chunks
 */
export function packetizeEnvelope(
  envelope: EncryptedEnvelope,
  chunkSize: number = 420
): { chunks: string[]; packets: ChunkPacket[] } {
  const envelopeJson = JSON.stringify(envelope);
  const totalLength = envelopeJson.length;
  const totalChunks = Math.ceil(totalLength / chunkSize);

  const fullHash = envelope.hash.substring(0, 16); // compact hash
  const fileNameSafe = envelope.fileName ? btoa(encodeURIComponent(envelope.fileName)) : '';
  const fileTypeSafe = envelope.fileType ? btoa(envelope.fileType) : '';

  const chunks: string[] = [];
  const packets: ChunkPacket[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalLength);
    const chunkData = envelopeJson.substring(start, end);
    const chunkHash = crc32(chunkData);

    // Wire protocol: AIRD:v2:<id>:<idx>:<total>:<chunkCrc>:<fullHash>:<bytes>:<fname>:<ftype>:<data>
    const qrString = `AIRD:v2:${envelope.transferId}:${i + 1}:${totalChunks}:${chunkHash}:${fullHash}:${envelope.totalBytes}:${fileNameSafe}:${fileTypeSafe}:${chunkData}`;

    chunks.push(qrString);
    packets.push({
      version: 2,
      transferId: envelope.transferId,
      index: i + 1,
      total: totalChunks,
      fileName: envelope.fileName || 'transfer.bin',
      fileType: envelope.fileType || 'application/octet-stream',
      totalBytes: envelope.totalBytes,
      chunkData,
      chunkHash,
      fullHash,
    });
  }

  return { chunks, packets };
}

/**
 * Parse a scanned QR code text into a ChunkPacket
 */
export function parseScannedChunk(rawQrText: string): ChunkPacket | null {
  if (!rawQrText || !rawQrText.startsWith('AIRD:v2:')) {
    // Might be raw JSON if user scanned a legacy single-code
    try {
      if (rawQrText.startsWith('{') && rawQrText.includes('"ciphertext"')) {
        const parsed = JSON.parse(rawQrText) as EncryptedEnvelope;
        return {
          version: 2,
          transferId: parsed.transferId,
          index: 1,
          total: 1,
          fileName: parsed.fileName || 'data.bin',
          fileType: parsed.fileType || 'text/plain',
          totalBytes: parsed.totalBytes,
          chunkData: rawQrText,
          chunkHash: crc32(rawQrText),
          fullHash: parsed.hash.substring(0, 16),
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  // Robustly find the 10th colon to cleanly separate metadata header from payload body
  let colonCount = 0;
  let tenthColonIndex = -1;
  for (let i = 0; i < rawQrText.length; i++) {
    if (rawQrText[i] === ':') {
      colonCount++;
      if (colonCount === 10) {
        tenthColonIndex = i;
        break;
      }
    }
  }

  if (tenthColonIndex === -1) return null;

  const headerPrefix = rawQrText.substring(0, tenthColonIndex);
  const chunkData = rawQrText.substring(tenthColonIndex + 1);
  const parts = headerPrefix.split(':');

  if (parts.length < 10) return null;

  const [, , transferId, idxStr, totalStr, chunkCrc, fullHash, totalBytesStr, fnameSafe, ftypeSafe] = parts;

  // Validate chunk CRC
  const computedCrc = crc32(chunkData);
  if (computedCrc.toLowerCase() !== chunkCrc.toLowerCase()) {
    console.warn('CRC mismatch on chunk', idxStr, computedCrc, '!=', chunkCrc);
    return null;
  }

  let fileName = 'payload.bin';
  if (fnameSafe) {
    try {
      fileName = decodeURIComponent(atob(fnameSafe));
    } catch {
      fileName = 'data.bin';
    }
  }

  let fileType = 'application/octet-stream';
  if (ftypeSafe) {
    try {
      fileType = atob(ftypeSafe);
    } catch {
      fileType = 'application/octet-stream';
    }
  }

  return {
    version: 2,
    transferId,
    index: parseInt(idxStr, 10),
    total: parseInt(totalStr, 10),
    fileName,
    fileType,
    totalBytes: parseInt(totalBytesStr, 10) || 0,
    chunkData,
    chunkHash: chunkCrc,
    fullHash,
  };
}

/**
 * Handle accumulating progress and check if transfer complete
 */
export function accumulateChunk(
  current: AssemblyProgress | null,
  packet: ChunkPacket
): { progress: AssemblyProgress; isComplete: boolean; envelope: EncryptedEnvelope | null } {
  // If different transfer or null, start fresh
  let progress: AssemblyProgress;
  if (!current || current.transferId !== packet.transferId) {
    progress = {
      transferId: packet.transferId,
      fileName: packet.fileName,
      fileType: packet.fileType,
      totalBytes: packet.totalBytes,
      totalChunks: packet.total,
      receivedIndices: new Set<number>([packet.index]),
      chunks: new Map<number, string>([[packet.index, packet.chunkData]]),
      fullHash: packet.fullHash,
      firstReceivedAt: Date.now(),
      lastReceivedAt: Date.now(),
    };
  } else {
    progress = {
      ...current,
      receivedIndices: new Set(current.receivedIndices).add(packet.index),
      chunks: new Map(current.chunks).set(packet.index, packet.chunkData),
      lastReceivedAt: Date.now(),
    };
  }

  const isComplete = progress.receivedIndices.size === progress.totalChunks;

  if (isComplete) {
    // Assemble all chunks in order
    let combined = '';
    for (let i = 1; i <= progress.totalChunks; i++) {
      combined += progress.chunks.get(i) || '';
    }

    try {
      const envelope = JSON.parse(combined) as EncryptedEnvelope;
      return { progress, isComplete: true, envelope };
    } catch (e) {
      console.error('Failed to parse assembled envelope JSON', e);
      return { progress, isComplete: false, envelope: null };
    }
  }

  return { progress, isComplete: false, envelope: null };
}
