import { Peer, PeerOptions } from 'peerjs';
import { TransferFile } from '../types';

// Prefix to avoid collisions on the public PeerJS server
const ID_PREFIX = 'quicktransfer-app-v1-';

export const generateShortId = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getPeerId = (shortId: string) => `${ID_PREFIX}${shortId}`;

// PeerJS Configuration
// Added multiple STUN servers to increase chance of NAT traversal on mobile networks
// Added pingInterval to keep WebSocket alive
export const PEER_CONFIG: PeerOptions = {
  debug: 1,
  secure: true,
  pingInterval: 5000, // Send heartbeat every 5 seconds to prevent connection drop
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ],
    iceCandidatePoolSize: 10,
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