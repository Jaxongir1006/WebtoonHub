import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useDailyBonus } from '../../context/DailyBonusContext';
import { useLanguage } from '../../context/LanguageContext';
import { Zap, Clock, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export const DailyBonusModal: React.FC = () => {
  const { isModalOpen, closeModal, countdown, claimBonus, isClaiming, isClaimedToday } = useDailyBonus();
  const { t } = useLanguage();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleClaim = async () => {
    setFeedback(null);
    const res = await claimBonus();
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setTimeout(() => {
        closeModal();
        setFeedback(null);
      }, 1500);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const padZero = (n: number) => n.toString().padStart(2, '0');

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={closeModal}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400">
            <Zap className="w-5 h-5 fill-brand-400 animate-pulse-subtle" />
          </div>
          <span>{t('dailyBonus.modalTitle')}</span>
        </div>
      }
    >
      <div className="text-center py-3">
        {/* Animated icon container */}
        <div className="relative mx-auto w-24 h-24 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping opacity-30" />
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-600 to-amber-400 flex items-center justify-center shadow-glow-brand-lg">
            <Zap className="w-10 h-10 text-studio-950 fill-studio-950 animate-bounce-subtle" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-brand-300 animate-pulse" />
        </div>

        <h3 className="text-2xl font-black text-white mb-1">
          {t('dailyBonus.amount')}
        </h3>
        <p className="text-sm text-studio-300 max-w-xs mx-auto mb-6">
          {t('dailyBonus.modalSubtitle')}
        </p>

        {/* Countdown Box */}
        <div className="bg-studio-800/80 border border-studio-700/80 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-center gap-1.5 text-xs text-studio-400 mb-2 font-medium">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>{t('dailyBonus.countdownLabel')}</span>
          </div>
          <div className="flex justify-center items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold font-mono text-white bg-studio-900 border border-studio-700 px-3 py-1.5 rounded-xl">
                {padZero(countdown.hours)}
              </span>
              <span className="text-[10px] text-studio-400 mt-1 uppercase">{t('dailyBonus.hours')}</span>
            </div>
            <span className="text-xl font-bold text-studio-500 pb-4">:</span>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold font-mono text-white bg-studio-900 border border-studio-700 px-3 py-1.5 rounded-xl">
                {padZero(countdown.minutes)}
              </span>
              <span className="text-[10px] text-studio-400 mt-1 uppercase">{t('dailyBonus.minutes')}</span>
            </div>
            <span className="text-xl font-bold text-studio-500 pb-4">:</span>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold font-mono text-white bg-studio-900 border border-studio-700 px-3 py-1.5 rounded-xl">
                {padZero(countdown.seconds)}
              </span>
              <span className="text-[10px] text-studio-400 mt-1 uppercase">{t('dailyBonus.seconds')}</span>
            </div>
          </div>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`mb-4 p-3 rounded-xl text-sm flex items-center justify-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Claim Button / Already Claimed Notice */}
        {isClaimedToday ? (
          <div className="w-full py-3.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center gap-2 text-sm shadow-glow-brand">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{t('dailyBonus.claimedNotice')}</span>
          </div>
        ) : (
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-studio-950 bg-gradient-to-r from-brand-500 to-amber-400 hover:from-brand-400 hover:to-amber-300 active:scale-98 shadow-glow-brand transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
          >
            <Zap className="w-5 h-5 fill-studio-950" />
            <span>{isClaiming ? t('dailyBonus.claiming') : t('dailyBonus.claimBtn')}</span>
          </button>
        )}
      </div>
    </Modal>
  );
};
