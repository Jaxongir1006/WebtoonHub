import React, { createContext, useContext, useState, useEffect } from 'react';
import { rewardsApi } from '../api/rewards';
import { useAuth } from './AuthContext';
import { getTimeUntilTashkentMidnight, getTashkentDateString } from '../utils/date';
import { getApiErrorMessage } from '../api/client';

interface DailyBonusContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  countdown: { hours: number; minutes: number; seconds: number; totalSeconds?: number };
  claimBonus: () => Promise<{ success: boolean; message: string; coinsEarned?: number }>;
  isClaiming: boolean;
  isClaimedToday: boolean;
}

const DailyBonusContext = createContext<DailyBonusContextType | undefined>(undefined);

export const DailyBonusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [countdown, setCountdown] = useState(getTimeUntilTashkentMidnight());
  const { user, isAuthenticated, updateCoinsLocally, openAuthModal } = useAuth();
  
  const [isClaimedToday, setIsClaimedToday] = useState<boolean>(() => {
    const todayStr = getTashkentDateString();
    const stored = localStorage.getItem('webtoonhub_daily_bonus_today');
    return stored === todayStr;
  });

  // Sync claimed status when user profile changes
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsClaimedToday(false);
      return;
    }

    const todayStr = getTashkentDateString();
    const storedUserDate = localStorage.getItem(`webtoonhub_daily_bonus_${user.id}`);

    if (storedUserDate === todayStr) {
      setIsClaimedToday(true);
      return;
    }

    if (user.daily_bonus_claimed) {
      setIsClaimedToday(true);
      localStorage.setItem(`webtoonhub_daily_bonus_${user.id}`, todayStr);
      localStorage.setItem('webtoonhub_daily_bonus_today', todayStr);
      return;
    }

    if (user.last_daily_login && getTashkentDateString(user.last_daily_login) === todayStr) {
      setIsClaimedToday(true);
      localStorage.setItem(`webtoonhub_daily_bonus_${user.id}`, todayStr);
      localStorage.setItem('webtoonhub_daily_bonus_today', todayStr);
      return;
    }

    // Double check with backend API
    rewardsApi.getDailyStatus()
      .then((res) => {
        if (res.data?.claimed_today) {
          setIsClaimedToday(true);
          localStorage.setItem(`webtoonhub_daily_bonus_${user.id}`, todayStr);
          localStorage.setItem('webtoonhub_daily_bonus_today', todayStr);
        } else {
          setIsClaimedToday(false);
        }
      })
      .catch(() => {});
  }, [user, isAuthenticated]);

  // Tick countdown every second and handle midnight reset
  useEffect(() => {
    const timer = setInterval(() => {
      const cd = getTimeUntilTashkentMidnight();
      setCountdown(cd);
      if (cd.totalSeconds === 0) {
        setIsClaimedToday(false);
        localStorage.removeItem('webtoonhub_daily_bonus_today');
        if (user) {
          localStorage.removeItem(`webtoonhub_daily_bonus_${user.id}`);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [user]);

  const openModal = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const claimBonus = async () => {
    if (!isAuthenticated || !user) {
      openAuthModal('login');
      return { success: false, message: "Iltimos, avval tizimga kiring" };
    }

    setIsClaiming(true);
    const todayStr = getTashkentDateString();

    try {
      const res = await rewardsApi.claimDailyCheckin();
      setIsClaimedToday(true);
      localStorage.setItem(`webtoonhub_daily_bonus_${user.id}`, todayStr);
      localStorage.setItem('webtoonhub_daily_bonus_today', todayStr);

      if (res.data) {
        const newBalance = res.data.total_lightning_coins ?? res.data.new_balance;
        if (typeof newBalance === 'number') {
          updateCoinsLocally(newBalance);
        }
      }
      return {
        success: true,
        message: res.message || "+15 Chaqmoq hisobingizga qo'shildi!",
        coinsEarned: res.data?.reward_amount || 15
      };
    } catch (err: any) {
      const msg = getApiErrorMessage(err, "Bugun allaqachon kunlik bonus olindi");
      if (err?.response?.status === 400 || msg.toLowerCase().includes('allaqachon')) {
        setIsClaimedToday(true);
        localStorage.setItem(`webtoonhub_daily_bonus_${user.id}`, todayStr);
        localStorage.setItem('webtoonhub_daily_bonus_today', todayStr);
      }
      return { success: false, message: msg };
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <DailyBonusContext.Provider
      value={{
        isModalOpen,
        openModal,
        closeModal,
        countdown,
        claimBonus,
        isClaiming,
        isClaimedToday
      }}
    >
      {children}
    </DailyBonusContext.Provider>
  );
};

export const useDailyBonus = () => {
  const context = useContext(DailyBonusContext);
  if (!context) {
    throw new Error('useDailyBonus must be used within a DailyBonusProvider');
  }
  return context;
};
