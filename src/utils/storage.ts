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

// Загрузка файла на file.io (анонимный обменник, удаляет файл после 1 скачивания)
export const uploadToFileIo = async (file: File): Promise<{ link: string; expiry: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  // expires: 1d (1 день), autoDelete: true (удалить после скачивания)
  
  try {
    const response = await fetch('https://file.io/?expires=1d', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Ошибка загрузки на сервер');
    }

    const data = await response.json();
    if (data.success) {
      return { link: data.link, expiry: data.expiry };
    } else {
      throw new Error(data.message || 'Unknown upload error');
    }
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

// Хелпер для форматирования байт
export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};