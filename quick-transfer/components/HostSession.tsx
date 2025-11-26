import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { TransferFile, SESSION_DURATION_MS } from '../types';
import { getPeerId, formatBytes } from '../utils/storage';
import { Peer, DataConnection } from 'peerjs';
import { Clock, FileText, Image as ImageIcon, Film, Music, Download, Trash2, Smartphone, Loader2, Wifi, WifiOff } from 'lucide-react';

interface HostSessionProps {
  sessionId: string;
  onExit: () => void;
}

const HostSession: React.FC<HostSessionProps> = ({ sessionId, onExit }) => {
  const [files, setFiles] = useState<TransferFile[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('30:00');
  const [peerStatus, setPeerStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');
  const [connections, setConnections] = useState<number>(0);
  
  const peerRef = useRef<Peer | null>(null);

  // Initialize PeerJS Host
  useEffect(() => {
    const peerId = getPeerId(sessionId);
    
    // Create a new Peer with the specific ID
    const peer = new Peer(peerId, {
      debug: 1,
    });

    peer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      setPeerStatus('ready');
    });

    peer.on('connection', (conn) => {
      console.log('Incoming connection from client');
      setConnections(prev => prev + 1);

      conn.on('data', (data: any) => {
        // Handle incoming data
        if (data && data.type === 'file-transfer' && data.file) {
           setFiles(prev => [data.file, ...prev]);
        }
      });

      conn.on('close', () => {
        setConnections(prev => Math.max(0, prev - 1));
      });
      
      conn.on('error', () => {
        setConnections(prev => Math.max(0, prev - 1));
      });
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      // If ID is taken or network fails
      if (err.type === 'unavailable-id') {
        alert('Этот ID сессии занят или произошла ошибка сети. Попробуйте создать новую сессию.');
        onExit();
      } else {
        setPeerStatus('error');
      }
    });

    peerRef.current = peer;

    // Timer logic
    const startTime = Date.now();
    const endTime = startTime + SESSION_DURATION_MS;

    const timerInterval = setInterval(() => {
      const now = Date.now();
      const diff = endTime - now;
      
      if (diff <= 0) {
        onExit();
      } else {
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      clearInterval(timerInterval);
    };
  }, [sessionId, onExit]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-400" />;
    if (type.startsWith('video/')) return <Film className="w-5 h-5 text-red-400" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-yellow-400" />;
    return <FileText className="w-5 h-5 text-blue-400" />;
  };

  const handleDownload = (file: TransferFile) => {
    if (!file.dataUrl) return;
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}#/join/${sessionId}`;

  return (
    <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
      {/* Sidebar / Info Panel */}
      <div className="md:col-span-1 space-y-4">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col items-center text-center">
          <h2 className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider">Подключение</h2>
          
          <div className="bg-white p-3 rounded-xl mb-4 relative">
             {peerStatus === 'initializing' && (
               <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                 <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
               </div>
             )}
             {peerStatus === 'error' && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10 text-red-500 font-bold text-xs">
                  Ошибка сети
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
              connections > 0 
                ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-900/50 border-slate-700 text-slate-500'
            }`}>
              {connections > 0 ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="text-xs font-medium">
                {connections > 0 ? 'Устройство подключено' : 'Ожидание...'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Истекает через</span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-3xl font-mono font-bold text-white text-center">
            {timeLeft}
          </div>
        </div>

        <button 
          onClick={onExit}
          className="w-full py-3 flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Завершить сессию</span>
        </button>
      </div>

      {/* Main Content / File List */}
      <div className="md:col-span-2">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl min-h-[500px] flex flex-col">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className={`relative flex h-3 w-3 ${connections > 0 ? '' : 'hidden'}`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Полученные файлы
            </h2>
            <span className="text-sm text-slate-400 bg-slate-900 px-3 py-1 rounded-full">
              {files.length} шт.
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-50">
                <Download className="w-16 h-16 stroke-1" />
                <p>Ожидание файлов с устройства...</p>
              </div>
            ) : (
              files.map((file) => (
                <div key={file.id} className="group flex items-center p-4 bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-indigo-500/30 rounded-xl transition-all duration-200">
                  <div className="p-3 bg-slate-800 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-slate-200 truncate">{file.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleTimeString()}</p>
                  </div>
                  <button 
                    onClick={() => handleDownload(file)}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                    title="Скачать"
                  >
                    <Download className="w-5 h-5" />
                  </button>
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