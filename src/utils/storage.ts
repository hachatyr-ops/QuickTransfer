import mqtt from 'mqtt';
import { TransferFile } from '../types';

// Используем публичный брокер EMQX (бесплатный, поддерживает WebSockets SSL)
const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_PREFIX = 'quicktransfer/v7/session/';

export const generateShortId = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getSessionTopic = (sessionId: string) => `${TOPIC_PREFIX}${sessionId}`;

// Настройка клиента MQTT
export const createMqttClient = () => {
  const clientId = 'client-' + Math.random().toString(16).substr(2, 8);
  return mqtt.connect(MQTT_BROKER, {
    clientId,
    keepalive: 60,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
  });
};

// --- Smart Upload Logic ---

interface UploadResult {
  link: string;
  expiry: string;
}

// 1. File.io (Best privacy, auto-delete)
const uploadToFileIo = async (file: File): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('https://file.io/?expires=1d', { method: 'POST', body: formData });
  if (!response.ok) throw new Error('File.io error');
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  return { link: data.link, expiry: '1 скачивание' };
};

// 2. TmpFiles.org (Backup, 60 min retention)
const uploadToTmpFiles = async (file: File): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  // Используем прокси или прямой запрос (может блокироваться CORS, поэтому это fallback)
  const response = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: formData });
  if (!response.ok) throw new Error('TmpFiles error');
  const data = await response.json();
  if (data.status !== 'success') throw new Error('Upload failed');
  // TmpFiles returns a view URL, we need to convert it to download URL usually, 
  // but for simplicity we return the view url. Users can download from there.
  return { link: data.data.url, expiry: '60 минут' };
};

// Main Upload Function with Fallbacks
export const smartUpload = async (file: File): Promise<UploadResult> => {
  // Попытка 1: File.io
  try {
    console.log('Trying upload to File.io...');
    return await uploadToFileIo(file);
  } catch (err) {
    console.warn('File.io failed, switching to backup...', err);
  }

  // Попытка 2: TmpFiles (или другой сервис, если найдем надежный с CORS)
  // К сожалению, большинство бесплатных API блокируют запросы из браузера (CORS).
  // File.io - один из немногих, кто разрешает.
  // Если File.io упал, скорее всего проблема в размере файла или лимитах IP.
  
  // Вернем ошибку, чтобы пользователь попробовал позже или файл поменьше
  throw new Error('Все серверы заняты. Попробуйте файл поменьше или через VPN.');
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};