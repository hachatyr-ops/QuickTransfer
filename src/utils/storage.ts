import { Peer, PeerOptions } from 'peerjs';
import { TransferFile } from '../types';

// Prefix to avoid collisions on the public PeerJS server
const ID_PREFIX = 'quicktransfer-app-v1-';

export const generateShortId = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getPeerId = (shortId: string) => `${ID_PREFIX}${shortId}`;

// PeerJS Configuration
export const PEER_CONFIG: PeerOptions = {
  debug: 1,
  secure: true, // Critical for Vercel/HTTPS
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

// Helper to format bytes
export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export type PeerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PeerMessage {
  type: 'file-transfer';
  file: TransferFile;
}