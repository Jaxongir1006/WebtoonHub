import React, { createContext, useContext, useState, useEffect } from 'react';
import { rewardsApi } from '../api/rewards';
import { useAuth } from './AuthContext';
import { getTimeUntilTashkentMidnight } from '../utils/date';
import { getApiErrorMessage } from '../api/client';

interface DailyBonusContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  countdown: { hours: number; minutes: number; seconds: number };
  claimBonus: () => Promise<{ success: boolean; message: string; coinsEarned?: number }>;
  isClaiming: boolean;
}

const DailyBonusContext = createContext<DailyBonusContextType | undefined>(undefined);

export const DailyBonusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [countdown, setCountdown] = useState(getTimeUntilTashkentMidnight());
  const { isAuthenticated, updateCoinsLocally, openAuthModal } = useAuth();

  // Tick countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilTashkentMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    if (!isAuthenticated) {
      openAuthModal('login');
      return { success: false, message: "Iltimos, avval tizimga kiring" };
    }

    setIsClaiming(true);
    try {
      const res = await rewardsApi.claimDailyCheckin();
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
    } catch (err) {
      const msg = getApiErrorMessage(err, "Bugun allaqachon kunlik bonus olindi");
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
        isClaiming
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
