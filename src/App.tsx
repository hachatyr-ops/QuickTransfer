import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HostSession from './components/HostSession';
import ClientSession from './components/ClientSession';
import { AppMode } from './types';
import { generateShortId } from './utils/storage';
import { Monitor, Smartphone, ArrowRight, Globe } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [sessionId, setSessionId] = useState<string>('');
  const [inputSessionId, setInputSessionId] = useState('');

  // Handle Hash Routing for simulating scanning the QR code
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/join/')) {
        const id = hash.replace('#/join/', '');
        if (id) {
          setSessionId(id);
          setMode(AppMode.CLIENT);
        }
      } else if (mode === AppMode.LANDING) {
        // Only reset if we are purely landing, otherwise keep state
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check on mount

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [mode]);

  const startHost = () => {
    const id = generateShortId();
    setSessionId(id);
    setMode(AppMode.HOST);
  };

  const joinSession = () => {
    if (!inputSessionId || inputSessionId.length < 6) {
      alert('Введите корректный ID сессии (6 цифр)');
      return;
    }
    setSessionId(inputSessionId);
    setMode(AppMode.CLIENT);
  };

  const resetApp = () => {
    setMode(AppMode.LANDING);
    setSessionId('');
    window.location.hash = '';
    window.history.pushState("", document.title, window.location.pathname + window.location.search);
  };

  const switchRole = () => {
    setMode(prev => prev === AppMode.HOST ? AppMode.CLIENT : AppMode.HOST);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        {mode === AppMode.LANDING && (
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <div className="text-center mb-12 space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-300">
                Передавайте файлы мгновенно.
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Без регистрации и приложений. Просто отсканируйте QR-код. 
                Временное P2P соединение для вашей безопасности.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
              {/* PC / Host Card */}
              <div 
                onClick={startHost}
                className="group relative bg-slate-800 rounded-2xl p-8 border border-slate-700 hover:border-indigo-500 transition-all cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col items-center text-center overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="bg-slate-900 p-4 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-700 group-hover:border-indigo-500/50">
                  <Monitor className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Я — Компьютер</h3>
                <p className="text-slate-400 mb-6">
                  Создать новую сессию и получить QR-код для приема файлов.
                </p>
                <div className="mt-auto flex items-center gap-2 text-indigo-400 font-medium group-hover:text-indigo-300">
                  Начать прием <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Mobile / Client Card */}
              <div className="group bg-slate-800 rounded-2xl p-8 border border-slate-700 flex flex-col items-center text-center">
                 <div className="bg-slate-900 p-4 rounded-full mb-6 border border-slate-700">
                  <Smartphone className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Я — Телефон</h3>
                <p className="text-slate-400 mb-6">
                  У меня есть файлы для отправки.
                </p>
                
                <div className="w-full mt-auto space-y-3" onClick={e => e.stopPropagation()}>
                  <input 
                    type="text" 
                    placeholder="Введите ID сессии (6 цифр)"
                    value={inputSessionId}
                    onChange={(e) => setInputSessionId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-center text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                    maxLength={6}
                  />
                  <button 
                    onClick={joinSession}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
                  >
                    Подключиться
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-16 bg-indigo-900/20 rounded-xl p-4 flex items-start gap-3 max-w-2xl border border-indigo-500/20">
              <Globe className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-300 text-left">
                <p className="font-semibold text-indigo-200 mb-1">Работает через интернет!</p>
                <p>
                  Теперь устройства могут быть в разных сетях. Мы используем технологию WebRTC для прямой связи.
                  Файлы передаются напрямую с телефона на компьютер, не сохраняясь на серверах.
                </p>
              </div>
            </div>
          </div>
        )}

        {mode === AppMode.HOST && (
          <HostSession sessionId={sessionId} onExit={resetApp} onSwitchRole={switchRole} />
        )}

        {mode === AppMode.CLIENT && (
          <ClientSession sessionId={sessionId} onExit={resetApp} onSwitchRole={switchRole} />
        )}
      </main>
    </div>
  );
};

export default App;