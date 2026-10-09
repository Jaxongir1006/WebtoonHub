import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Gem, Loader2, Volume2, VolumeX, Zap } from 'lucide-react';
import { gachaApi, GachaHistoryItem, GachaPool, GachaPoolDetail, GachaRollResult } from '../../api/gacha';
import { getApiErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ShopItem } from '../../types';
import { CARD_RARITIES, cardMediaSources, cardRarity } from '../../utils/cards';
import { PendingGacha, readPendingGacha, storePendingGacha, clearPendingGacha, validGachaResult, gachaStripOffset, formatGachaProbability } from '../../utils/gachaIntent';
import { parseApiDate } from '../../utils/date';
import { CharacterCard, RarityBadge } from './CharacterCard';
import { Modal } from '../common/Modal';

const rarityGlow = {
  common: 'border-slate-400/60 shadow-[0_0_40px_rgba(148,163,184,0.2)]',
  rare: 'border-sky-400/70 shadow-[0_0_50px_rgba(56,189,248,0.3)]',
  epic: 'border-violet-400/70 shadow-[0_0_60px_rgba(167,139,250,0.35)]',
  legendary: 'border-amber-300/80 shadow-[0_0_70px_rgba(252,211,77,0.4)]'
};

const GachaStripCard: React.FC<{ card: ShopItem; eager: boolean }> = ({ card, eager }) => {
  const poster = cardMediaSources(card).poster;
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [poster]);
  return <div className={`w-[136px] shrink-0 rounded-2xl border-2 bg-studio-900 p-2 ${rarityGlow[cardRarity(card.rarity)]}`}>
    <div className="aspect-[3/4] overflow-hidden rounded-xl bg-studio-800">{poster && !failed ? <img src={poster} alt="" draggable={false} onError={() => setFailed(true)} className="h-full w-full object-cover" loading={eager ? 'eager' : 'lazy'} /> : <Gem className="mx-auto mt-16 h-8 w-8 text-studio-500" />}</div>
    <p className="mt-2 truncate text-xs font-bold text-white">{card.name}</p><div className="mt-1"><RarityBadge rarity={card.rarity} /></div>
  </div>;
};

