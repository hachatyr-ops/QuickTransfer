export interface TransferFile {
  id: string;
  name: string;
  size: number;
  type: string;
  downloadUrl: string; // Ссылка на скачивание
  expires: string;     // Когда удалится
  uploadedAt: number;
}

export enum AppMode {
  LANDING = 'LANDING',
  HOST = 'HOST', // PC
  CLIENT = 'CLIENT', // Mobile
}

export const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Структура сообщения через MQTT
export interface MqttMessage {
  type: 'file-shared';
  payload: TransferFile;
}