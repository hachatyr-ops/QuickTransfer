import React from 'react';
import { Share2, Globe } from 'lucide-react';
import { Language } from '../types';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Header: React.FC<HeaderProps> = ({ language, setLanguage }) => {
  return (
    <header className="w-full py-6 flex justify-between items-center px-4 md:px-8 border-b border-indigo-900/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 shadow-lg shadow-indigo-500/10">
      <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-full border border-indigo-500/30">
        <div className="bg-emerald-600 p-1.5 rounded-lg shadow-lg shadow-emerald-600/50">
          <Share2 className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-lg md:text-xl font-bold text-white tracking-wide">
          QuickTransfer <span className="text-emerald-400">v17.0</span>
        </h1>
      </div>

      <div className="relative group">
        <button className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:border-indigo-500 transition-all">
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{language}</span>
        </button>
        <div className="absolute right-0 mt-2 w-24 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right">
          <button 
            onClick={() => setLanguage('RU')} 
            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${language === 'RU' ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}
          >
            RU
          </button>
          <button 
            onClick={() => setLanguage('EN')} 
            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${language === 'EN' ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;