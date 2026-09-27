import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Heart, Shield, BookOpen, ShoppingBag, PenTool } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-studio-950 border-t border-studio-800/80 mt-20 text-studio-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-300 flex items-center justify-center shadow-glow-brand">
                <Zap className="w-4 h-4 text-studio-950 fill-studio-950" />
              </div>
              <span className="text-xl font-black text-white">
                Webtoon<span className="text-brand-500">Hub</span>
              </span>
            </Link>
            <p className="text-xs text-studio-400 leading-relaxed max-w-sm">
              WebtoonHub — vertikal manhva va webtoonlarni o'zbek tilida qulay mutolaa qilish,
              ichki ⚡ Chaqmoq valyutasi yordamida o'quvchilarni rag'batlantirish platformasi.
              Platformada hech qanday real pullik to'lovlar mavjud emas.
            </p>
            <div className="flex items-center gap-2 text-xs text-brand-400 font-medium">
              <Shield className="w-4 h-4 text-brand-500" />
              <span>100% Bepul & Gamifikatsiyalangan Ta'limiy Loyiha</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Bo'limlar</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/catalog" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-studio-500" />
                  <span>Katalog & Janrlar</span>
                </Link>
              </li>
              <li>
                <Link to="/library" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-studio-500" />
                  <span>Mening kutubxonam</span>
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-studio-500" />
                  <span>Do'kon & Ramkalar</span>
                </Link>
              </li>
              <li>
                <Link to="/become-creator" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-studio-500" />
                  <span>Muallif / Tarjimon bo'lish</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Info */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Loyiha Haqida</h4>
            <div className="text-xs space-y-1.5 text-studio-400">
              <p className="font-semibold text-studio-200">Kimyo International University in Tashkent (KIUT)</p>
              <p>Amaliy Informatika (ISE) · PBL3</p>
              <p className="pt-2 text-studio-500 text-[11px]">
                Mualliflar: Qosimjonov Jaxongir, Muxtorov Akmaljon, Tursunaliyev Asilbek
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-studio-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            © 2026 WebtoonHub. Barcha huquqlar himoyalangan.
          </div>
          <div className="flex items-center gap-1 text-studio-500">
            <span>O'zbekistonda</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            <span>bilan yaratildi</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
