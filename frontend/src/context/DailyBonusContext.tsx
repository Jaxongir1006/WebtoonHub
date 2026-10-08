import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { rewardsApi } from '../api/rewards';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { getTimeUntilTashkentMidnight, getTashkentDateString } from '../utils/date';
import { getApiErrorMessage } from '../api/client';

interface DailyBonusContextType {
  isModalOpen: boolean; openModal: () => void; closeModal: () => void;
  countdown: ReturnType<typeof getTimeUntilTashkentMidnight>;
  claimBonus: () => Promise<{ success: boolean; message: string; coinsEarned?: number }>;
  isClaiming: boolean; isClaimedToday: boolean; rewardAmount: number | null;
}
const DailyBonusContext = createContext<DailyBonusContextType | undefined>(undefined);
export const DailyBonusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, updateCoinsLocally, openAuthModal } = useAuth();
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isClaimedToday, setIsClaimedToday] = useState(false);
  const [rewardAmount, setRewardAmount] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilTashkentMidnight());
  const [day, setDay] = useState(getTashkentDateString());
  const owner = useRef(user?.id); owner.current = user?.id;
  const generation = useRef(0);
  const claiming = useRef(false);
  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const id = user.id; const request = ++generation.current; const requestedDay = getTashkentDateString();
    try {
      const result = await rewardsApi.getDailyStatus();
      if (owner.current !== id || generation.current !== request || requestedDay !== getTashkentDateString()) return;
      setIsClaimedToday(Boolean(result.data.claimed_today));
      setRewardAmount(result.data.reward_amount);
    } catch { /* Keep the last acknowledged status; claiming remains available for recovery. */ }
  }, [user?.id]);
  useEffect(() => {
    generation.current++; setIsClaimedToday(false); setRewardAmount(null); setIsModalOpen(false);
    void refresh();
  }, [user?.id, day, refresh]);
  useEffect(() => {
    const update = () => { setCountdown(getTimeUntilTashkentMidnight()); setDay(getTashkentDateString()); };
    const focus = () => { update(); void refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') focus(); };
    const interval = setInterval(update, 1000);
    window.addEventListener('focus', focus); document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(interval); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', visible); };
  }, [refresh]);
  const openModal = () => {
    if (!isAuthenticated) { openAuthModal('login'); return; }
    void refresh(); setIsModalOpen(true);
  };
  const claimBonus = async () => {
    if (!user || !isAuthenticated) { openAuthModal('login'); return { success: false, message: t('comments.loginToComment') }; }
    if (claiming.current) return { success: false, message: t('dailyBonus.claiming') };
    claiming.current = true; setIsClaiming(true); const id = user.id; const requestedDay = getTashkentDateString();
    try {
      const result = await rewardsApi.claimDailyCheckin();
      if (owner.current === id) {
        generation.current++; setRewardAmount(result.data.reward_amount);
        const balance = result.data.total_lightning_coins ?? result.data.new_balance;
        if (typeof balance === 'number') updateCoinsLocally(balance);
        const currentDay = getTashkentDateString();
        const acknowledgedDay = getTashkentDateString(result.data.claimed_at) || requestedDay;
        if (requestedDay === currentDay && acknowledgedDay === currentDay) setIsClaimedToday(true);
        else { setIsClaimedToday(false); void refresh(); }
      }
      return { success: true, message: t('ux.bonusSuccess', { amount: result.data.reward_amount }), coinsEarned: result.data.reward_amount };
    } catch (error) {
      void refresh();
      return { success: false, message: getApiErrorMessage(error, t('common.error')) };
    } finally { claiming.current = false; setIsClaiming(false); }
  };
  return <DailyBonusContext.Provider value={{ isModalOpen, openModal, closeModal: () => setIsModalOpen(false), countdown, claimBonus, isClaiming, isClaimedToday, rewardAmount }}>{children}</DailyBonusContext.Provider>;
};
export const useDailyBonus = () => {
  const value = useContext(DailyBonusContext);
  if (!value) throw new Error('useDailyBonus must be used within a DailyBonusProvider');
  return value;
};
