import React, { useState, useRef, useEffect } from 'react';
import { MqttMessage, TransferFile } from '../types';
import { getSessionTopic, createMqttClient, smartUpload } from '../utils/storage';
import { UploadCloud, ArrowLeft, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { MqttClient } from 'mqtt';

interface ClientSessionProps {
  sessionId: string;
  onExit: () => void;
}

const ClientSession: React.FC<ClientSessionProps> = ({ sessionId, onExit }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    const client = createMqttClient();
    client.on('connect', () => setIsConnected(true));
    client.on('offline', () => setIsConnected(false));
    client.on('reconnect', () => setIsConnected(false));
    clientRef.current = client;

    return () => { client.end(); };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (!isConnected) {
        alert('Нет соединения с сервером сигналов. Подождите...');
        return;
      }

      setIsUploading(true);
      const files = Array.from(e.target.files);

      for (const file of files) {
        setUploadProgress(`Загрузка ${file.name}...`);
        try {
          // ИСПОЛЬЗУЕМ SMART UPLOAD
          const { link, expiry } = await smartUpload(file);
          
          // Формируем сообщение
          const messagePayload: TransferFile = {
            id: Math.random().toString(36).substring(7),
            name: file.name,
            size: file.size,
            type: file.type,
            downloadUrl: link,
            expires: expiry,
            uploadedAt: Date.now(),
          };

          const mqttMsg: MqttMessage = {
            type: 'file-shared',
            payload: messagePayload
          };

          // Отправляем ссылку на ПК через MQTT
          clientRef.current?.publish(getSessionTopic(sessionId), JSON.stringify(mqttMsg), { qos: 1 });
          
        } catch (error: any) {
          alert(`Ошибка загрузки ${file.name}: ${error.message}`);
          console.error(error);
        }
      }
      
      setUploadProgress('');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('Файлы отправлены на ПК!');
    }
  };

  return (
    <div className="max-w-md mx-auto w-full h-full flex flex-col animate-fade-in pb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
            <button onClick={onExit} className="p-2 -ml-2 text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="ml-2">
            <h2 className="text-lg font-semibold text-white">Отправка в облако</h2>
             <div className="text-xs font-mono flex items-center gap-1">
                {isConnected ? <span className="text-emerald-400 flex items-center gap-1"><Wifi className="w-3 h-3"/> В сети</span> : <span className="text-red-400 flex items-center gap-1"><WifiOff className="w-3 h-3"/> Поиск сети...</span>}
             </div>
            </div>
        </div>
      </div>
      
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl text-center mb-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border transition-colors ${
          isConnected ? 'bg-indigo-900/20 border-indigo-500' : 'bg-slate-900 border-slate-700 opacity-50'
        }`}>
          {isUploading ? <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /> : <UploadCloud className={`w-8 h-8 ${isConnected ? 'text-indigo-500' : 'text-slate-500'}`} />}
        </div>
        
        {isUploading && <p className="text-indigo-300 text-sm mb-4 animate-pulse">{uploadProgress}</p>}

        <label
          htmlFor="file-upload"
          className={`block w-full py-4 px-6 rounded-xl font-semibold transition-all ${
            isConnected && !isUploading
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg cursor-pointer'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isUploading ? 'Подождите...' : 'Выбрать файлы'}
        </label>
        <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" id="file-upload" disabled={!isConnected || isUploading} />
      </div>

      <div className="bg-slate-900/50 p-4 rounded-xl text-xs text-slate-500 text-center border border-slate-800">
        Файлы загружаются на защищенный временный сервер и удаляются сразу после скачивания на ПК.
      </div>
    </div>
  );
};

export default ClientSession;