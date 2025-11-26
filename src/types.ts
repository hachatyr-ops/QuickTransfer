export interface TransferFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  uploadedAt: number;
}

export interface SessionData {
  sessionId: string;
  createdAt: number;
  expiresAt: number;
  files: TransferFile[];
}

export enum AppMode {
  LANDING = 'LANDING',
  HOST = 'HOST', // PC
  CLIENT = 'CLIENT', // Mobile
}

export const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes