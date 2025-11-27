import React, { useState, useRef, useEffect } from 'react';
import { getSessionTopic, createMqttClient, sendFileViaChunks, formatBytes } from '../utils/storage';
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

  // Жесткий лимит 8 МБ для браузерного JS
  const MAX_SIZE = 8 * 1024 * 1024; 

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
        alert('Нет соединения с сервером. Подождите...');
        return;
      }

      const files = Array.from(e.target.files);

      // Проверка размеров
      for (const file of files) {
        if (file.size > MAX_SIZE) {
          alert(`Файл "${file.name}" слишком большой (${formatBytes(file.size)}).\nЛимит: 8 МБ.`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      setIsUploading(true);

      for (const file of files) {
        try {
           setUploadProgress(`Отправка ${file.name}...`);
           
           if (clientRef.current) {
             await sendFileViaChunks(
               file, 
               clientRef.current, 
               getSessionTopic(sessionId), 
               (pct) => setUploadProgress(`Передача ${file.name}: ${pct}%`)
             );
           } else {
             throw new Error("Lost connection");
           }
          
        } catch (error: any) {
          alert(`Ошибка ${file.name}: ${error.message}`);
          console.error(error);
        }
      }
      
      setUploadProgress('');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('Файлы успешно отправлены!');
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
            <h2 className="text-lg font-semibold text-white">Прямая отправка</h2>
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
          {isUploading ? <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" /> : <Zap className={`w-10 h-10 ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`} />}
        </div>
        
        {isUploading && (
          <div className="mb-4">
            <p className="text-emerald-300 text-sm font-mono mb-2">{uploadProgress}</p>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 transition-all duration-300 animate-pulse" style={{width: '100%'}}></div>
            </div>
          </div>
        )}

        <label
          htmlFor="file-upload"
          className={`block w-full py-4 px-6 rounded-xl font-bold text-lg transition-all transform active:scale-95 ${
            isConnected && !isUploading
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl cursor-pointer'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isUploading ? 'Идет передача...' : 'Выбрать файлы'}
        </label>
        <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" id="file-upload" disabled={!isConnected || isUploading} />
      </div>

      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center">
        <p className="text-xs text-slate-400">
          Максимальный размер файла: <span className="text-white font-bold">8 МБ</span>.
          <br/>Файлы передаются напрямую, без облака.
        </p>
      </div>
    </div>
  );
};

export default ClientSession;