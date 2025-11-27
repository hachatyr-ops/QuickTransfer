import mqtt, { MqttClient } from 'mqtt';
import { TransferFile, FileChunk, MqttMessage, TransferSpeed } from '../types';

// Брокер EMQX (Публичный, но стабильный)
const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_PREFIX = 'quicktransfer/v10/session/';

// Конфигурация скоростей
const SPEED_CONFIG = {
  FAST: {
    chunkSize: 64 * 1024, // 64KB
    delay: 15,            // Очень быстро
    cooldownIdx: 50,      // Редкие паузы
    cooldownTime: 200     // Короткие паузы
  },
  NORMAL: {
    chunkSize: 32 * 1024, // 32KB
    delay: 100,           // Средняя скорость
    cooldownIdx: 10,      // Регулярные паузы
    cooldownTime: 1000    // Секундная передышка
  },
  SLOW: {
    chunkSize: 16 * 1024, // 16KB (надежнее)
    delay: 300,           // Медленно
    cooldownIdx: 5,       // Частые паузы
    cooldownTime: 2000    // Длинная передышка
  }
};

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

export const sendFileViaChunks = async (
  file: File, 
  client: MqttClient, 
  topic: string,
  onProgress: (pct: number) => void,
  speed: TransferSpeed = 'NORMAL'
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const config = SPEED_CONFIG[speed];
    
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));

    reader.onload = async (e) => {
      if (!e.target?.result) return reject('Read error');
      
      // Получаем Base64 строку (убираем заголовок data:image/...)
      const base64Full = (e.target.result as string).split(',')[1];
      const totalChunks = Math.ceil(base64Full.length / config.chunkSize);
      const fileId = Math.random().toString(36).substring(7);

      console.log(`Starting transfer (${speed}): ${file.name}, Size: ${file.size}, Chunks: ${totalChunks}`);

      for (let i = 0; i < totalChunks; i++) {
        // Проверка подключения перед каждым чанком
        if (!client.connected) {
          reject(new Error("Потеряно соединение с сервером"));
          return;
        }

        const start = i * config.chunkSize;
        const end = start + config.chunkSize;
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

        // Отправляем чанк
        client.publish(topic, JSON.stringify(msg), { qos: 0 });
        
        const percent = Math.round(((i + 1) / totalChunks) * 100);
        onProgress(percent);
        
        // --- АЛГОРИТМ ЗАДЕРЖКИ ---
        let currentDelay = config.delay;

        // Пауза для сброса анти-спам фильтров брокера
        if (i > 0 && i % config.cooldownIdx === 0) {
            currentDelay = config.cooldownTime;
            console.log(`[${speed}] Cooldown pause...`);
        }

        await new Promise(r => setTimeout(r, currentDelay)); 
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