import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TransferFile } from '../types';
import { getPeerId, formatBytes, PEER_CONFIG } from '../utils/storage';
import { Peer, DataConnection } from 'peerjs';
import { UploadCloud, CheckCircle, File as FileIcon, Loader2, ArrowLeft, Wifi, WifiOff, RefreshCw, AlertCircle, Info, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface ClientSessionProps {
  sessionId: string;
  onExit: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB Limit
const CONN_TIMEOUT_MS = 60000; // 60 seconds timeout for mobile networks

const ClientSession: React.FC<ClientSessionProps> = ({ sessionId, onExit }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<TransferFile[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'timeout'>('connecting');
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev]);
  }, []);

  const connectToPeer = useCallback(() => {
    setConnectionStatus('connecting');
    addLog('--- Start Connection v6.2 ---');
    
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Extended Timeout safety
    timeoutRef.current = setTimeout(() => {
      setConnectionStatus((prev) => {
        if (prev === 'connecting') {
          addLog(`ERROR: Connection Timeout (${CONN_TIMEOUT_MS/1000}s)`);
          return 'timeout';
        }
        return prev;
      });
    }, CONN_TIMEOUT_MS);

    const peer = new Peer(PEER_CONFIG);
    const hostPeerId = getPeerId(sessionId);

    peer.on('open', (id) => {
      addLog(`Client ID: ${id}`);
      addLog(`Target Host: ${hostPeerId}`);
      
      // Slight delay to ensure peer is ready before connecting
      setTimeout(() => {
        addLog('Initiating handshake...');
        const conn = peer.connect(hostPeerId, { reliable: true });

        conn.on('open', () => {
          addLog('>>> CONNECTED <<<');
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
          setConnectionStatus('error');
        });
        
        conn.peerConnection.onicecandidate = (event) => {
           if (event.candidate) {
               addLog(`ICE Candidate found`);
           }
        };
        
        conn.peerConnection.oniceconnectionstatechange = () => {
            const state = conn.peerConnection.iceConnectionState;
            addLog(`ICE State: ${state}`);
            if (state === 'checking') {
               addLog('Negotiating connection through NAT...');
            }
        };
      }, 500);
    });

    peer.on('error', (err: any) => {
      addLog(`PEER ERROR: ${err.type}`);
      setConnectionStatus('error');
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
        alert('Нет соединения.');
        return;
      }

      const files: File[] = Array.from(e.target.files);
      const largeFiles = files.filter(f => f.size > MAX_FILE_SIZE);
      if (largeFiles.length > 0) {
        alert(`Файлы > 50МБ нельзя: ${largeFiles.map(f => f.name).join(', ')}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setIsUploading(true);
      for (const file of files) {
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
            connRef.current?.send({ type: 'file-transfer', file: newFile });
            addLog(`Sent: ${file.name}`);
            setUploadedFiles(prev => [newFile, ...prev]);
          }
        };
        reader.readAsDataURL(file);
        await new Promise(r => setTimeout(r, 100)); 
      }
      setTimeout(() => {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 500);
    }
  };

  const getConnectionStatusUI = () => {
    switch(connectionStatus) {
      case 'connecting': return <span className="text-yellow-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Подключение...</span>;
      case 'connected': return <span className="text-emerald-400 flex items-center gap-1"><Wifi className="w-3 h-3" /> Стабильно</span>;
      case 'disconnected': return <span className="text-red-400 flex items-center gap-1"><WifiOff className="w-3 h-3" /> Разрыв</span>;
      case 'timeout': return <span className="text-orange-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Тайм-аут</span>;
      case 'error': return <span className="text-red-500 flex items-center gap-1">Ошибка</span>;
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
            <h2 className="text-lg font-semibold text-white">Отправка</h2>
            <div className="text-xs font-mono">{getConnectionStatusUI()}</div>
            </div>
        </div>
        {connectionStatus !== 'connected' && connectionStatus !== 'connecting' && (
           <button onClick={connectToPeer} className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg flex items-center gap-1">
             <RefreshCw className="w-3 h-3" />
             <span>Повтор</span>
           </button>
        )}
      </div>
      
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl text-center mb-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border transition-colors ${
          connectionStatus === 'connected' ? 'bg-indigo-900/20 border-indigo-500' : 'bg-slate-900 border-slate-700 opacity-50'
        }`}>
          {isUploading ? <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /> : <UploadCloud className={`w-8 h-8 ${connectionStatus === 'connected' ? 'text-indigo-500' : 'text-slate-500'}`} />}
        </div>
        
        <label
          htmlFor="file-upload"
          className={`block w-full py-4 px-6 rounded-xl font-semibold transition-all ${
            connectionStatus === 'connected' && !isUploading
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg cursor-pointer'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isUploading ? 'Отправка...' : 'Выбрать файлы'}
        </label>
        <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" id="file-upload" disabled={connectionStatus !== 'connected' || isUploading} />
      </div>

      <div className="mt-auto border-t border-slate-800 pt-4">
        <button onClick={() => setShowLogs(!showLogs)} className="flex items-center gap-2 text-slate-500 text-xs w-full mb-2">
            <Terminal className="w-3 h-3" /> <span>Журнал (Debug)</span>
            {showLogs ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>
        {showLogs && (
            <div className="bg-black/90 rounded-lg p-2 h-32 overflow-y-auto font-mono text-[10px] text-green-400 border border-slate-800">
                {logs.length === 0 && <span className="text-slate-600">...</span>}
                {logs.map((log, i) => <div key={i} className="border-b border-white/5">{log}</div>)}
            </div>
        )}
      </div>
    </div>
  );
};

export default ClientSession;