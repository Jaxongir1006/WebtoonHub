import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
export const ResetPasswordPage: React.FC = () => {
  const [query] = useSearchParams();
  const token = query.get('token') || '';
  const { t } = useLanguage();
  const { openAuthModal } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (password !== confirmation) { setError(t('readerFix.passwordMismatch')); return; }
    setBusy(true); setError('');
    try { await authApi.resetPassword(token, password); setSuccess(true); setPassword(''); setConfirmation(''); }
    catch (failure) { setError(getApiErrorMessage(failure, t('readerFix.resetExpired'))); }
    finally { setBusy(false); }
  };
  return <div className="max-w-lg mx-auto px-4 py-12"><div className="bg-studio-900 border border-studio-800 rounded-3xl p-6">
    <h1 className="text-2xl font-bold mb-6">{t('readerFix.forgotTitle')}</h1>
    {success ? <><p role="status" className="text-emerald-300">{t('readerFix.resetSuccess')}</p><button onClick={() => openAuthModal('login')} className="min-h-11 px-5 mt-6 bg-brand-500 text-studio-950 rounded-xl">{t('auth.loginBtn')}</button></> : !token ? <><p role="alert">{t('readerFix.resetExpired')}</p><button onClick={() => openAuthModal('login')} className="min-h-11 mt-4 text-brand-400">{t('readerFix.forgot')}</button></> : <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="text-rose-300">{error}</p>}
      <fieldset disabled={busy} className="space-y-4">
        <div><label htmlFor="reset-password" className="block text-sm mb-2">{t('readerFix.newPassword')}</label><input id="reset-password" type="password" autoComplete="new-password" required minLength={8} maxLength={100} value={password} onChange={e => setPassword(e.target.value)} className="w-full min-h-11 rounded-xl bg-studio-800 border border-studio-700 px-3" /></div>
        <div><label htmlFor="reset-confirm" className="block text-sm mb-2">{t('readerFix.confirmPassword')}</label><input id="reset-confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={100} value={confirmation} onChange={e => setConfirmation(e.target.value)} className="w-full min-h-11 rounded-xl bg-studio-800 border border-studio-700 px-3" /></div>
        <p className="text-xs text-studio-300">{t('readerFix.passwordRule')}</p>
        <button className="min-h-11 w-full rounded-xl bg-brand-500 text-studio-950 font-bold disabled:opacity-50">{t(busy ? 'common.loading' : 'common.save')}</button>
      </fieldset>
    </form>}
    <Link to="/" className="inline-flex items-center min-h-11 mt-4 text-sm text-studio-300">{t('nav.home')}</Link>
  </div></div>;
};
