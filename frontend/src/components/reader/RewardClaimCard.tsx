import React, { useState, useRef, useEffect } from 'react';
import { rewardsApi } from '../../api/rewards';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Zap, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { getApiErrorMessage } from '../../api/client';

interface RewardClaimCardProps {
  chapterId: number;
  initialClaimed: boolean;
  rewardAmount?: number;
  onClaimSuccess?: () => void;
  ready?: boolean;
}

export const RewardClaimCard: React.FC<RewardClaimCardProps> = ({
  chapterId,
  initialClaimed,
  rewardAmount = 5,
  onClaimSuccess,
  ready = true
}) => {
  const { user, isAuthenticated, updateCoinsLocally, openAuthModal } = useAuth();
  const { t } = useLanguage();
  const [isClaimed, setIsClaimed] = useState(initialClaimed);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const alive = useRef(true);
  const pending = useRef(false);
  const identity = `${chapterId}:${user?.id || 'guest'}`;
  const current = useRef(identity); current.current = identity;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // Sync state when navigating between chapters
  React.useEffect(() => {
    setIsClaimed(initialClaimed);
    setFeedback(null);
  }, [chapterId, initialClaimed]);

  const handleClaim = async () => {
    if (pending.current || loading || isClaimed || rewardAmount === 0 || (isAuthenticated && !ready)) return;
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    const captured = identity; pending.current = true; setLoading(true);
    setFeedback(null);
    try {
      const res = await rewardsApi.claimChapterReward(chapterId);
      if (!alive.current || current.current !== captured) return;
      setIsClaimed(true);
      const newBalance = res.data?.total_lightning_coins ?? res.data?.new_balance;
      if (typeof newBalance === 'number') {
        updateCoinsLocally(newBalance);
      }
      setFeedback({
        type: 'success',
        message: t('reader.rewardClaimed')
      });
      onClaimSuccess?.();
    } catch (err) {
      const msg = getApiErrorMessage(err, t('common.error'));
      if (alive.current && current.current === captured) setFeedback({ type: 'error', message: msg });
    } finally {
      pending.current = false; if (alive.current) setLoading(false);
    }
  };

  if (rewardAmount === 0) return <p className="text-center text-sm text-studio-400 py-6">{t('readerFix.rewardDisabled')}</p>;

  return (
    <div className="w-full max-w-xl mx-auto my-8 p-6 rounded-3xl bg-studio-900 border border-studio-800 shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      {isClaimed ? (
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base">{t('reader.rewardClaimed')}</h4>
            <p className="text-xs text-studio-400 mt-0.5">
              {t('reader.rewardClaimedDesc')}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-400 flex items-center justify-center shadow-glow-brand">
            <Zap className="w-7 h-7 text-studio-950 fill-studio-950" />
          </div>

          <div>
            <h4 className="font-black text-white text-lg flex items-center justify-center gap-2">
              <span>{t('reader.readingBonusTitle', { coins: rewardAmount })}</span>
              <Sparkles className="w-4 h-4 text-brand-400" />
            </h4>
            <p className="text-xs text-studio-300 mt-1 max-w-sm mx-auto">
              {t('reader.readingBonusDesc')}
            </p>
          </div>

          {feedback && (
            <div
              role="status"
              className={`p-3 rounded-xl text-xs flex items-center justify-center gap-2 ${
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

          <button
            onClick={handleClaim}
            disabled={loading || (isAuthenticated && !ready)}
            className="w-full py-3.5 px-6 rounded-2xl font-bold bg-gradient-to-r from-brand-500 to-amber-400 text-studio-950 hover:from-brand-400 hover:to-amber-300 active:scale-98 shadow-glow-brand transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('reader.claiming')}</span>
              </>
            ) : isAuthenticated && !ready ? (
              <span>{t('ux.waitToRead')}</span>
            ) : isAuthenticated ? (
              <>
                <Zap className="w-4 h-4 fill-studio-950" />
                <span>{t('reader.claimReadingBonus', { coins: rewardAmount })}</span>
              </>
            ) : (
              <span>{t('reader.loginToClaimBonus', { coins: rewardAmount })}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
