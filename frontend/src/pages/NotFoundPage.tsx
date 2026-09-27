import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen py-32 flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-studio-900 border border-studio-800 flex items-center justify-center text-brand-400 mb-6 shadow-glow-brand">
        <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '12s' }} />
      </div>
      <h1 className="text-4xl sm:text-6xl font-black text-white mb-2">404</h1>
      <h2 className="text-lg font-bold text-studio-300 mb-4">Sahifa topilmadi</h2>
      <p className="text-xs text-studio-400 max-w-sm mb-8">
        Siz qidirayotgan sahifa o'chirilgan, nomi o'zgartirilgan yoki vaqtincha mavjud bo'lmasligi mumkin.
      </p>
      <Link
        to="/"
        className="px-6 py-3 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand transition-all"
      >
        Bosh sahifaga qaytish
      </Link>
    </div>
  );
};
