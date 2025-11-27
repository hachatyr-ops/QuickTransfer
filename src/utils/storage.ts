import mqtt, { MqttClient } from 'mqtt';
import { TransferFile, FileChunk, MqttMessage } from '../types';

// Брокер EMQX
const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_PREFIX = 'quicktransfer/v8/session/';

export const generateShortId = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getSessionTopic = (sessionId: string) => `${TOPIC_PREFIX}${sessionId}`;

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

// --- CHUNK TRANSFER LOGIC (Для файлов < 500KB) ---
const CHUNK_SIZE = 15 * 1024; // 15KB chunks (MQTT limit safe)

export const sendFileViaChunks = async (
  file: File, 
  client: MqttClient, 
  topic: string,
  onProgress: (pct: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target?.result) return reject('Read error');
      
      const base64Full = (e.target.result as string).split(',')[1];
      const totalChunks = Math.ceil(base64Full.length / CHUNK_SIZE);
      const fileId = Math.random().toString(36).substring(7);

      console.log(`Starting chunk transfer: ${file.name}, ${totalChunks} chunks`);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = start + CHUNK_SIZE;
        const chunkData = base64Full.substring(start, end);

        const chunk: FileChunk = {
          fileId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          chunkIndex: i,
          totalChunks,
          data: chunkData
        };

        const msg: MqttMessage = {
          type: 'file-chunk',
          payload: chunk
        };

        client.publish(topic, JSON.stringify(msg), { qos: 0 }); // QoS 0 for speed
        
        onProgress(Math.round(((i + 1) / totalChunks) * 100));
        
        // Маленькая задержка, чтобы не забить канал
        await new Promise(r => setTimeout(r, 10)); 
      }
      resolve();
    };
    reader.readAsDataURL(file);
  });
};


// --- CLOUD UPLOAD LOGIC (Для файлов > 500KB) ---

interface UploadResult {
  link: string;
  expiry: string;
}

const uploadToFileIo = async (file: File): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('https://file.io/?expires=1d', { method: 'POST', body: formData });
  if (!response.ok) throw new Error('File.io busy');
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  return { link: data.link, expiry: '1 скачивание' };
};

// Main Upload Function
export const smartUpload = async (file: File): Promise<UploadResult> => {
  // Попытка 1: File.io
  try {
    return await uploadToFileIo(file);
  } catch (err) {
    console.warn('File.io failed, trying fallback...', err);
  }

  throw new Error('Облачные серверы перегружены. Для надежности передавайте файлы меньше 500 КБ (они летят напрямую).');
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};