import React, { useState, useRef, useEffect } from 'react';
import { getSessionTopic, createMqttClient, sendFileViaChunks, formatBytes } from '../utils/storage';
import { UploadCloud, ArrowLeft, Wifi, WifiOff, Loader2, Zap, CheckCircle, Clock, Gauge, Rabbit, Turtle, ShieldCheck } from 'lucide-react';
import { MqttClient } from 'mqtt';
import { TransferSpeed } from '../types';

interface ClientSessionProps {
  sessionId: string;
  onExit: () => void;
}

interface HistoryItem {
  name: string;
  size: number;
  time: string;
}

const ClientSession: React.FC<ClientSessionProps> = ({ sessionId, onExit }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [speed, setSpeed] = useState<TransferSpeed>('NORMAL');
  
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
               (pct) => setUploadProgress(`Передача ${file.name}: ${pct}%`),
               speed
             );

             // Добавляем в историю
             const newItem: HistoryItem = {
               name: file.name,
               size: file.size,
               time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
             };
             setHistory(prev => [newItem, ...prev]);

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
    }
  };

  const getSpeedIcon = () => {
    switch(speed) {
      case 'FAST': return <Rabbit className="w-10 h-10 text-pink-400" />;
      case 'NORMAL': return <ShieldCheck className="w-10 h-10 text-emerald-400" />;
      case 'SLOW': return <Turtle className="w-10 h-10 text-blue-400" />;
    }
  };

  return (
    <div className="max-w-md mx-auto w-full h-full flex flex-col animate-fade-in pb-8">
      <div className="flex items-center justify-between mb-4">
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

      {/* Выбор скорости */}
      <div className="bg-slate-800 rounded-xl p-3 mb-4 border border-slate-700 grid grid-cols-3 gap-2">
        <button 
          onClick={() => setSpeed('FAST')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${speed === 'FAST' ? 'bg-pink-900/30 border-pink-500 text-white' : 'border-transparent text-slate-500 hover:bg-slate-700'}`}
        >
          <Rabbit className="w-5 h-5 mb-1" />
          <span className="text-xs font-bold">Быстро</span>
        </button>
        <button 
          onClick={() => setSpeed('NORMAL')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${speed === 'NORMAL' ? 'bg-emerald-900/30 border-emerald-500 text-white' : 'border-transparent text-slate-500 hover:bg-slate-700'}`}
        >
          <ShieldCheck className="w-5 h-5 mb-1" />
          <span className="text-xs font-bold">Норма</span>
        </button>
        <button 
          onClick={() => setSpeed('SLOW')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${speed === 'SLOW' ? 'bg-blue-900/30 border-blue-500 text-white' : 'border-transparent text-slate-500 hover:bg-slate-700'}`}
        >
          <Turtle className="w-5 h-5 mb-1" />
          <span className="text-xs font-bold">Танк</span>
        </button>
      </div>
      
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl text-center mb-6">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-2 transition-all ${
          isConnected ? 'bg-indigo-900/20 border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-900 border-slate-700 opacity-50'
        }`}>
          {isUploading ? <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" /> : getSpeedIcon()}
        </div>
        
        {isUploading && (
          <div className="mb-4">
            <p className="text-emerald-300 text-sm font-mono mb-2">{uploadProgress}</p>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 transition-all duration-300 animate-pulse" style={{width: '100%'}}></div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Не закрывайте браузер</p>
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

      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center mb-6">
        <p className="text-xs text-slate-400">
          Лимит: <span className="text-white font-bold">8 МБ</span>. <br/>
          Если файл не доходит, выберите режим <b>"Танк"</b>.
        </p>
      </div>

      {/* История отправки */}
      <div className="flex-1">
        <h3 className="text-sm font-medium text-slate-400 mb-3 px-2">История отправки</h3>
        <div className="space-y-2">
            {history.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">Нет отправленных файлов</p>
            ) : (
                history.map((item, idx) => (
                    <div key={idx} className="bg-slate-800/50 p-3 rounded-lg flex items-center justify-between border border-slate-700/50">
                        <div className="flex items-center gap-3 min-w-0">
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm text-slate-200 truncate">{item.name}</p>
                                <p className="text-xs text-slate-500">{formatBytes(item.size)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>{item.time}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default ClientSession;