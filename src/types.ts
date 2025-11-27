export interface TransferFile {
  id: string;
  name: string;
  size: number;
  type: string;
  downloadUrl?: string; // Может отсутствовать, если передаем base64
  fileData?: string;    // Base64 данные для мелких файлов
  expires: string;
  uploadedAt: number;
}

export enum AppMode {
  LANDING = 'LANDING',
  HOST = 'HOST', // PC
  CLIENT = 'CLIENT', // Mobile
}

export const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Типы сообщений
export interface MqttMessage {
  type: 'file-shared' | 'file-chunk' | 'handshake-syn' | 'handshake-ack' | 'switch-role';
  payload: any;
}

export interface FileChunk {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  chunkIndex: number;
  totalChunks: number;
  data: string; // Base64 chunk
}

export type TransferSpeed = 'FAST' | 'NORMAL' | 'SLOW';
export type ConnectionStatus = 'CONNECTING' | 'VERIFYING' | 'CONNECTED' | 'FAILED';