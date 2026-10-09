import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Gem, Loader2, Star } from 'lucide-react';
import { CardCollection, CardCollectionSummary, CardRarity, InventoryItem } from '../../types';
import { shopApi } from '../../api/shop';
import { getApiErrorMessage } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { CARD_RARITIES, cardRarity, toggleFeaturedCard } from '../../utils/cards';
import { CharacterCard, RarityBadge } from './CharacterCard';

interface CardCollectionPanelProps {
  summary?: CardCollectionSummary;
  ownerId?: number;
  onSaved?: () => Promise<unknown>;
}

export const CardCollectionPanel: React.FC<CardCollectionPanelProps> = ({ summary, ownerId, onSaved }) => {
  const { t } = useLanguage();
  const [collection, setCollection] = useState<CardCollection | null>(null);
  const [loading, setLoading] = useState(!!ownerId);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [rarity, setRarity] = useState<CardRarity | 'all'>('all');
  const [message, setMessage] = useState<string | null>(null);
  const requestId = useRef(0);
  const identity = useRef(ownerId);
  identity.current = ownerId;
  const activeRequest = useRef<AbortController | null>(null);
  const savingLock = useRef(false);

  const load = useCallback(async () => {
    if (!ownerId) return;
    const request = ++requestId.current;
    activeRequest.current?.abort();
    const controller = new AbortController(); activeRequest.current = controller;
    setLoading(true); setError(null); setLoadFailed(false);
    try {
      const data = await shopApi.getMyCollection(controller.signal);
      if (request !== requestId.current || ownerId !== identity.current) return;
      setCollection(data); setSelected(data.featured_cards.map(card => card.id));
    } catch (failure) {
      if (request === requestId.current && !controller.signal.aborted) { setLoadFailed(true); setError(getApiErrorMessage(failure, t('cards.error'))); }
    } finally { if (request === requestId.current) setLoading(false); }
  }, [ownerId, t]);

  useEffect(() => {
    setCollection(null); setEditing(false); setSelected([]); setMessage(null); setError(null);
    void load();
    return () => { requestId.current++; activeRequest.current?.abort(); };
  }, [ownerId]);

  const save = async () => {
    if (!ownerId || savingLock.current) return;
    savingLock.current = true; setSaving(true); setError(null); setMessage(null);
    const actor = ownerId, controller = new AbortController(); activeRequest.current = controller;
    try {
      const data = await shopApi.updateFeaturedCards(selected, controller.signal);
      if (actor !== identity.current || controller.signal.aborted) return;
      setCollection(previous => previous ? { ...previous, ...data } : previous);
      setSelected(data.featured_cards.map(card => card.id)); setEditing(false); setMessage(t('cards.saved'));
      await onSaved?.().catch(() => undefined);
    } catch (failure) { if (actor === identity.current && !controller.signal.aborted) setError(getApiErrorMessage(failure, t('common.error'))); }
    finally { savingLock.current = false; if (actor === identity.current) setSaving(false); }
  };

  const displayed = ownerId ? collection || summary : summary;
  const cards: InventoryItem[] = collection?.cards || [];
  const visibleCards = cards.filter(card => rarity === 'all' || cardRarity(card.rarity) === rarity);
  const choose = (id: number) => {
    const next = toggleFeaturedCard(selected, id);
    if (next === selected) setMessage(t('cards.featuredLimit'));
    else { setSelected(next); setMessage(null); }
  };

  return <section aria-label={t('cards.collection')} className="space-y-5 rounded-3xl border border-studio-800 bg-studio-900 p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold text-white"><Gem className="h-5 w-5 text-brand-400" aria-hidden="true" />{t('cards.collection')}</h2><p className="mt-2 max-w-2xl text-xs leading-relaxed text-studio-300">{t('cards.description')}</p></div>{ownerId && cards.length > 0 && !editing && <button type="button" onClick={() => { setEditing(true); setSelected(displayed?.featured_cards.map(card => card.id) || []); setMessage(null); }} className="min-h-11 rounded-xl border border-brand-500/40 px-4 text-xs font-bold text-brand-400 hover:bg-brand-500/10">{t('cards.manage')}</button>}</div>
    {displayed && <div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><div className="rounded-xl border border-studio-800 bg-studio-950/50 p-3"><p className="text-xs text-studio-400">{t('cards.total')}</p><p className="mt-1 text-2xl font-black text-white">{displayed.total_cards}</p></div>{CARD_RARITIES.map(value => <div key={value} className="rounded-xl border border-studio-800 bg-studio-950/50 p-3"><RarityBadge rarity={value} /><p className="mt-2 text-xl font-bold text-white">{displayed.rarity_counts[value] || 0}</p></div>)}</div>}
    {message && <p role="status" className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 text-sm text-brand-300">{message}</p>}
    {error && <div role="alert" className="space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"><p>{error}</p>{ownerId && loadFailed && <button type="button" onClick={load} className="min-h-11 px-3 font-bold underline">{t('common.retry')}</button>}</div>}
    {loading ? <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-studio-300"><Loader2 className="h-5 w-5 animate-spin text-brand-400" />{t('cards.loading')}</p> : <>
      {!editing && <div><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Star className="h-4 w-4 text-brand-400" aria-hidden="true" />{t('cards.featured')}</h3>{displayed?.featured_cards.length ? <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-3">{displayed.featured_cards.map(card => <CharacterCard key={card.id} item={card} featured />)}</div> : !error && <p className="rounded-xl border border-dashed border-studio-700 p-4 text-sm text-studio-400">{t('cards.noFeatured')}</p>}</div>}
      {ownerId && !loadFailed && <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold text-white">{t(editing ? 'cards.manage' : 'cards.gallery')}</h3>{editing && <span className="text-sm font-semibold text-brand-400">{t('cards.featuredCount', { count: selected.length })}</span>}</div>
        {editing && <p className="text-xs text-studio-300">{t('cards.manageHint')}</p>}
        <div className="flex flex-wrap gap-2" aria-label={t('cards.all')}>{(['all', ...CARD_RARITIES] as const).map(value => <button type="button" key={value} aria-pressed={rarity === value} onClick={() => setRarity(value)} className={`min-h-11 rounded-xl border px-3 text-xs font-bold ${rarity === value ? 'border-brand-500 bg-brand-500 text-studio-950' : 'border-studio-700 text-studio-300 hover:text-white'}`}>{t(value === 'all' ? 'cards.all' : 'cards.rarity.' + value)}</button>)}</div>
        {visibleCards.length ? <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleCards.map(card => <CharacterCard key={card.id} item={card} owned>{editing && <button type="button" onClick={() => choose(card.id)} disabled={saving} aria-pressed={selected.includes(card.id)} aria-label={t('cards.selectFeatured', { name: card.name })} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold ${selected.includes(card.id) ? 'bg-brand-500 text-studio-950' : 'border border-studio-700 text-studio-300'}`}>{selected.includes(card.id) ? <Check className="h-4 w-4" aria-hidden="true" /> : <Star className="h-4 w-4" aria-hidden="true" />}{t(selected.includes(card.id) ? 'cards.removeFeatured' : 'cards.featureCard')}</button>}</CharacterCard>)}</div> : <div className="space-y-3 rounded-xl border border-dashed border-studio-700 p-6 text-center"><p className="text-sm font-bold text-white">{t(cards.length ? 'cards.emptyFilter' : 'cards.empty')}</p>{!cards.length && <><p className="mx-auto max-w-md text-xs text-studio-400">{t('cards.emptyDetail')}</p><Link to="/wheel?category=gacha" className="inline-flex min-h-11 items-center rounded-xl bg-brand-500 px-4 text-xs font-bold text-studio-950">{t('cards.buyCards')}</Link></>}</div>}
        {editing && <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-2xl border border-studio-700 bg-studio-950/95 p-3 shadow-xl"><button type="button" onClick={save} disabled={saving} className="flex min-h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-xs font-bold text-studio-950 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t('cards.save')}</button><button type="button" disabled={saving} onClick={() => { setEditing(false); setMessage(null); setError(null); }} className="min-h-11 px-4 text-xs font-bold text-studio-300">{t('cards.cancel')}</button></div>}
      </div>}
    </>}
  </section>;
};
