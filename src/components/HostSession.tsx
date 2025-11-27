import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { TransferFile, SESSION_DURATION_MS, MqttMessage, FileChunk } from '../types';
import { getSessionTopic, createMqttClient, formatBytes } from '../utils/storage';
import { FileText, Image as ImageIcon, Film, Music, Download, Trash2, Smartphone, Loader2, Wifi, WifiOff } from 'lucide-react';
import { MqttClient } from 'mqtt';

interface HostSessionProps {
  sessionId: string;
  onExit: () => void;
  onSwitchRole: () => void;
}

const HostSession: React.FC<HostSessionProps> = ({ sessionId, onExit, onSwitchRole }) => {
  const [files, setFiles] = useState<TransferFile[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('30:00');
  const [isConnected, setIsConnected] = useState(false);
  
  // Состояние приема для UI
  const [receivingState, setReceivingState] = useState<{name: string, progress: number} | null>(null);

  const chunksBuffer = useRef<Map<string, any>>(new Map());
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    const client = createMqttClient();
    const topic = getSessionTopic(sessionId);

    client.on('connect', () => {
      console.log('Host connected');
      setIsConnected(true);
      client.subscribe(topic);
    });

    client.on('message', (topic, message) => {
      try {
        const parsed: MqttMessage = JSON.parse(message.toString());

        // --- ЛОГИКА РУКОПОЖАТИЯ ---
        if (parsed.type === 'handshake-syn') {
            const clientId = parsed.payload.clientId;
            console.log(`Handshake request from: ${clientId}`);
            
            // Отправляем подтверждение (ACK), что мы живы
            const ackMsg: MqttMessage = {
                type: 'handshake-ack',
                payload: { targetId: clientId }
            };
            client.publish(topic, JSON.stringify(ackMsg));
            return;
        }

        // --- СМЕНА РОЛИ (Поступила команда от Клиента) ---
        if (parsed.type === 'switch-role') {
            onSwitchRole();
            return;
        }

        if (parsed.type === 'file-chunk') {
          const chunk: FileChunk = parsed.payload;
          const { fileId, chunkIndex, totalChunks, data, fileName, fileType, fileSize } = chunk;

          if (!chunksBuffer.current.has(fileId)) {
            chunksBuffer.current.set(fileId, {
              chunks: new Array(totalChunks).fill(null),
              receivedCount: 0,
              fileName,
              fileType,
              fileSize
            });
          }

          const buffer = chunksBuffer.current.get(fileId);
          if (buffer.chunks[chunkIndex] === null) {
            buffer.chunks[chunkIndex] = data;
            buffer.receivedCount++;
          }
          
          // Обновляем UI прогресс
          const pct = Math.round((buffer.receivedCount / totalChunks) * 100);
          setReceivingState({ name: fileName, progress: pct });

          // Если собрали все куски
          if (buffer.receivedCount === totalChunks) {
            console.log(`File assembled: ${fileName}`);
            setReceivingState(null);
            
            // Собираем Base64
            const fullBase64 = buffer.chunks.join('');
            const downloadUrl = `data:${fileType};base64,${fullBase64}`;
            
            const newFile: TransferFile = {
              id: fileId,
              name: fileName,
              size: fileSize,
              type: fileType,
              downloadUrl: downloadUrl,
              expires: 'Локально',
              uploadedAt: Date.now()
            };

            setFiles(prev => [newFile, ...prev]);
            chunksBuffer.current.delete(fileId); // Очистка памяти
          }
        }

      } catch (e) {
        console.error('Failed to parse message', e);
      }
    });

    client.on('reconnect', () => {
        console.log('Host reconnecting...');
        setIsConnected(false);
    });
    
    client.on('offline', () => {
        setIsConnected(false);
    });

    clientRef.current = client;

    // Таймер
    const startTime = Date.now();
    const endTime = startTime + SESSION_DURATION_MS;
    const timerInterval = setInterval(() => {
      const now = Date.now();
      const diff = endTime - now;
      if (diff <= 0) onExit();
      else {
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => {
      client.end();
      clearInterval(timerInterval);
    };
  }, [sessionId, onExit, onSwitchRole]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-400" />;
    if (type.startsWith('video/')) return <Film className="w-5 h-5 text-red-400" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-yellow-400" />;
    return <FileText className="w-5 h-5 text-blue-400" />;
  };

  const shareUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}#/join/${sessionId}`;

  return (
    <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in pb-12">
      <div className="md:col-span-1 space-y-4">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col items-center text-center">
          <h2 className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider">Подключение</h2>
          
          <div className="bg-white p-3 rounded-xl mb-4 relative">
             {!isConnected && (
               <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10 text-orange-500 font-bold text-xs">
                 <Loader2 className="w-6 h-6 animate-spin mb-1" />
                 <span>Связь...</span>
               </div>
             )}
             <QRCodeSVG value={shareUrl} size={160} />
          </div>
          
          <p className="text-xs text-slate-500 mb-2">Сканируйте камерой телефона</p>
          
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-700">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-mono text-indigo-300">ID: {sessionId}</span>
            </div>
            <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border ${
              isConnected ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-red-900/20 border-red-700 text-red-500'
            }`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="text-xs font-medium">{isConnected ? 'В сети' : 'Нет связи'}</span>
            </div>
          </div>
        </div>

        <button onClick={onExit} className="w-full py-3 flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors">
          <Trash2 className="w-4 h-4" /> <span>Завершить сессию</span>
        </button>
      </div>

      <div className="md:col-span-2">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl min-h-[500px] flex flex-col">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">Полученные файлы</h2>
            <span className="text-sm text-slate-400 bg-slate-900 px-3 py-1 rounded-full">{files.length} шт.</span>
          </div>
          
          {receivingState && (
            <div className="px-6 py-3 bg-indigo-900/30 border-b border-indigo-500/20">
              <div className="flex justify-between text-xs text-indigo-300 mb-1">
                 <span>Прием: {receivingState.name}</span>
                 <span>{receivingState.progress}%</span>
              </div>
              <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-300" style={{width: `${receivingState.progress}%`}}></div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-50">
                <Download className="w-16 h-16 stroke-1" />
                <p>Отправьте файл с телефона...</p>
              </div>
            ) : (
              files.map((file) => (
                <div key={file.id} className="group flex items-center p-4 bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-emerald-500/30 rounded-xl transition-all duration-200">
                  <div className="p-3 bg-slate-800 rounded-lg mr-4">{getFileIcon(file.type)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-slate-200 truncate">{file.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{formatBytes(file.size)}</p>
                  </div>
                  <a href={file.downloadUrl} download={file.name} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                    <Download className="w-4 h-4" /> Скачать
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostSession;