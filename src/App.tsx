import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HostSession from './components/HostSession';
import ClientSession from './components/ClientSession';
import { AppMode, Language } from './types';
import { generateShortId } from './utils/storage';
import { Monitor, Smartphone, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { translations } from './utils/translations';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [sessionId, setSessionId] = useState<string>('');
  const [inputSessionId, setInputSessionId] = useState('');
  
  // Автоматическое определение языка
  const [language, setLanguage] = useState<Language>(() => {
    // Проверяем, есть ли доступ к navigator (браузер)
    if (typeof navigator !== 'undefined' && navigator.language) {
      // Если язык браузера начинается на 'ru' (например ru-RU, ru-BY), ставим RU
      return navigator.language.toLowerCase().startsWith('ru') ? 'RU' : 'EN';
    }
    return 'EN'; // По умолчанию для остальных
  });

  const t = translations[language];

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
      alert('Error: ID must be 6 digits');
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
      <Header language={language} setLanguage={setLanguage} />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        {mode === AppMode.LANDING && (
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <div className="text-center mb-12 space-y-4">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 leading-tight">
                {t.landing.title}
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                {t.landing.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mb-16">
              {/* PC / Host Card */}
              <div 
                onClick={startHost}
                className="group relative bg-slate-800 rounded-2xl p-8 border border-slate-700 hover:border-emerald-500 transition-all cursor-pointer hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col items-center text-center overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="bg-slate-900 p-4 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-700 group-hover:border-emerald-500/50">
                  <Monitor className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">{t.landing.iAmHost}</h3>
                <p className="text-slate-400 mb-6">
                  {t.landing.hostDesc}
                </p>
                <div className="mt-auto flex items-center gap-2 text-emerald-400 font-medium group-hover:text-emerald-300">
                  {t.landing.startReceiving} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Mobile / Client Card */}
              <div className="group bg-slate-800 rounded-2xl p-8 border border-slate-700 flex flex-col items-center text-center">
                 <div className="bg-slate-900 p-4 rounded-full mb-6 border border-slate-700">
                  <Smartphone className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">{t.landing.iAmClient}</h3>
                <p className="text-slate-400 mb-6">
                  {t.landing.clientDesc}
                </p>
                
                <div className="w-full mt-auto space-y-3" onClick={e => e.stopPropagation()}>
                  <input 
                    type="text" 
                    placeholder={t.landing.inputPlaceholder}
                    value={inputSessionId}
                    onChange={(e) => setInputSessionId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-center text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                    maxLength={6}
                  />
                  <button 
                    onClick={joinSession}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
                  >
                    {t.landing.connectBtn}
                  </button>
                </div>
              </div>
            </div>

            {/* Info Blocks */}
            <div className="w-full max-w-2xl space-y-4">
              {/* Security Tip Block */}
              <div className="bg-amber-900/10 rounded-xl p-5 flex items-start gap-4 border border-amber-500/20">
                <div className="bg-amber-900/30 p-2 rounded-lg mt-1">
                   <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                </div>
                <div className="text-sm text-slate-300 text-left">
                  <p className="font-bold text-amber-200 mb-1">{t.landing.securityTitle}</p>
                  <p className="text-slate-400 leading-relaxed">
                    {t.landing.securityDesc}
                  </p>
                </div>
              </div>

              {/* Privacy Block */}
              <div className="bg-emerald-900/10 rounded-xl p-5 flex items-start gap-4 border border-emerald-500/20">
                <div className="bg-emerald-900/30 p-2 rounded-lg mt-1">
                   <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                </div>
                <div className="text-sm text-slate-300 text-left">
                  <p className="font-bold text-emerald-200 mb-1">{t.landing.privacyTitle}</p>
                  <p className="text-slate-400 leading-relaxed">
                    {t.landing.privacyDesc}
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {mode === AppMode.HOST && (
          <HostSession sessionId={sessionId} onExit={resetApp} onSwitchRole={switchRole} t={t.host} />
        )}

        {mode === AppMode.CLIENT && (
          <ClientSession sessionId={sessionId} onExit={resetApp} onSwitchRole={switchRole} t={t.client} />
        )}
      </main>
    </div>
  );
};

export default App;