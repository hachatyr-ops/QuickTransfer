import React, { useState, useRef, useEffect } from 'react';
import { MqttMessage, TransferFile } from '../types';
import { getSessionTopic, createMqttClient, smartUpload, sendFileViaChunks } from '../utils/storage';
import { UploadCloud, ArrowLeft, Wifi, WifiOff, Loader2, Zap } from 'lucide-react';
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

  // Граница для прямой передачи (500KB)
  const DIRECT_LIMIT = 500 * 1024; 

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
        try {
          // Сценарий 1: Маленький файл -> Прямая передача кусками (Chunks)
          if (file.size <= DIRECT_LIMIT) {
             setUploadProgress(`Прямая передача ${file.name}...`);
             
             if (clientRef.current) {
               await sendFileViaChunks(
                 file, 
                 clientRef.current, 
                 getSessionTopic(sessionId), 
                 (pct) => setUploadProgress(`Отправка ${file.name}: ${pct}%`)
               );
             } else {
               throw new Error("Lost connection");
             }

          } 
          // Сценарий 2: Большой файл -> Облако
          else {
            setUploadProgress(`Загрузка в облако ${file.name}...`);
            const { link, expiry } = await smartUpload(file);
            
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
  
            clientRef.current?.publish(getSessionTopic(sessionId), JSON.stringify(mqttMsg), { qos: 1 });
          }
          
        } catch (error: any) {
          alert(`Ошибка ${file.name}: ${error.message}`);
          console.error(error);
        }
      }
      
      setUploadProgress('');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('Готово!');
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
            <h2 className="text-lg font-semibold text-white">Отправка файлов</h2>
             <div className="text-xs font-mono flex items-center gap-1">
                {isConnected ? <span className="text-emerald-400 flex items-center gap-1"><Wifi className="w-3 h-3"/> Подключено</span> : <span className="text-red-400 flex items-center gap-1"><WifiOff className="w-3 h-3"/> Поиск...</span>}
             </div>
            </div>
        </div>
      </div>
      
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl text-center mb-6">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-2 transition-all ${
          isConnected ? 'bg-indigo-900/20 border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-900 border-slate-700 opacity-50'
        }`}>
          {isUploading ? <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" /> : <UploadCloud className={`w-10 h-10 ${isConnected ? 'text-indigo-400' : 'text-slate-500'}`} />}
        </div>
        
        {isUploading && <p className="text-indigo-300 text-sm mb-4 font-mono">{uploadProgress}</p>}

        <label
          htmlFor="file-upload"
          className={`block w-full py-4 px-6 rounded-xl font-bold text-lg transition-all transform active:scale-95 ${
            isConnected && !isUploading
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl cursor-pointer'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isUploading ? 'Отправка...' : 'Выбрать файлы'}
        </label>
        <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" id="file-upload" disabled={!isConnected || isUploading} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center text-center">
          <Zap className="w-6 h-6 text-yellow-400 mb-2" />
          <h3 className="text-slate-300 text-xs font-bold uppercase mb-1">Мгновенно</h3>
          <p className="text-[10px] text-slate-500">Файлы до 500 КБ летят напрямую через сигнал.</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center text-center">
          <UploadCloud className="w-6 h-6 text-blue-400 mb-2" />
          <h3 className="text-slate-300 text-xs font-bold uppercase mb-1">Облако</h3>
          <p className="text-[10px] text-slate-500">Большие файлы через защищенный сервер.</p>
        </div>
      </div>
    </div>
  );
};

export default ClientSession;