import React, { useState, useEffect, useCallback } from 'react';
import { creatorApi } from '../api/creator';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { CreatorRequest } from '../types';
import { formatDate } from '../utils/date';
import { getApiErrorMessage } from '../api/client';
import {
  PenTool,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  Loader2,
  ShieldCheck
} from 'lucide-react';

export const CreatorApplyPage: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { t, language } = useLanguage();
  const [existingRequest, setExistingRequest] = useState<CreatorRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMyRequest = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await creatorApi.getMyRequest();
      setExistingRequest(data);
    } catch (err) {
      console.error("Failed to load creator request", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchMyRequest();
  }, [fetchMyRequest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (message.trim().length < 10) {
      setFeedback({
        type: 'error',
        message: t('creator.minCharNotice', { count: message.trim().length })
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await creatorApi.submitRequest(message.trim());
      setFeedback({
        type: 'success',
        message: res.message || t('creator.successTitle')
      });
      setMessage('');
      await fetchMyRequest();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(err, t('common.error'))
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-24 flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 shadow-glow-brand">
          <PenTool className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">{t('creator.title')}</h2>
        <p className="text-xs text-studio-400 max-w-sm mb-6">
          {t('creator.loginRequired')}
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-3 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand"
        >
          {t('library.loginBtn')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner */}
        <div className="relative rounded-3xl bg-studio-900 border border-studio-800 p-6 sm:p-10 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('creator.programTitle')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {t('creator.programHeroTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-studio-400 leading-relaxed max-w-xl">
              {t('creator.programHeroDesc')}
            </p>
          </div>
        </div>

        {/* Existing Application Status Card */}
        {loading ? (
          <div className="py-12 flex justify-center items-center text-studio-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            <span className="text-sm">{t('common.loading')}</span>
          </div>
        ) : existingRequest ? (
          <div className="bg-studio-900 border border-studio-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-studio-800 mb-6">
              <h2 className="text-lg font-bold text-white">{t('creator.myRequest')}</h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  existingRequest.status === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : existingRequest.status === 'rejected'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {existingRequest.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {existingRequest.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                {existingRequest.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                <span>
                  {existingRequest.status === 'approved'
                    ? t('creator.approved')
                    : existingRequest.status === 'rejected'
                    ? t('creator.rejected')
                    : t('creator.pending')}
                </span>
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-studio-400 block mb-1">
                  {t('creator.experienceLabel')}:
                </span>
                <div className="p-4 rounded-2xl bg-studio-800/80 border border-studio-700/60 text-xs sm:text-sm text-studio-200 whitespace-pre-wrap leading-relaxed">
                  {existingRequest.message}
                </div>
              </div>

              <div className="text-[11px] text-studio-500">
                {t('creator.submittedDate', { date: formatDate(existingRequest.created_at, language) })}
              </div>

              {/* Admin feedback if approved or rejected */}
              {existingRequest.admin_feedback && (
                <div className="p-4 rounded-2xl bg-studio-850 border border-studio-700/80">
                  <span className="text-xs font-bold text-brand-400 block mb-1">
                    {t('creator.moderatorResponse')}
                  </span>
                  <p className="text-xs text-studio-200 italic">
                    "{existingRequest.admin_feedback}"
                  </p>
                </div>
              )}

              {/* If approved: link to Admin/Staff portal */}
              {existingRequest.status === 'approved' && (
                <div className="pt-4">
                  <a
                    href="http://localhost:5174"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-500 text-studio-950 font-bold text-xs hover:bg-brand-400 shadow-glow-brand transition-all"
                  >
                    <span>{t('creator.goToStudio')}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* New Application Form (if no request or if rejected) */}
        {(!existingRequest || existingRequest.status === 'rejected') && !loading && (
          <div className="bg-studio-900 border border-studio-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-2 pb-4 border-b border-studio-800 mb-6">
              <PenTool className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-bold text-white">{t('creator.newRequestTitle')}</h2>
            </div>

            {feedback && (
              <div
                className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-studio-300 mb-1.5">
                  {t('creator.experienceFieldLabel')}
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('creator.experienceFieldPlaceholder')}
                  className="w-full p-3.5 bg-studio-800 border border-studio-700 rounded-2xl text-xs sm:text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-y"
                />
                <span className="text-[11px] text-studio-500 mt-1 block">
                  {t('creator.minCharNotice', { count: message.length })}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-studio-800/40 border border-studio-700/40 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <p className="text-xs text-studio-400 leading-relaxed">
                  {t('creator.programNotice')}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || message.trim().length < 10}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-brand-500 text-studio-950 text-xs hover:bg-brand-400 active:scale-95 shadow-glow-brand transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{t('creator.submitToModerators')}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
