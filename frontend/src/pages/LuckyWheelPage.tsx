import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { CharacterGachaPanel } from '../components/cards/CharacterGachaPanel';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { wheelApi, WheelSummary, WheelDetail, SpinResult, SpinHistoryItem } from '../api/wheel';
import { getApiErrorMessage } from '../api/client';
import { Modal } from '../components/common/Modal';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { PendingSpin, readPendingSpin, storePendingSpin, clearPendingSpin } from '../utils/spinIntent';
import {
  Sparkles,
  Zap,
  Award,
  History,
  Info,
  AlertCircle,
  Volume2,
  VolumeX,
  RotateCw
} from 'lucide-react';

const LightningWheel: React.FC<{ onBusyChange: (busy: boolean) => void }> = ({ onBusyChange }) => {
  const { user, isAuthenticated, isLoading: authLoading, openAuthModal, updateCoinsLocally, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const motionPreference = useRef(reducedMotion); motionPreference.current = reducedMotion;
  const [pendingIntent, setPendingIntent] = useState<PendingSpin | null>(null);
  const pendingIntentRef = useRef<PendingSpin | null>(null);

  const [wheels, setWheels] = useState<WheelSummary[]>([]);
  const [selectedWheelId, setSelectedWheelId] = useState<number | null>(null);
  const [wheelDetail, setWheelDetail] = useState<WheelDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequest = useRef(0);
  const listRequest = useRef(0);
  const historyRequest = useRef(0);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishSpin = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  const spinLock = useRef(false);
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
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  useEffect(() => { onBusyChange(spinning); }, [spinning, onBusyChange]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play tick sound synthesized via Web Audio API
  const playTickSound = () => {
    if (!soundEnabled || motionPreference.current) return;
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
    if (!soundEnabled || motionPreference.current) return;
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
    const request = ++listRequest.current;
    try {
      setLoading(true);
      const data = await wheelApi.listWheels();
      if (!mounted.current || request !== listRequest.current) return;
      setWheels(data);
      if (data.length > 0) {
        const remembered = pendingIntentRef.current?.wheel_id ?? selectedWheelId;
        const targetId = data.some(wheel => wheel.id === remembered) ? remembered! : data[0].id;
        setSelectedWheelId(targetId);
        await loadWheelDetail(targetId);
      } else {
        detailRequest.current++; historyRequest.current++;
        setSelectedWheelId(null); setWheelDetail(null); setPublicHistory([]); setMyHistory([]);
      }
    } catch (err) {
      if (mounted.current && request === listRequest.current) setErrorToast(getApiErrorMessage(err, t('wheel.errorLoadingWheel')));
    } finally {
      if (mounted.current && request === listRequest.current) setLoading(false);
    }
  };

  // Load wheel detail
  const loadWheelDetail = async (wheelId: number) => {
    const request = ++detailRequest.current;
    setDetailLoading(true);
    setWheelDetail(null);
    try {
      const data = await wheelApi.getWheel(wheelId);
      if (!mounted.current || request !== detailRequest.current) return;
      setWheelDetail(data);
      loadHistory(wheelId);
    } catch (err) {
      if (mounted.current && request === detailRequest.current) setErrorToast(getApiErrorMessage(err, t('wheel.errorLoadingDetail')));
    } finally {
      if (mounted.current && request === detailRequest.current) setDetailLoading(false);
    }
  };

  const loadHistory = async (wheelId: number) => {
    const request = ++historyRequest.current;
    setHistoryLoading(true);
    try {
      const [pub, my] = await Promise.all([wheelApi.getWheelHistory(wheelId, 20), isAuthenticated ? wheelApi.getMyHistory(20) : Promise.resolve([])]);
      if (!mounted.current || request !== historyRequest.current) return;
      setPublicHistory(pub);
      setMyHistory(my);
    } catch (err) {
      if (mounted.current && request === historyRequest.current) setErrorToast(getApiErrorMessage(err, t('socialFix.loadFailed')));
    } finally {
      if (mounted.current && request === historyRequest.current) setHistoryLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    const remembered = user ? readPendingSpin(user.id) : null;
    pendingIntentRef.current = remembered; setPendingIntent(remembered);
    setWheelDetail(null); setSpinning(false); setShowWinModal(false); setWinResult(null); setErrorToast(null);
    setPublicHistory([]);
    setMyHistory([]);
    if (!authLoading) loadWheels();
    return () => {
      mounted.current = false;
      listRequest.current++;
      detailRequest.current++;
      historyRequest.current++;
      if (spinTimer.current) clearTimeout(spinTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
      spinLock.current = false; finishSpin.current = null;
    };
  }, [user?.id, authLoading]);

  // Handle Wheel Selection Change
  const handleSelectWheel = (w: WheelSummary) => {
    if (spinning || spinLock.current || pendingIntentRef.current) return;
    setSelectedWheelId(w.id);
    loadWheelDetail(w.id);
  };

  useEffect(() => {
    if (reducedMotion) finishSpin.current?.();
  }, [reducedMotion]);

  // Persist one intent before sending. An uncertain response always retries that intent.
  const handleSpin = async () => {
    if (!isAuthenticated || !user) { openAuthModal('login'); return; }
    if (spinning || spinLock.current) return;
    const existing = pendingIntentRef.current?.owner_id === user.id ? pendingIntentRef.current : readPendingSpin(user.id);
    if (!existing && (!wheelDetail || detailLoading || wheelDetail.id !== selectedWheelId)) return;
    const recovering = !!existing;
    const isFree = existing?.expected_mode === 'free' || (!existing && !!wheelDetail?.is_free_spin_available);
    const cost = existing?.expected_cost ?? (isFree ? 0 : wheelDetail!.cost_coins);
    if (!existing && !isFree && user.lightning_coins < cost) {
      setErrorToast(t('socialFix.insufficientCoins', { cost, balance: user.lightning_coins })); return;
    }
    const intent: PendingSpin = existing ?? {
      owner_id: user.id, wheel_id: wheelDetail!.id, operation_key: crypto.randomUUID(),
      expected_mode: isFree ? 'free' : 'paid', expected_cost: cost, created_at: new Date().toISOString()
    };
    if (!existing && !storePendingSpin(intent)) { setErrorToast(t('wheel.pendingStorage')); return; }
    pendingIntentRef.current = intent; setPendingIntent(intent);
    const identityRequest = listRequest.current;
    const active = () => mounted.current && identityRequest === listRequest.current;
    spinLock.current = true; setSpinning(true); setErrorToast(null);
    try {
      const result = await wheelApi.spinWheel(intent.wheel_id, {
        expected_mode: intent.expected_mode, expected_cost: intent.expected_cost, operation_key: intent.operation_key
      });
      if (!active()) return;
      if (!recovering) updateCoinsLocally(result.new_balance);
      const finish = () => {
        if (!active()) return;
        if (spinTimer.current) clearTimeout(spinTimer.current);
        if (tickTimer.current) clearInterval(tickTimer.current);
        spinTimer.current = null; tickTimer.current = null; finishSpin.current = null;
        clearPendingSpin(intent); pendingIntentRef.current = null; setPendingIntent(null);
        spinLock.current = false; setSpinning(false); setWinResult(result); setShowWinModal(true);
        if (!motionPreference.current && !recovering) {
          playWinSound(result.winning_item.is_jackpot);
          confetti({ particleCount: result.winning_item.is_jackpot ? 180 : 90, spread: 70,
            origin: { y: 0.6 }, colors: ['#F59E0B', '#FBBF24', '#FFFFFF', '#6366F1'] });
        }
        if (result.is_free_spin) {
          setWheelDetail(previous => previous?.id === intent.wheel_id ? { ...previous, is_free_spin_available: false } : previous);
          setWheels(previous => previous.map(wheel => wheel.id === intent.wheel_id ? { ...wheel, is_free_spin_available: false } : wheel));
        }
        loadHistory(intent.wheel_id);
        if (active()) void refreshProfile().catch(() => undefined);
      };
      finishSpin.current = finish;
      if (motionPreference.current || recovering || wheelDetail?.id !== intent.wheel_id || !wheelDetail.items.length) {
        finish(); return;
      }
      const step = 360 / wheelDetail.items.length;
      const target = 360 - (result.winning_index + 0.5) * step + (Math.random() - 0.5) * step * 0.5;
      const delta = ((target - rotation % 360) % 360 + 360) % 360;
      let ticks = 0;
      tickTimer.current = setInterval(() => { playTickSound(); if (++ticks >= 35 && tickTimer.current) clearInterval(tickTimer.current); }, 130);
      setRotation(rotation + 6 * 360 + delta);
      spinTimer.current = setTimeout(finish, 5100);
    } catch (error) {
      if (!active()) return;
      spinLock.current = false; setSpinning(false); finishSpin.current = null;
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const detail = axios.isAxiosError(error) ? error.response?.data?.error?.message ?? error.response?.data?.detail ?? '' : '';
      const operationUnresolved = status === 409 && /operation.*(?:in progress|different action)/i.test(String(detail));
      if (!operationUnresolved && status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        clearPendingSpin(intent); pendingIntentRef.current = null; setPendingIntent(null);
        setErrorToast(getApiErrorMessage(error, t('common.error')));
        if (selectedWheelId) loadWheelDetail(selectedWheelId);
      } else {
        setErrorToast(t('wheel.pendingSpin'));
      }
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
      return d.toLocaleString(localeStr, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (authLoading) return <div role="status" className="py-24 text-center">{t('common.loading')}</div>;
  const spinUnavailable = spinning || (!pendingIntent && isAuthenticated && !wheelDetail?.is_free_spin_available && (user?.lightning_coins ?? 0) < (wheelDetail?.cost_coins ?? 0));

  return (
    <div className="wheel-page min-h-screen bg-studio-950 text-studio-100 py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
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
                aria-pressed={selectedWheelId === w.id}
                disabled={spinning || !!pendingIntent}
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
          <div role="alert" className="max-w-md mx-auto p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorToast}</span>
            </div>
            <button
              aria-label={t('common.close')}
              onClick={() => setErrorToast(null)}
              className="text-rose-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {pendingIntent && !spinning && <div role="status" className="max-w-xl mx-auto p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-sm space-y-3">
          <p>{t('wheel.pendingSpin')}</p>
          <button onClick={handleSpin} className="min-h-11 px-4 rounded-xl bg-brand-500 text-studio-950 font-bold">{t('wheel.retrySpin')}</button>
        </div>}

        {/* Main Content Layout: Wheel on Left, History & Odds on Right */}
        {loading || detailLoading ? (
          <div role="status" className="py-24 text-center">{t('socialFix.selectWheel')}</div>
        ) : !wheelDetail || wheelDetail.items.length < 2 ? (
          <div className="py-24 text-center space-y-4"><p>{t('socialFix.noWheels')}</p><button onClick={loadWheels} className="px-5 py-3 bg-brand-500 text-studio-950 rounded-xl">{t('socialFix.retry')}</button></div>
        ) : <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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
                      {t('wheel.costLabel')} <strong className="text-amber-400 font-mono">{wheelDetail?.cost_coins ?? 0} ⚡</strong>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2 rounded-xl bg-studio-800/60 hover:bg-studio-800 text-studio-400 hover:text-white transition-colors"
                  title={soundEnabled ? t('wheel.soundOff') : t('wheel.soundOn')}
                  aria-label={soundEnabled ? t('wheel.soundOff') : t('wheel.soundOn')}
                  aria-pressed={soundEnabled}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-brand-400" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              {/* Interactive Wheel Component */}
              <div className="relative w-full max-w-[320px] sm:max-w-[400px] aspect-square my-4 flex items-center justify-center select-none">
                {/* Outer Decorative Neon Frame */}
                <div className="absolute inset-0 rounded-full border-8 border-studio-800 shadow-[0_0_50px_rgba(245,158,11,0.25)] pointer-events-none" />
                <div className="absolute -inset-2 rounded-full border-2 border-dashed border-amber-500/40 animate-[spin_60s_linear_infinite] pointer-events-none" />

                {/* Rotating Wheel Disk */}
                <div
                  className="w-full h-full rounded-full overflow-hidden transition-transform ease-out will-change-transform"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transitionDuration: spinning && !reducedMotion ? '5000ms' : '0ms',
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
                  disabled={spinUnavailable}
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
                  <span className="mt-0.5 font-extrabold">{spinning ? '...' : t(pendingIntent ? 'wheel.retrySpin' : 'socialFix.spin')}</span>
                </button>
              </div>

              {/* Spin Action CTA Button Bar */}
              <div className="w-full max-w-sm mt-4 space-y-2">
                <button
                  disabled={spinUnavailable}
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
                  ) : pendingIntent ? <span>{t('wheel.retrySpin')}</span> : !isAuthenticated ? (
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
                      <span>{wheelDetail.cost_coins === 0 ? t('socialFix.freeSpin') : t('wheel.spinWithCoins').replace('{cost}', String(wheelDetail.cost_coins))}</span>
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
                {spinUnavailable && !spinning && <p className="pt-2 text-center text-xs text-amber-300">{t('socialFix.needCoins', { amount: wheelDetail.cost_coins - (user?.lightning_coins ?? 0) })}</p>}
              </div>
            </div>
          </div>

          {/* Right Column: Live History & Probabilities (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tabs Header */}
            <div className="glass-card rounded-2xl p-1.5 border border-studio-800/80 bg-studio-900/60 flex items-center gap-1">
              <button
                aria-pressed={activeTab === 'public_history'} onClick={() => setActiveTab('public_history')}
                className={`flex-1 min-w-0 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'public_history'
                    ? 'bg-brand-500 text-slate-950 shadow-sm'
                    : 'text-studio-400 hover:text-white hover:bg-studio-800/60'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>{t('wheel.tabLiveWins')}</span>
              </button>

              <button
                aria-pressed={activeTab === 'my_history'} onClick={() => setActiveTab('my_history')}
                className={`flex-1 min-w-0 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'my_history'
                    ? 'bg-brand-500 text-slate-950 shadow-sm'
                    : 'text-studio-400 hover:text-white hover:bg-studio-800/60'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>{t('wheel.tabMyHistory')}</span>
              </button>

              <button
                aria-pressed={activeTab === 'odds'} onClick={() => setActiveTab('odds')}
                className={`flex-1 min-w-0 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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
                            {item.reward_label}
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
                            {t('socialFix.jackpot')}
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
        </div>}
      </div>

      {/* ======================================================= */}
      {/* WINNER ANNOUNCEMENT MODAL                               */}
      {/* ======================================================= */}
      {showWinModal && winResult && (
        <Modal isOpen={showWinModal} onClose={() => setShowWinModal(false)} title={t('wheel.congratulations')}>
          <div
            className="w-full max-w-md rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-studio-900 via-studio-900 to-studio-950 border-2 border-amber-400/40 shadow-[0_0_60px_rgba(245,158,11,0.3)] text-center space-y-5 relative overflow-hidden"
          >
            {/* Ambient burst behind icon */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Prize Badge Icon */}
            <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-1 flex items-center justify-center shadow-glow-brand animate-bounce">
              <div className="w-full h-full rounded-[22px] bg-studio-950 flex items-center justify-center">
                <Zap className="w-12 h-12 text-amber-400 fill-amber-400" />
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
              {t('wheel.coinResult', { amount: winResult.reward_coins ?? winResult.winning_item.reward_coins })}
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
              <button
                onClick={() => setShowWinModal(false)}
                className="w-full sm:flex-1 py-3 rounded-xl text-xs font-black bg-brand-500 hover:bg-brand-400 text-slate-950 transition-all shadow-glow-brand"
              >
                {t('wheel.playAgain')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export const LuckyWheelPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') === 'gacha' ? 'gacha' : 'wheel';
  const [wheelBusy, setWheelBusy] = useState(false);
  const [gachaBusy, setGachaBusy] = useState(false);
  const busy = wheelBusy || gachaBusy;
  const select = (next: 'wheel' | 'gacha') => {
    if (busy) return;
    const params = new URLSearchParams(searchParams);
    if (next === 'wheel') params.delete('category'); else params.set('category', next);
    setSearchParams(params, { replace: true });
    document.getElementById(`rewards-tab-${next}`)?.focus();
  };
  return <main className="min-h-screen bg-studio-950 text-studio-100">
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
      <div role="tablist" aria-label={t('gacha.categories')} className="flex gap-2 rounded-2xl border border-studio-800 bg-studio-900 p-2" onKeyDown={event => {
        if (busy) return;
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault(); select(event.key === 'Home' ? 'wheel' : event.key === 'End' ? 'gacha' : category === 'wheel' ? 'gacha' : 'wheel');
        }
      }}>
        {(['wheel', 'gacha'] as const).map(value => <button key={value} type="button" id={`rewards-tab-${value}`} role="tab" aria-selected={category === value} aria-controls={`rewards-panel-${value}`} tabIndex={category === value ? 0 : -1} disabled={busy && category !== value} onClick={() => select(value)} className={`min-h-12 flex-1 rounded-xl px-3 text-sm font-bold transition-colors disabled:opacity-50 ${category === value ? 'bg-brand-500 text-studio-950' : 'text-studio-300 hover:bg-studio-800'}`}>{value === 'wheel' ? '⚡ ' : '✦ '}{t(`gacha.category.${value}`)}</button>)}
      </div>
      <p className="mt-3 text-center text-xs leading-relaxed text-studio-400">{t('gacha.exclusive')}</p>
    </div>
    <div id="rewards-panel-wheel" role="tabpanel" aria-labelledby="rewards-tab-wheel" hidden={category !== 'wheel'}><LightningWheel onBusyChange={setWheelBusy} /></div>
    <div id="rewards-panel-gacha" role="tabpanel" aria-labelledby="rewards-tab-gacha" hidden={category !== 'gacha'}><CharacterGachaPanel onBusyChange={setGachaBusy} /></div>
  </main>;
};

export default LuckyWheelPage;
