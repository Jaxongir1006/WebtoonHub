import React, { useState, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { Zap, Mail, Lock, User as UserIcon, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authModalOpen, authModalTab, closeAuthModal, openAuthModal, login, register } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isRegister = authModalTab === 'register';

  const resetForm = useCallback(() => {
    setEmail('');
    setUsername('');
    setPassword('');
    setError(null);
    setSuccessMsg(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    closeAuthModal();
  }, [closeAuthModal, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (isRegister) {
      if (username.length < 3) {
        setError("Foydalanuvchi nomi kamida 3 ta belgidan iborat bo'lishi kerak");
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setError("Parol kamida 8 ta belgidan iborat bo'lishi kerak");
        setLoading(false);
        return;
      }
      const res = await register(email, username, password);
      setLoading(false);
      if (!res.success) {
        setError(res.message || "Ro'yxatdan o'tishda xatolik yuz berdi");
      } else {
        setSuccessMsg(res.message || "Muvaffaqiyatli ro'yxatdan o'tdingiz!");
        setTimeout(() => {
          handleClose();
        }, 1200);
      }
    } else {
      const res = await login(email, password);
      setLoading(false);
      if (!res.success) {
        setError(res.message || "Email yoki parol noto'g'ri");
      } else {
        setSuccessMsg("Tizimga muvaffaqiyatli kirdingiz!");
        setTimeout(() => {
          handleClose();
        }, 800);
      }
    }
  };

  return (
    <Modal
      isOpen={authModalOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400">
            <Zap className="w-5 h-5 fill-brand-400" />
          </div>
          <span>{isRegister ? "Ro'yxatdan o'tish" : "Tizimga kirish"}</span>
        </div>
      }
    >
      {/* 50 Chaqmoq Welcome Banner */}
      {isRegister && (
        <div className="mb-5 p-3.5 rounded-xl bg-gradient-to-r from-brand-500/20 via-brand-500/10 to-transparent border border-brand-500/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-brand-400 fill-brand-400" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Xush kelibsiz bonusi!</div>
            <div className="text-xs text-brand-300">
              Ro'yxatdan o'tganingizda hisobingizga darhol <b>+50 ⚡ Chaqmoq</b> sovg'a qilinadi!
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-studio-800 p-1 mb-5">
        <button
          type="button"
          onClick={() => {
            setError(null);
            openAuthModal('login');
          }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            !isRegister
              ? 'bg-studio-700 text-white shadow-sm'
              : 'text-studio-400 hover:text-white'
          }`}
        >
          Kirish
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            openAuthModal('register');
          }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            isRegister
              ? 'bg-brand-500 text-studio-950 shadow-glow-brand font-bold'
              : 'text-studio-400 hover:text-white'
          }`}
        >
          Ro'yxatdan o'tish (+50 ⚡)
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success alert */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label className="block text-xs font-semibold text-studio-300 mb-1.5">
              Foydalanuvchi nomi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-studio-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="masalan, solo_hunter"
                className="w-full pl-10 pr-4 py-2.5 bg-studio-800 border border-studio-700 rounded-xl text-white placeholder-studio-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-studio-300 mb-1.5">
            Email manzili
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-studio-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ismingiz@example.uz"
              className="w-full pl-10 pr-4 py-2.5 bg-studio-800 border border-studio-700 rounded-xl text-white placeholder-studio-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-studio-300 mb-1.5">
            Parol {isRegister && <span className="text-studio-500">(kamida 8 ta belgi)</span>}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-studio-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-studio-800 border border-studio-700 rounded-xl text-white placeholder-studio-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-bold bg-brand-500 text-studio-950 hover:bg-brand-400 active:scale-98 transition-all shadow-glow-brand flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Kutilmoqda...</span>
            </>
          ) : isRegister ? (
            <>
              <Zap className="w-4 h-4 fill-studio-950" />
              <span>Ro'yxatdan o'tish (+50 ⚡)</span>
            </>
          ) : (
            <span>Tizimga kirish</span>
          )}
        </button>
      </form>

      {/* Switch mode footer */}
      <div className="mt-5 text-center text-xs text-studio-400">
        {isRegister ? (
          <span>
            Hisobingiz bormi?{' '}
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="text-brand-400 hover:underline font-semibold"
            >
              Kirish
            </button>
          </span>
        ) : (
          <span>
            Yangi foydalanuvchimisiz?{' '}
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="text-brand-400 hover:underline font-semibold"
            >
              Ro'yxatdan o'ting (+50 ⚡ oling)
            </button>
          </span>
        )}
      </div>
    </Modal>
  );
};
