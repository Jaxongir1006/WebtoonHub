import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { wheelApi, WheelSummary, WheelDetail, WheelItem, SpinResult, SpinHistoryItem } from '../api/wheel';
import { getApiErrorMessage } from '../api/client';
import {
  Sparkles,
  Zap,
  Gift,
  Flame,
  Award,
  History,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  RotateCw,
  ShoppingBag,
  Coins
} from 'lucide-react';

export const LuckyWheelPage: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, updateCoinsLocally } = useAuth();
  const { t, language } = useLanguage();

  const [wheels, setWheels] = useState<WheelSummary[]>([]);
  const [selectedWheelId, setSelectedWheelId] = useState<number | null>(null);
  const [wheelDetail, setWheelDetail] = useState<WheelDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'public_history' | 'my_history' | 'odds'>('public_history');
  const [publicHistory, setPublicHistory] = useState<SpinHistoryItem[]>([]);
  const [myHistory, setMyHistory] = useState<SpinHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Winner Modal State
  const [winResult, setWinResult] = useState<SpinResult | null>(null);
  const [showWinModal, setShowWinModal] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play tick sound synthesized via Web Audio API
  const playTickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // ignore audio errors
    }
  };

  // Play fanfare victory sound
  const playWinSound = (isJackpot = false) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const notes = isJackpot ? [523.25, 659.25, 783.99, 1046.5, 1318.51] : [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = isJackpot ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.5);
      });
    } catch {
      // ignore
    }
  };

  // Load available wheels
  const loadWheels = async () => {
    try {
      setLoading(true);
      const data = await wheelApi.listWheels();
      setWheels(data);
      if (data.length > 0) {
        const targetId = selectedWheelId || data[0].id;
        setSelectedWheelId(targetId);
        await loadWheelDetail(targetId);
      }
    } catch (err) {
      setErrorToast(getApiErrorMessage(err, t('wheel.errorLoadingWheel')));
    } finally {
      setLoading(false);
    }
  };

  // Load wheel detail
  const loadWheelDetail = async (wheelId: number) => {
    try {
      const data = await wheelApi.getWheel(wheelId);
      setWheelDetail(data);
      loadHistory(wheelId);
    } catch (err) {
      setErrorToast(getApiErrorMessage(err, t('wheel.errorLoadingDetail')));
    }
  };

  const loadHistory = async (wheelId: number) => {
    setHistoryLoading(true);
    try {
      const pub = await wheelApi.getWheelHistory(wheelId, 20);
      setPublicHistory(pub);
      if (isAuthenticated) {
        const my = await wheelApi.getMyHistory(20);
        setMyHistory(my);
      }
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadWheels();
  }, [isAuthenticated]);

  // Handle Wheel Selection Change
  const handleSelectWheel = (w: WheelSummary) => {
    if (spinning) return;
    setSelectedWheelId(w.id);
    loadWheelDetail(w.id);
  };

  // Spin Wheel Action
  const handleSpin = async () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (!wheelDetail || spinning) return;

    // Check if free spin or has enough coins
    const isFree = wheelDetail.is_free_spin_available;
    const cost = isFree ? 0 : wheelDetail.cost_coins;
    const userCoins = user?.lightning_coins || 0;

    if (!isFree && userCoins < cost) {
      setErrorToast(`Balansingizda yetarli Chaqmoq mavjud emas! (Kerak: ${cost} ⚡, sizda: ${userCoins} ⚡)`);
      return;
    }

    try {
      setSpinning(true);
      setErrorToast(null);

      // Call API to determine win
      const result = await wheelApi.spinWheel(wheelDetail.id);

      // Deduct coins locally
      updateCoinsLocally(result.new_balance);

      // Calculate Rotation Angle
      // Pointer is at 12 o'clock (0 degrees). Slices start from 12 o'clock going clockwise.
      // Slices: items array in order. Each slice has angle step = 360 / items.length.
      // Winning slice center angle = (winning_index + 0.5) * step.
      // To bring this slice center to top (0 deg), rotate clockwise by:
      // target = 360 - center_angle.
      const items = wheelDetail.items;
      const n = items.length;
      const step = 360 / n;
      const targetSliceCenter = (result.winning_index + 0.5) * step;

      // Add slight jitter (-25% to +25% of slice) so it lands naturally within the sector
      const jitter = (Math.random() - 0.5) * (step * 0.5);

      // Align with previous rotation: add at least 6 full rounds (2160 deg)
      const currentNorm = rotation % 360;
      const deltaToTarget = (360 - targetSliceCenter + jitter) - currentNorm;
      const normalizedDelta = ((deltaToTarget % 360) + 360) % 360;
      const extraSpins = 6 * 360;
      const nextRotation = rotation + extraSpins + normalizedDelta;

      // Simulate tick sound during spin
      let tickInterval: any;
      let ticksCount = 0;
      const totalTicks = 35;
      tickInterval = setInterval(() => {
        playTickSound();
        ticksCount++;
        if (ticksCount >= totalTicks) {
          clearInterval(tickInterval);
        }
      }, 130);

      setRotation(nextRotation);

      // Wait for animation (5 seconds) to complete
      setTimeout(() => {
        clearInterval(tickInterval);
        setSpinning(false);
        setWinResult(result);
        setShowWinModal(true);

        // Sound & Confetti
        const isJackpot = result.winning_item.is_jackpot;
        playWinSound(isJackpot);

        if (isJackpot) {
          confetti({
            particleCount: 180,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
          });
        } else {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#FBBF24', '#FFFFFF', '#6366F1']
          });
        }

        // Update wheel status (free spin now consumed)
        setWheelDetail((prev) => (prev ? { ...prev, is_free_spin_available: false } : null));
        setWheels((prev) =>
          prev.map((w) => (w.id === wheelDetail.id ? { ...w, is_free_spin_available: false } : w))
        );

        // Refresh History
        loadHistory(wheelDetail.id);
      }, 5100);
    } catch (err: any) {
      setSpinning(false);
      setErrorToast(getApiErrorMessage(err, "Aylantirishda xatolik yuz berdi"));
    }
  };

  // SVG Slices Geometry Calculation
  const slices = useMemo(() => {
    if (!wheelDetail?.items || wheelDetail.items.length === 0) return [];
    const items = wheelDetail.items;
    const n = items.length;
    const step = 360 / n;
    const r = 180;
    const cx = 200;
    const cy = 200;

    return items.map((it, idx) => {
      // Slices start from 12 o'clock (-90 degrees in SVG coordinate)
      const startAngle = idx * step - 90;
      const endAngle = (idx + 1) * step - 90;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);

      const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

      const midAngle = startAngle + step / 2;
      const midRad = (midAngle * Math.PI) / 180;
      const textRadius = r * 0.68;
      const textX = cx + textRadius * Math.cos(midRad);
      const textY = cy + textRadius * Math.sin(midRad);

      return {
        ...it,
        pathD,
        textX,
        textY,
        textAngle: midAngle + 90
      };
    });
  }, [wheelDetail]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const localeStr = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
      return d.toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-studio-950 text-studio-100 py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
            <span>{t('wheel.guaranteedPrizes')}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-3">
            <span>{t('wheel.titlePart1')}</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-amber-300 to-brand-500">
              {t('wheel.titlePart2')}
            </span>
            <span>🎡</span>
          </h1>

          <p className="text-sm sm:text-base text-studio-400 max-w-xl mx-auto">
            {t('wheel.subtitle')}
          </p>
        </div>

        {/* Wheels Switcher (If multiple wheels exist) */}
        {wheels.length > 1 && (
          <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2">
            {wheels.map((w) => (
              <button
                key={w.id}
                disabled={spinning}
                onClick={() => handleSelectWheel(w)}
                className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border ${
                  selectedWheelId === w.id
                    ? 'bg-brand-500 text-slate-950 border-brand-400 shadow-glow-brand'
                    : 'bg-studio-900/80 text-studio-300 border-studio-800 hover:border-studio-700'
                }`}
              >
                <span>⚡</span>
                <span>{{ ...w }.title}</span>
                {w.is_free_spin_available && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-slate-950 font-black animate-pulse">
                    {t('wheel.freeBadge')}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Error Notification Toast */}
        {errorToast && (
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorToast}</span>
            </div>
            <button
              onClick={() => setErrorToast(null)}
              className="text-rose-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content Layout: Wheel on Left, History & Odds on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Wheel Arena Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full glass-card rounded-3xl p-6 sm:p-8 border border-studio-800/80 bg-studio-900/40 backdrop-blur-xl relative flex flex-col items-center shadow-2xl">
              {/* Sound & Status Header */}
              <div className="w-full flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs">
                  {wheelDetail?.is_free_spin_available ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      {t('wheel.todayFreeAvailable')}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-studio-800 border border-studio-700 text-studio-400 font-medium">
                      {t('wheel.costLabel')} <strong className="text-amber-400 font-mono">{wheelDetail?.cost_coins || 100} ⚡</strong>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2 rounded-xl bg-studio-800/60 hover:bg-studio-800 text-studio-400 hover:text-white transition-colors"
                  title={soundEnabled ? t('wheel.soundOff') : t('wheel.soundOn')}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-brand-400" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              {/* Interactive Wheel Component */}
              <div className="relative w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] my-4 flex items-center justify-center select-none">
                {/* Outer Decorative Neon Frame */}
                <div className="absolute inset-0 rounded-full border-8 border-studio-800 shadow-[0_0_50px_rgba(245,158,11,0.25)] pointer-events-none" />
                <div className="absolute -inset-2 rounded-full border-2 border-dashed border-amber-500/40 animate-[spin_60s_linear_infinite] pointer-events-none" />

                {/* Rotating Wheel Disk */}
                <div
                  className="w-full h-full rounded-full overflow-hidden transition-transform ease-out will-change-transform"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transitionDuration: spinning ? '5000ms' : '0ms',
                    transitionTimingFunction: 'cubic-bezier(0.12, 0.8, 0.2, 1.0)'
                  }}
                >
                  <svg className="w-full h-full" viewBox="0 0 400 400">
                    <g>
                      {slices.map((slice) => (
                        <path
                          key={slice.id}
                          d={slice.pathD}
                          fill={slice.color}
                          stroke="#0F172A"
                          strokeWidth="2.5"
                        />
                      ))}
                      {slices.map((slice) => (
                        <g
                          key={'label-' + slice.id}
                          transform={`rotate(${slice.textAngle}, ${slice.textX}, ${slice.textY})`}
                        >
                          <text
                            x={slice.textX}
                            y={slice.textY}
                            fill={slice.text_color || '#FFFFFF'}
                            fontSize="13"
                            fontWeight="900"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            className="font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                          >
                            {slice.label}
                          </text>
                        </g>
                      ))}
                    </g>
                  </svg>
                </div>

                {/* Top Pointer Stopper */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                  <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] border-t-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-studio-950 absolute top-1 left-1/2 -translate-x-1/2" />
                </div>

                {/* Center Hub & Action Button */}
                <button
                  disabled={spinning}
                  onClick={handleSpin}
                  className={`absolute z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_30px_rgba(0,0,0,0.8)] ${
                    spinning
                      ? 'bg-studio-800 text-studio-500 cursor-not-allowed border-4 border-studio-700'
                      : wheelDetail?.is_free_spin_available
                      ? 'bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-studio-950 border-4 border-yellow-200 hover:scale-105 shadow-glow-brand active:scale-95'
                      : 'bg-gradient-to-tr from-brand-600 to-brand-400 text-studio-950 border-4 border-amber-300 hover:scale-105 shadow-glow-brand active:scale-95'
                  }`}
                >
                  <Zap className={`w-5 h-5 sm:w-6 sm:h-6 fill-current ${spinning ? 'animate-spin' : ''}`} />
                  <span className="mt-0.5 font-extrabold">{spinning ? '...' : 'SPIN'}</span>
                </button>
              </div>

              {/* Spin Action CTA Button Bar */}
              <div className="w-full max-w-sm mt-4 space-y-2">
                <button
                  disabled={spinning}
                  onClick={handleSpin}
                  className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 ${
                    spinning
                      ? 'bg-studio-800 text-studio-500 cursor-not-allowed'
                      : wheelDetail?.is_free_spin_available
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 shadow-glow-brand hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-glow-brand hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {spinning ? (
                    <>
                      <RotateCw className="w-5 h-5 animate-spin" />
                      <span>{t('wheel.spinning')}</span>
                    </>
                  ) : !isAuthenticated ? (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      <span>{t('wheel.loginToSpin')}</span>
                    </>
                  ) : wheelDetail?.is_free_spin_available ? (
                    <>
                      <Sparkles className="w-5 h-5 fill-current" />
                      <span>{t('wheel.freeSpinToday')}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      <span>{t('wheel.spinWithCoins').replace('{cost}', String(wheelDetail?.cost_coins || 100))}</span>
                    </>
                  )}
                </button>

                {isAuthenticated && (
                  <div className="flex items-center justify-between px-2 text-xs text-studio-400">
                    <span>{t('wheel.yourBalance')}</span>
                    <span className="font-bold text-amber-400 font-mono flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-amber-400" />
                      {user?.lightning_coins || 0} ⚡ {t('common.coins')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live History & Probabilities (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tabs Header */}
            <div className="glass-card rounded-2xl p-1.5 border border-studio-800/80 bg-studio-900/60 flex items-center gap-1">
              <button
                onClick={() => setActiveTab('public_history')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'public_history'
                    ? 'bg-brand-500 text-slate-950 shadow-sm'
                    : 'text-studio-400 hover:text-white hover:bg-studio-800/60'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>{t('wheel.tabLiveWins')}</span>
              </button>

              <button
                onClick={() => setActiveTab('my_history')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'my_history'
                    ? 'bg-brand-500 text-slate-950 shadow-sm'
                    : 'text-studio-400 hover:text-white hover:bg-studio-800/60'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>{t('wheel.tabMyHistory')}</span>
              </button>

              <button
                onClick={() => setActiveTab('odds')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'odds'
                    ? 'bg-brand-500 text-slate-950 shadow-sm'
                    : 'text-studio-400 hover:text-white hover:bg-studio-800/60'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>{t('wheel.tabOdds')}</span>
              </button>
            </div>

            {/* Tab 1: Live Public Feed */}
            {activeTab === 'public_history' && (
              <div className="glass-card rounded-2xl p-5 border border-studio-800/80 bg-studio-900/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-studio-800 text-xs font-bold text-studio-400">
                  <span>{t('wheel.colWinner')}</span>
                  <span>{t('wheel.colPrize')}</span>
                </div>

                {historyLoading ? (
                  <div className="py-8 text-center text-xs text-studio-400">{t('common.loading')}</div>
                ) : publicHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs text-studio-500 font-mono">
                    {t('wheel.noWinsYet')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {publicHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-studio-800/50 hover:bg-studio-800 border border-studio-750 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-studio-700 flex items-center justify-center text-[11px] font-bold text-studio-200">
                            {item.user_name.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>@{item.user_name}</span>
                              {item.is_free_spin && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                                  {t('wheel.freeBadge')}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-studio-400">{formatDate(item.created_at)}</span>
                          </div>
                        </div>

                        <div className="font-bold font-mono text-right">
                          <span className="text-amber-400 flex items-center gap-1">
                            {item.reward_type === 'coins' ? '⚡' : '🎁'} {item.reward_label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Personal Spin History */}
            {activeTab === 'my_history' && (
              <div className="glass-card rounded-2xl p-5 border border-studio-800/80 bg-studio-900/40 space-y-3">
                {!isAuthenticated ? (
                  <div className="py-12 text-center space-y-3">
                    <p className="text-xs text-studio-400">
                      {t('wheel.loginToViewHistory')}
                    </p>
                    <button
                      onClick={() => openAuthModal('login')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 text-slate-950 hover:bg-brand-400"
                    >
                      {t('nav.login')}
                    </button>
                  </div>
                ) : historyLoading ? (
                  <div className="py-8 text-center text-xs text-studio-400">{t('common.loading')}</div>
                ) : myHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs text-studio-500 font-mono">
                    {t('wheel.noSpinsYet')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {myHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-studio-800/50 border border-studio-750 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="text-amber-400">{item.reward_label}</span>
                          </div>
                          <span className="text-[10px] text-studio-400 font-mono">
                            {item.cost_paid > 0
                              ? t('wheel.spentCoins').replace('{cost}', String(item.cost_paid))
                              : t('wheel.freeSpin')}
                          </span>
                        </div>
                        <span className="text-[10px] text-studio-400 font-mono">{formatDate(item.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Probabilities / Fair Play Disclosure */}
            {activeTab === 'odds' && (
              <div className="glass-card rounded-2xl p-5 border border-studio-800/80 bg-studio-900/40 space-y-3">
                <div className="text-xs text-studio-400 pb-2 border-b border-studio-800 flex items-center justify-between">
                  <span>{t('wheel.colSector')}</span>
                  <span>{t('wheel.colProbability')}</span>
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {wheelDetail?.items.map((it) => (
                    <div
                      key={it.id}
                      className="p-2.5 rounded-xl bg-studio-800/40 border border-studio-750 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: it.color }} />
                        <span className="font-bold text-white">{it.label}</span>
                        {it.is_jackpot && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            JACKPOT
                          </span>
                        )}
                      </div>
                      <div className="font-mono font-bold text-brand-400">
                        {it.probability_percent}%
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-studio-400 pt-2 border-t border-studio-800/80 italic">
                  {t('wheel.guaranteedNotice')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* WINNER ANNOUNCEMENT MODAL                               */}
      {/* ======================================================= */}
      {showWinModal && winResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setShowWinModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-studio-900 via-studio-900 to-studio-950 border-2 border-amber-400/40 shadow-[0_0_60px_rgba(245,158,11,0.3)] text-center space-y-5 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient burst behind icon */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Prize Badge Icon */}
            <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-1 flex items-center justify-center shadow-glow-brand animate-bounce">
              <div className="w-full h-full rounded-[22px] bg-studio-950 flex items-center justify-center">
                {winResult.winning_item.reward_type === 'coins' ? (
                  <Zap className="w-12 h-12 text-amber-400 fill-amber-400" />
                ) : (
                  <Gift className="w-12 h-12 text-purple-400" />
                )}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 font-mono">
                {winResult.winning_item.is_jackpot ? t('wheel.jackpotPrize') : t('wheel.congratulations')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                {winResult.winning_item.label}
              </h2>
            </div>

            {/* Notification message */}
            <div className="p-3.5 rounded-2xl bg-studio-800/80 border border-studio-700/80 text-xs sm:text-sm text-studio-200">
              {winResult.message}
            </div>

            {/* Balance info */}
            <div className="py-2 px-4 rounded-xl bg-studio-950/60 border border-studio-800 inline-flex items-center gap-2 text-xs font-mono text-studio-400">
              <span>{t('wheel.yourNewBalance')}</span>
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                {winResult.new_balance} ⚡ {t('common.coins')}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              {winResult.winning_item.reward_type === 'shop_item' && (
                <Link
                  to="/inventory"
                  onClick={() => setShowWinModal(false)}
                  className="w-full sm:flex-1 py-3 rounded-xl text-xs font-bold bg-studio-800 hover:bg-studio-700 text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4 text-purple-400" />
                  <span>{t('wheel.profileAndInventory')}</span>
                </Link>
              )}
              <button
                onClick={() => setShowWinModal(false)}
                className="w-full sm:flex-1 py-3 rounded-xl text-xs font-black bg-brand-500 hover:bg-brand-400 text-slate-950 transition-all shadow-glow-brand"
              >
                {t('wheel.playAgain')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LuckyWheelPage;
