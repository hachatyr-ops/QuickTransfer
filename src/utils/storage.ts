import mqtt, { MqttClient } from 'mqtt';
import { TransferFile, FileChunk, MqttMessage } from '../types';

// Брокер EMQX (Публичный, но стабильный)
const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_PREFIX = 'quicktransfer/v9/session/';

export const generateShortId = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getSessionTopic = (sessionId: string) => `${TOPIC_PREFIX}${sessionId}`;

export const createMqttClient = () => {
  const clientId = 'qt-' + Math.random().toString(16).substr(2, 8);
  return mqtt.connect(MQTT_BROKER, {
    clientId,
    keepalive: 60,
    clean: true,
    reconnectPeriod: 2000,
    connectTimeout: 30 * 1000,
  });
};

// --- CHUNK TRANSFER LOGIC ---
// Оптимизация для файлов до 8-10 МБ
const CHUNK_SIZE = 32 * 1024; // 32KB chunks (Безопасный размер для большинства брокеров)

export const sendFileViaChunks = async (
  file: File, 
  client: MqttClient, 
  topic: string,
  onProgress: (pct: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));

    reader.onload = async (e) => {
      if (!e.target?.result) return reject('Read error');
      
      // Получаем Base64 строку (убираем заголовок data:image/...)
      const base64Full = (e.target.result as string).split(',')[1];
      const totalChunks = Math.ceil(base64Full.length / CHUNK_SIZE);
      const fileId = Math.random().toString(36).substring(7);

      console.log(`Starting transfer: ${file.name}, Size: ${file.size}, Chunks: ${totalChunks}`);

      for (let i = 0; i < totalChunks; i++) {
        // Проверка подключения перед каждым чанком
        if (!client.connected) {
          reject(new Error("Потеряно соединение с сервером"));
          return;
        }

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

        // Отправляем чанк. QoS 0 быстрее, но менее надежно. 
        // Используем QoS 0, но с задержкой, чтобы не забить канал.
        client.publish(topic, JSON.stringify(msg), { qos: 0 });
        
        const percent = Math.round(((i + 1) / totalChunks) * 100);
        onProgress(percent);
        
        // ВАЖНО: Задержка (Throttle). 
        // Если слать без задержки, брокер отключит нас за спам (Flood Protection).
        // 30-50мс достаточно для стабильности.
        await new Promise(r => setTimeout(r, 40)); 
      }
      resolve();
    };
    reader.readAsDataURL(file);
  });
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};