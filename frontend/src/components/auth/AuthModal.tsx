import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authApi } from '../../api/auth';
import { getApiErrorMessage } from '../../api/client';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authModalOpen, authModalTab, closeAuthModal, openAuthModal, login, register, profileError, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const registerMode = authModalTab === 'register' && !forgot;
  useEffect(() => { if (!authModalOpen) { setEmail(''); setUsername(''); setPassword(''); setError(null); setSent(false); setForgot(false); setVisiblePassword(false); } }, [authModalOpen]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (loading) return;
    setError(null); setSent(false);
    if (registerMode && !/^[a-zA-Z0-9_-]{3,50}$/.test(username)) { setError(t('readerFix.usernameRule')); return; }
    if (registerMode && (password.length < 8 || password.length > 100)) { setError(t('readerFix.passwordRule')); return; }
    setLoading(true);
    try {
      if (forgot) { await authApi.forgotPassword(email); setSent(true); }
      else {
        const result = registerMode ? await register(email, username, password) : await login(email, password);
        if (!result.success) setError(result.message || t('common.error'));
      }
    } catch (failure) { setError(getApiErrorMessage(failure, t('common.error'))); }
    finally { setLoading(false); }
  };
  const switchTab = (tab: 'login' | 'register') => { if (loading) return; setError(null); setSent(false); setForgot(false); openAuthModal(tab); };
  const inputClass = 'w-full min-h-11 px-3 bg-studio-800 border border-studio-700 rounded-xl text-white text-sm';
  return <Modal isOpen={authModalOpen} onClose={closeAuthModal} dismissible={!loading} title={forgot ? t('readerFix.forgotTitle') : t(registerMode ? 'auth.registerTab' : 'auth.loginTab')}>
    {!forgot && <div className="flex gap-2 mb-5" role="group" aria-label={t('auth.loginTab')}>
      <button disabled={loading} aria-pressed={!registerMode} onClick={() => switchTab('login')} className={'flex-1 min-h-11 rounded-xl font-bold ' + (!registerMode ? 'bg-brand-500 text-studio-950' : 'bg-studio-800 text-studio-300')}>{t('auth.loginTab')}</button>
      <button disabled={loading} aria-pressed={registerMode} onClick={() => switchTab('register')} className={'flex-1 min-h-11 rounded-xl font-bold ' + (registerMode ? 'bg-brand-500 text-studio-950' : 'bg-studio-800 text-studio-300')}>{t('auth.registerTab')}</button>
    </div>}
    {registerMode && <p className="text-sm text-brand-300 mb-4">{t('ux.accountBenefits')}</p>}
    {forgot && <p className="text-sm text-studio-300 mb-4">{t('readerFix.forgotInfo')}</p>}
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 p-3 text-sm">{error}</p>}
    {sent && <p role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-3 text-sm">{t('readerFix.resetSent')}</p>}
    {profileError && !forgot && <button disabled={loading} onClick={async () => { setLoading(true); try { await refreshProfile(); closeAuthModal(); } catch (failure) { setError(getApiErrorMessage(failure, t('readerFix.profileError'))); } finally { setLoading(false); } }} className="min-h-11 mb-4 px-4 rounded-xl bg-studio-800 text-brand-400">{t('common.retry')}</button>}
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={loading} className="space-y-4">
        {registerMode && <div><label htmlFor="auth-username" className="block text-sm mb-1">{t('auth.usernameLabel')}</label><input id="auth-username" name="username" autoComplete="username" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9_-]{3,50}" aria-describedby="username-rule" value={username} onChange={e => setUsername(e.target.value)} className={inputClass} /><p id="username-rule" className="text-xs text-studio-400 mt-1">{t('readerFix.usernameRule')}</p></div>}
        <div><label htmlFor="auth-email" className="block text-sm mb-1">{t('auth.emailLabel')}</label><input id="auth-email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} /></div>
        {!forgot && <div><label htmlFor="auth-password" className="block text-sm mb-1">{t('auth.passwordLabel')}</label><div className="relative"><input id="auth-password" name="password" type={visiblePassword ? 'text' : 'password'} autoComplete={registerMode ? 'new-password' : 'current-password'} required minLength={registerMode ? 8 : undefined} maxLength={100} value={password} onChange={e => setPassword(e.target.value)} className={inputClass + ' pr-12'} /><button type="button" onClick={() => setVisiblePassword(value => !value)} aria-label={t(visiblePassword ? 'readerFix.hidePassword' : 'readerFix.showPassword')} className="absolute right-0 top-0 min-h-11 min-w-11 flex items-center justify-center text-studio-300">{visiblePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>}
        <button type="submit" className="w-full min-h-11 rounded-xl bg-brand-500 text-studio-950 font-bold flex items-center justify-center gap-2 disabled:opacity-50">{loading && <Loader2 className="w-4 h-4 animate-spin" />}{t(forgot ? 'readerFix.sendReset' : registerMode ? 'auth.registerBtn' : 'auth.loginBtn')}</button>
      </fieldset>
    </form>
    <button disabled={loading} onClick={() => { setForgot(value => !value); setError(null); setSent(false); }} className="min-h-11 mt-3 text-sm text-brand-400">{t(forgot ? 'auth.loginTab' : 'readerFix.forgot')}</button>
  </Modal>;
};
