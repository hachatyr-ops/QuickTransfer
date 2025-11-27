import React from 'react';
import { Share2 } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 flex justify-center items-center border-b border-indigo-900/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 shadow-lg shadow-indigo-500/10">
      <div className="flex items-center gap-3 bg-slate-800/50 px-6 py-2 rounded-full border border-indigo-500/30">
        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/50">
          <Share2 className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-wide">
          QuickTransfer <span className="text-indigo-400">v6.1</span>
        </h1>
      </div>
    </header>
  );
};

export default Header;