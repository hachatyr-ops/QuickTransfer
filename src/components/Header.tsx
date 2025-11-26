import React from 'react';
import { Share2 } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 flex justify-center items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-500 p-2 rounded-lg">
          <Share2 className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          QuickTransfer
        </h1>
      </div>
    </header>
  );
};

export default Header;