export const CharacterGachaPanel: React.FC<{ onBusyChange: (busy: boolean) => void }> = ({ onBusyChange }) => {
  const { user, isAuthenticated, isLoading: authLoading, openAuthModal, updateCoinsLocally, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const motionPreference = useRef(reducedMotion); motionPreference.current = reducedMotion;
  const identity = useRef(user?.id); identity.current = user?.id;
  const mounted = useRef(true), generation = useRef(0), listRequest = useRef(0), detailRequest = useRef(0), historyRequest = useRef(0);
  const rollLock = useRef(false), pendingRef = useRef<PendingGacha | null>(null);
  const finishRoll = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), soundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frames = useRef<number[]>([]), audio = useRef<AudioContext | null>(null);
  const [pools, setPools] = useState<GachaPool[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedRef = useRef(selectedId); selectedRef.current = selectedId;
  const [pool, setPool] = useState<GachaPoolDetail | null>(null);
  const [loading, setLoading] = useState(true), [detailLoading, setDetailLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false), [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingGacha | null>(null);
  const [phase, setPhase] = useState<'idle' | 'requesting' | 'rolling'>('idle');
  const [strip, setStrip] = useState<ShopItem[]>([]), [targetIndex, setTargetIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GachaRollResult | null>(null), [showResult, setShowResult] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundPreference = useRef(soundEnabled); soundPreference.current = soundEnabled;
  const [history, setHistory] = useState<GachaHistoryItem[]>([]), [historyLoading, setHistoryLoading] = useState(false), [historyError, setHistoryError] = useState(false);
  const viewport = useRef<HTMLDivElement>(null), [viewportWidth, setViewportWidth] = useState(600);
  const busy = phase !== 'idle';
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);

  const stopAnimation = () => {
    if (timer.current) clearTimeout(timer.current);
    if (soundTimer.current) clearTimeout(soundTimer.current);
    timer.current = null; soundTimer.current = null;
    frames.current.forEach(frame => cancelAnimationFrame(frame)); frames.current = [];
  };
  const playTone = (win = false) => {
    if (!soundPreference.current || motionPreference.current) return;
    try {
      const ctx = audio.current;
      if (!ctx || ctx.state === 'closed') return;
      const notes = win ? [523.25, 659.25, 783.99, 1046.5] : [800];
      notes.forEach((frequency, index) => {
        const oscillator = ctx.createOscillator(), gain = ctx.createGain(), at = ctx.currentTime + index * 0.1;
        oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(win ? 0.08 : 0.035, at); gain.gain.exponentialRampToValueAtTime(0.001, at + (win ? 0.35 : 0.035));
        oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(at); oscillator.stop(at + (win ? 0.4 : 0.04));
      });
    } catch { /* Sound must never prevent receipt recovery. */ }
  };
  const enableAudio = () => {
    if (!soundPreference.current || motionPreference.current) return;
    try {
      audio.current ||= new AudioContext();
      if (audio.current.state === 'suspended') void audio.current.resume().catch(() => undefined);
    } catch { /* Browsers may not provide audio. */ }
  };

  const loadHistory = async () => {
    if (!identity.current) { setHistory([]); return; }
    const request = ++historyRequest.current, actor = identity.current;
    setHistoryLoading(true); setHistoryError(false);
    try {
      const rows = await gachaApi.history();
      if (mounted.current && actor === identity.current && request === historyRequest.current) setHistory(rows);
    } catch {
      if (mounted.current && actor === identity.current && request === historyRequest.current) setHistoryError(true);
    } finally {
      if (mounted.current && actor === identity.current && request === historyRequest.current) setHistoryLoading(false);
    }
  };
  const loadDetail = async (id: number) => {
    const request = ++detailRequest.current, epoch = generation.current;
    setDetailLoading(true); setPool(null); setLoadError(null);
    try {
      const detail = await gachaApi.getPool(id);
      if (mounted.current && epoch === generation.current && request === detailRequest.current) { setPool(detail); setLoadError(null); }
    } catch (failure) {
      if (mounted.current && epoch === generation.current && request === detailRequest.current) setLoadError(getApiErrorMessage(failure, t('gacha.loadError')));
    } finally {
      if (mounted.current && epoch === generation.current && request === detailRequest.current) setDetailLoading(false);
    }
  };
  const loadPools = async () => {
    const request = ++listRequest.current, epoch = generation.current;
    detailRequest.current++;
    setLoading(true); setLoadFailed(false); setLoadError(null);
    try {
      const rows = await gachaApi.listPools();
      if (!mounted.current || epoch !== generation.current || request !== listRequest.current) return;
      setPools(rows); setLoadError(null);
      const remembered = pendingRef.current?.pool_id ?? selectedRef.current;
      const id = rows.some(value => value.id === remembered) ? remembered! : rows[0]?.id;
      if (id) { setSelectedId(id); await loadDetail(id); }
      else { detailRequest.current++; setSelectedId(null); setPool(null); setDetailLoading(false); }
    } catch (failure) {
      if (mounted.current && epoch === generation.current && request === listRequest.current) {
        setLoadFailed(true); setLoadError(getApiErrorMessage(failure, t('gacha.loadError')));
      }
    } finally {
      if (mounted.current && epoch === generation.current && request === listRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true; generation.current++;
    stopAnimation(); finishRoll.current = null; rollLock.current = false;
    const remembered = user ? readPendingGacha(user.id) : null;
    pendingRef.current = remembered; setPending(remembered);
    setPhase('idle'); setPool(null); setPools([]); setStrip([]); setResult(null); setShowResult(false); setRunning(false);
    setHistory([]); setError(null); setLoadError(null); setHistoryError(false);
    if (!authLoading) { void loadPools(); void loadHistory(); }
    return () => {
      mounted.current = false; generation.current++; listRequest.current++; detailRequest.current++; historyRequest.current++;
      stopAnimation(); finishRoll.current = null; rollLock.current = false;
      if (audio.current) void audio.current.close().catch(() => undefined);
      audio.current = null;
    };
  }, [user?.id, authLoading]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => { if (element.clientWidth > 0) setViewportWidth(element.clientWidth); };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element); window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [pool?.id, strip.length]);
  useEffect(() => { if (reducedMotion) finishRoll.current?.(); }, [reducedMotion]);

  const handleRoll = async () => {
    if (!user || !isAuthenticated) { openAuthModal('login'); return; }
    if (rollLock.current) return;
    const existing = pendingRef.current?.owner_id === user.id ? pendingRef.current : readPendingGacha(user.id);
    if (!existing && (!pool || detailLoading || loading || pool.id !== selectedId || !pool.is_active || !pool.cards.length || !pool.rarity_rates.some(rate => rate.probability_percent > 0))) return;
    if (!existing && user.lightning_coins < pool!.cost_coins) { setError(t('socialFix.insufficientCoins', { cost: pool!.cost_coins, balance: user.lightning_coins })); return; }
    const intent: PendingGacha = existing ?? {
      owner_id: user.id, pool_id: pool!.id, expected_cost: pool!.cost_coins, expected_version: pool!.version,
      operation_key: crypto.randomUUID(), created_at: new Date().toISOString()
    };
    if (!existing && !storePendingGacha(intent)) { setError(t('gacha.storage')); return; }
    pendingRef.current = intent; setPending(intent);
    const epoch = generation.current, actor = user.id;
    const active = () => mounted.current && epoch === generation.current && actor === identity.current;
    rollLock.current = true; setPhase('requesting'); setError(null); setShowResult(false); setStrip([]); setRunning(false); enableAudio();
    try {
      const receipt = await gachaApi.roll(intent.pool_id, {
        expected_cost: intent.expected_cost, expected_version: intent.expected_version, operation_key: intent.operation_key
      });
      if (!active()) return;
      if (!validGachaResult(receipt, intent.pool_id)) throw new Error(t('gacha.pending'));
      if (!existing) updateCoinsLocally(receipt.new_balance);
      const finish = () => {
        if (!active()) return;
        stopAnimation(); finishRoll.current = null;
        clearPendingGacha(intent); pendingRef.current = null; setPending(null);
        rollLock.current = false; setPhase('idle'); setRunning(true); setResult(receipt); setShowResult(true);
        if (!existing && !motionPreference.current) playTone(true);
        void loadPools(); void loadHistory(); void refreshProfile().catch(() => undefined);
      };
      finishRoll.current = finish;
      setStrip(receipt.animation_cards); setTargetIndex(receipt.winning_index);
      if (motionPreference.current || existing) { finish(); return; }
      setPhase('rolling');
      // Paint the server's strip at its starting position before beginning the transition.
      frames.current.push(requestAnimationFrame(() => {
        if (!active()) return;
        frames.current.push(requestAnimationFrame(() => {
          if (!active() || finishRoll.current !== finish) return;
          setRunning(true);
          let ticks = 0;
          const tick = () => {
            if (!active() || !finishRoll.current) return;
            playTone(); ticks++;
            if (ticks < 24) soundTimer.current = setTimeout(tick, 65 + ticks * 14);
          };
          tick(); timer.current = setTimeout(finish, 5300);
        }));
      }));
    } catch (failure) {
      if (!active()) return;
      stopAnimation(); finishRoll.current = null; rollLock.current = false; setPhase('idle');
      const status = axios.isAxiosError(failure) ? failure.response?.status : undefined;
      const detail = axios.isAxiosError(failure) ? failure.response?.data?.error?.message ?? failure.response?.data?.detail ?? '' : '';
      const unresolved = status === 409 && /operation.*(?:in progress|different action)/i.test(String(detail));
      if (!unresolved && status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        clearPendingGacha(intent); pendingRef.current = null; setPending(null);
        setError(status === 409 ? t('gacha.changed') : getApiErrorMessage(failure, t('common.error')));
        void loadPools();
      } else setError(t('gacha.pending'));
    }
  };

  const poolReady = !!pool && pool.is_active && pool.cards.length > 0 && pool.rarity_rates.some(rate => rate.probability_percent > 0);
  const insufficient = !!user && !!pool && user.lightning_coins < pool.cost_coins;
  const previewCards = strip.length ? strip : pool?.cards.slice(0, 8) || [];
  const probability = (value: number) => formatGachaProbability(value, language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US');
  const dateLabel = (value: string) => parseApiDate(value).toLocaleString(language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });

  return <section className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
    <header className="mx-auto max-w-2xl space-y-3 text-center"><Gem className="mx-auto h-8 w-8 text-violet-300" aria-hidden="true" /><h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{t('gacha.title')}</h1><p className="text-sm leading-relaxed text-studio-300">{t('gacha.subtitle')}</p><p className="text-xs leading-relaxed text-studio-400">{t('gacha.rules')}</p></header>
    {error && <div role="alert" className="flex gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300"><AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" /><p>{error}</p></div>}
    {loadError && <div role="alert" className="flex gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300"><AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" /><p>{loadError}</p></div>}
    {pending && !busy && <div role="status" className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"><p>{t('gacha.pending')}</p><button type="button" onClick={handleRoll} className="min-h-11 rounded-xl bg-brand-500 px-4 font-bold text-studio-950">{t('gacha.retry')}</button></div>}
    {loading || authLoading ? <p role="status" className="flex items-center justify-center gap-2 py-16"><Loader2 className="h-5 w-5 animate-spin" />{t('common.loading')}</p> : loadFailed ? <div className="py-12 text-center"><button type="button" onClick={loadPools} className="min-h-11 rounded-xl bg-brand-500 px-5 font-bold text-studio-950">{t('common.retry')}</button></div> : !pools.length ? <div className="space-y-3 rounded-3xl border border-dashed border-studio-700 p-10 text-center"><h2 className="text-lg font-bold text-white">{t('gacha.noPools')}</h2><p className="text-sm text-studio-400">{t('gacha.noPoolsDetail')}</p><button type="button" onClick={loadPools} className="min-h-11 rounded-xl border border-studio-700 px-4 text-sm">{t('common.retry')}</button></div> : <>
      <div className="flex flex-wrap justify-center gap-3" aria-label={t('gacha.selectPool')}>{pools.map(value => <button key={value.id} type="button" aria-pressed={value.id === selectedId} disabled={busy || !!pending} onClick={() => { setSelectedId(value.id); setStrip([]); setRunning(false); setError(null); void loadDetail(value.id); }} className={`min-h-12 rounded-2xl border px-5 text-sm font-bold disabled:opacity-60 ${value.id === selectedId ? 'border-violet-400 bg-violet-500/20 text-violet-200' : 'border-studio-700 bg-studio-900 text-studio-300'}`}>{value.title}<span className="ml-3 text-xs font-normal">{value.cost_coins} ⚡</span></button>)}</div>
      {detailLoading ? <p role="status" className="py-12 text-center">{t('common.loading')}</p> : pool ? <>
        <div className="overflow-hidden rounded-3xl border border-studio-700 bg-studio-900 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5"><div><h2 className="text-xl font-bold text-white">{pool.title}</h2>{pool.description && <p className="mt-1 max-w-2xl whitespace-pre-wrap text-sm text-studio-400">{pool.description}</p>}</div><button type="button" aria-pressed={soundEnabled} aria-label={t(soundEnabled ? 'gacha.soundOff' : 'gacha.soundOn')} onClick={() => setSoundEnabled(value => !value)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-studio-700 text-studio-300">{soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button></div>
          <div className="relative my-6 border-y border-studio-800 bg-studio-950 py-5">
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-brand-400 shadow-[0_0_15px_rgba(251,191,36,0.8)]" aria-hidden="true"><span className="absolute -left-2.5 top-0 h-0 w-0 border-x-[10px] border-t-[12px] border-x-transparent border-t-brand-400" /></div>
            <div ref={viewport} role="img" aria-label={t('gacha.preview')} className="overflow-hidden">
              <div aria-hidden="true" className="flex gap-3" style={{ width: 'max-content', transform: `translateX(${strip.length ? gachaStripOffset(viewportWidth, running ? targetIndex : 0) : 20}px)`, transition: phase === 'rolling' && running && !reducedMotion ? 'transform 5.2s cubic-bezier(0.08, 0.7, 0.1, 1)' : 'none', willChange: phase === 'rolling' ? 'transform' : undefined }}>
                {previewCards.map((card, index) => <GachaStripCard key={`${card.id}-${index}`} card={card} eager={index === targetIndex} />)}
                {!previewCards.length && <div className="h-60 w-[136px]" />}
              </div>
            </div>
            {phase === 'requesting' && <div className="absolute inset-0 z-20 flex items-center justify-center bg-studio-950/80"><Loader2 className="h-8 w-8 animate-spin text-violet-300" aria-hidden="true" /></div>}
          </div>
          <div className="space-y-4 px-5 pb-6 text-center">
            <p className="text-xs text-studio-400">{t('gacha.animationHint')}</p>
            <p role="status" aria-live="polite" className="min-h-5 text-sm text-violet-200">{phase === 'requesting' ? t('gacha.requesting') : phase === 'rolling' ? t('gacha.rolling') : !poolReady ? t('gacha.unconfigured') : ''}</p>
            <button type="button" onClick={handleRoll} disabled={busy || (!pending && (!poolReady || (isAuthenticated && insufficient)))} className="inline-flex min-h-12 min-w-56 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gem className="h-5 w-5" />}{busy ? t(phase === 'requesting' ? 'gacha.requesting' : 'gacha.rolling') : pending ? t('gacha.retry') : !isAuthenticated ? t('gacha.login') : t(pool.cost_coins ? 'gacha.roll' : 'gacha.freeRoll', { cost: pool.cost_coins })}</button>
            {user && <p className="flex items-center justify-center gap-1.5 text-sm text-studio-300"><Zap className="h-4 w-4 text-brand-400" aria-hidden="true" />{t('wheel.yourBalance')} <strong className="text-brand-300">{user.lightning_coins} ⚡</strong></p>}
            {!pending && insufficient && <p className="text-sm text-amber-300">{t('socialFix.needCoins', { amount: pool.cost_coins - user!.lightning_coins })}</p>}
          </div>
        </div>
        <section aria-label={t('gacha.odds')} className="space-y-4 rounded-3xl border border-studio-800 bg-studio-900 p-5 sm:p-7"><h2 className="text-lg font-bold text-white">{t('gacha.odds')}</h2><p className="text-sm leading-relaxed text-studio-400">{t('gacha.oddsDetail')}</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{CARD_RARITIES.map(rarity => <div key={rarity} className="rounded-2xl border border-studio-700 bg-studio-950/60 p-3"><RarityBadge rarity={rarity} /><p className="mt-3 text-xl font-black text-white">{probability(pool.rarity_rates.find(rate => rate.rarity === rarity)?.probability_percent || 0)}</p></div>)}</div></section>
        <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-white">{t('gacha.availableCards')}</h2><span className="text-sm text-studio-400">{t('gacha.cardCount', { count: pool.cards.length })}</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{pool.cards.map(card => <CharacterCard key={card.id} item={card} owned={card.is_owned}><p className="text-center text-sm font-bold text-studio-200">{probability(card.probability_percent)}</p></CharacterCard>)}</div></section>
      </> : <div className="py-8 text-center"><button type="button" onClick={loadPools} className="min-h-11 rounded-xl border border-studio-700 px-4">{t('common.retry')}</button></div>}
    </>}
    <section className="space-y-4 rounded-3xl border border-studio-800 bg-studio-900 p-5 sm:p-7"><h2 className="text-lg font-bold text-white">{t('gacha.history')}</h2>{!isAuthenticated ? <button type="button" onClick={() => openAuthModal('login')} className="min-h-11 text-sm text-brand-300 underline">{t('gacha.historyLogin')}</button> : historyLoading ? <p role="status" className="text-sm text-studio-400">{t('common.loading')}</p> : historyError ? <div role="alert" className="space-y-2 text-sm text-rose-300"><p>{t('gacha.historyError')}</p><button type="button" onClick={loadHistory} className="min-h-11 underline">{t('common.retry')}</button></div> : !history.length ? <p className="text-sm text-studio-400">{t('gacha.noHistory')}</p> : <ul className="divide-y divide-studio-800">{history.map(entry => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0 space-y-1"><p className="break-words text-sm font-bold text-white">{entry.winning_card.name}</p><p className="text-xs text-studio-400">{entry.pool_title} · {dateLabel(entry.created_at)}</p></div><div className="flex flex-wrap items-center gap-2"><RarityBadge rarity={entry.winning_card.rarity} /><span className={`text-xs ${entry.is_duplicate ? 'text-amber-300' : 'text-emerald-300'}`}>{t(entry.is_duplicate ? 'gacha.duplicateBadge' : 'gacha.newCard', { amount: entry.refund_coins })}</span></div></li>)}</ul>}</section>
    <div className="flex flex-wrap justify-center gap-4 text-sm"><Link to="/inventory?type=card" className="inline-flex min-h-11 items-center text-violet-300 underline">{t('gacha.viewCollection')}</Link><Link to="/shop" className="inline-flex min-h-11 items-center text-studio-300 underline">{t('gacha.shopLink')}</Link></div>
    {showResult && result && <Modal isOpen={showResult} onClose={() => setShowResult(false)} title={t('gacha.won')}><div className={`space-y-5 rounded-3xl border-2 p-4 ${rarityGlow[cardRarity(result.winning_card.rarity)]}`}><CharacterCard item={result.winning_card} owned featured /><p role="status" className="flex items-start gap-2 text-sm leading-relaxed text-studio-200"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />{t(result.is_duplicate ? 'gacha.duplicate' : 'gacha.added', { name: result.winning_card.name, amount: result.refund_coins })}</p><Link to="/inventory?type=card" className="flex min-h-11 items-center justify-center rounded-xl bg-brand-500 px-4 text-sm font-bold text-studio-950">{t('gacha.viewCollection')}</Link><button type="button" onClick={() => setShowResult(false)} className="min-h-11 w-full rounded-xl border border-studio-700 px-4 text-sm font-bold text-studio-200">{t('gacha.rollAgain')}</button></div></Modal>}
  </section>;
};
