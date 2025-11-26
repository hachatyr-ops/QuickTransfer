import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TransferFile } from '../types';
import { getPeerId, formatBytes, PEER_CONFIG } from '../utils/storage';
import { Peer, DataConnection } from 'peerjs';
import { UploadCloud, CheckCircle, File as FileIcon, Loader2, ArrowLeft, Wifi, WifiOff, RefreshCw, AlertCircle, Info, Terminal } from 'lucide-react';

interface ClientSessionProps {
  sessionId: string;
  onExit: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB Limit for stability

const ClientSession: React.FC<ClientSessionProps> = ({ sessionId, onExit }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<TransferFile[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'timeout'>('connecting');
  const [logs, setLogs] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debug Logger
  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev]);
  }, []);

  const connectToPeer = useCallback(() => {
    setConnectionStatus('connecting');
    addLog('--- Start Connection Sequence ---');
    
    // Clean up existing
    if (peerRef.current) {
      addLog('Destroying old peer...');
      peerRef.current.destroy();
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Set a timeout
    timeoutRef.current = setTimeout(() => {
      setConnectionStatus((prev) => {
        if (prev === 'connecting') {
          addLog('ERROR: Connection Timed Out (15s)');
          return 'timeout';
        }
        return prev;
      });
    }, 15000);

    addLog('Creating new Peer instance...');
    const peer = new Peer(PEER_CONFIG);
    const hostPeerId = getPeerId(sessionId);

    peer.on('open', (id) => {
      addLog(`My Client Peer ID: ${id}`);
      addLog(`Attempting to connect to Host: ${hostPeerId}`);
      
      const conn = peer.connect(hostPeerId, { reliable: true });

      conn.on('open', () => {
        addLog('SUCCESS: Connection established!');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setConnectionStatus('connected');
        connRef.current = conn;
      });

      conn.on('close', () => {
        addLog('Connection Closed');
        setConnectionStatus('disconnected');
        connRef.current = null;
      });

      conn.on('error', (err) => {
        addLog(`CONN ERROR: ${err}`);
        console.error('Connection error:', err);
        setConnectionStatus('error');
      });
      
      // Listen for ICE candidates to debug NAT
      conn.peerConnection.onicecandidate = (event) => {
         if (event.candidate) {
             addLog(`ICE Candidate found: ${event.candidate.candidate.substring(0, 30)}...`);
         }
      };
      
      conn.peerConnection.oniceconnectionstatechange = () => {
          addLog(`ICE State: ${conn.peerConnection.iceConnectionState}`);
      };
    });

    peer.on('error', (err: any) => {
      addLog(`PEER ERROR: ${err.type} - ${err.message}`);
      setConnectionStatus('error');
    });
    
    peer.on('disconnected', () => {
        addLog('Peer disconnected from server');
    });

    peerRef.current = peer;
  }, [sessionId, addLog]);

  useEffect(() => {
    connectToPeer();

    return () => {
      if (connRef.current) connRef.current.close();
      if (peerRef.current) peerRef.current.destroy();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [connectToPeer]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (connectionStatus !== 'connected' || !connRef.current) {
        alert('Нет соединения с ПК. Подождите подключения.');
        return;
      }

      const files: File[] = Array.from(e.target.files);
      
      // Check sizes first
      const largeFiles = files.filter(f => f.size > MAX_FILE_SIZE);
      if (largeFiles.length > 0) {
        alert(`Файлы слишком большие: ${largeFiles.map(f => f.name).join(', ')}. Лимит: 50 МБ.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setIsUploading(true);
      addLog(`Starting upload of ${files.length} files...`);

      for (const file of files) {
        // Read file as Base64 (DataURL)
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const newFile: TransferFile = {
              id: Math.random().toString(36).substring(7),
              name: file.name,
              size: file.size,
              type: file.type,
              dataUrl: event.target.result as string,
              uploadedAt: Date.now(),
            };

            // Send via PeerJS
            connRef.current?.send({
              type: 'file-transfer',
              file: newFile
            });
            
            addLog(`Sent: ${file.name}`);
            setUploadedFiles(prev => [newFile, ...prev]);
          }
        };
        reader.readAsDataURL(file);
        
        // Small delay to prevent UI freezing on loop
        await new Promise(r => setTimeout(r, 100)); 
      }

      // UX Delay for "finishing"
      setTimeout(() => {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 500);
    }
  };

  const getConnectionStatusUI = () => {
    switch(connectionStatus) {
      case 'connecting':
        return <span className="text-yellow-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Подключение...</span>;
      case 'connected':
        return <span className="text-emerald-400 flex items-center gap-1"><Wifi className="w-3 h-3" /> Подключено</span>;
      case 'disconnected':
        return <span className="text-red-400 flex items-center gap-1"><WifiOff className="w-3 h-3" /> Отключено</span>;
      case 'timeout':
        return <span className="text-orange-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Тайм-аут</span>;
      case 'error':
        return <span className="text-red-500 flex items-center gap-1">Ошибка</span>;
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
            <h2 className="text-lg font-semibold text-white">Передача файлов</h2>
            <div className="text-xs font-mono">{getConnectionStatusUI()}</div>
            </div>
        </div>
        
        {connectionStatus !== 'connected' && connectionStatus !== 'connecting' ? (
           <button 
             onClick={connectToPeer}
             className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
           >
             <RefreshCw className="w-3 h-3" /> Повтор
           </button>
        ) : null}
      </div>
      
      {/* Network Warning for Timeout/Error */}
      {(connectionStatus === 'timeout' || connectionStatus === 'error') && (
        <div className="bg-orange-900/30 border border-orange-500/30 rounded-xl p-4 mb-4 text-sm text-orange-200 flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-1">Не удается соединиться?</p>
            <ul className="list-disc list-inside space-y-1 text-orange-200/80 text-xs">
              <li>Попробуйте подключиться к той же Wi-Fi сети.</li>
              <li>Если вы используете VPN, отключите его.</li>
              <li>Обновите страницу на ПК, чтобы сбросить ID.</li>
            </ul>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl text-center mb-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border transition-colors ${
          connectionStatus === 'connected' 
            ? 'bg-slate-900 border-indigo-500/50' 
            : 'bg-slate-900 border-slate-700 opacity-50'
        }`}>
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          ) : (
            <UploadCloud className={`w-8 h-8 ${connectionStatus === 'connected' ? 'text-indigo-500' : 'text-slate-500'}`} />
          )}
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">Загрузить файлы</h3>
        <p className="text-slate-400 text-sm mb-6">
          {connectionStatus === 'connected' 
            ? 'Выберите фото или документы' 
            : connectionStatus === 'error' ? 'Ошибка соединения' : 'Ожидание соединения с ПК...'}
        </p>
        
        {connectionStatus === 'connected' && (
          <div className="bg-indigo-900/30 text-indigo-200 text-xs px-3 py-2 rounded-lg mb-4 flex items-center justify-center gap-2">
            <AlertCircle className="w-3 h-3" />
            Лимит: 50 МБ на файл
          </div>
        )}

        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          disabled={connectionStatus !== 'connected' || isUploading}
        />
        
        <label
          htmlFor="file-upload"
          className={`block w-full py-4 px-6 rounded-xl font-semibold transition-all ${
            connectionStatus === 'connected' && !isUploading
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 cursor-pointer'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isUploading ? 'Отправка...' : 'Выбрать файлы'}
        </label>
      </div>

      <div className="flex-1 mb-8">
        <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">История отправки</h3>
        
        <div className="space-y-3">
          {uploadedFiles.length === 0 ? (
            <p className="text-center text-slate-600 text-sm py-8 italic">Нет отправленных файлов</p>
          ) : (
            uploadedFiles.map((file) => (
              <div key={file.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex items-center gap-3 animate-fade-in">
                <div className="bg-slate-700 p-2 rounded-lg">
                  <FileIcon className="w-4 h-4 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* SYSTEM LOG CONSOLE */}
      <div className="mt-8 border-t border-slate-800 pt-4">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Terminal className="w-4 h-4" />
            <span className="text-xs font-mono uppercase">Системный журнал (Debug)</span>
        </div>
        <div className="bg-black/80 rounded-lg p-3 h-40 overflow-y-auto font-mono text-[10px] leading-relaxed">
            {logs.length === 0 && <span className="text-slate-600">Журнал пуст...</span>}
            {logs.map((log, i) => (
                <div key={i} className="text-green-400 border-b border-white/5 pb-0.5 mb-0.5">
                    {log}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ClientSession;