import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { clansApi } from '../api/clans';
import { ClanDetail, ClanSummary } from '../types';
import { AvatarFrame } from '../components/common/AvatarFrame';
import { getApiErrorMessage } from '../api/client';
import { Modal } from '../components/common/Modal';
import {
  Shield,
  Plus,
  Search,
  Users,
  Award,
  Zap,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  Sparkles,
  Crown
} from 'lucide-react';

export const ClansPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, openAuthModal, updateCoinsLocally, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const actorIdentity = useRef(user?.id); actorIdentity.current = user?.id;
  const createLock = useRef(false);

  const [clans, setClans] = useState<ClanSummary[]>([]);
  const [myClan, setMyClan] = useState<ClanDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [creationCost, setCreationCost] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const requestId = useRef(0);
  const pageQuery = useRef('');
  const moreLock = useRef(false);
  const [clanTotal, setClanTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);

  // Create clan modal
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>('');
  const [formTag, setFormTag] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    const request = ++requestId.current;
    moreLock.current = false; setLoadingMore(false); setMoreError(false);
    setIsLoading(true);
    setLoadError(false);
    try {
      const [clansRes, myClanRes, settings] = await Promise.all([
        clansApi.getClans({ q: searchQuery.trim(), offset: 0, limit: 20 }),
        isAuthenticated ? clansApi.getMyClan() : Promise.resolve({ data: null }),
        clansApi.getSettings(),
      ]);
      if (request !== requestId.current) return;
      setClans(clansRes.data || []);
      pageQuery.current = searchQuery.trim();
      setClanTotal(clansRes.pagination?.total ?? clansRes.data.length);
      setNextOffset(clansRes.data.length);
      setHasMore(clansRes.pagination?.has_more ?? false);
      setMyClan(myClanRes.data || null);
      setCreationCost(settings.data.clan_creation_cost);
    } catch (err) {
      console.error("Error loading clans:", err);
      if (request === requestId.current) setLoadError(true);
    } finally {
      if (request === requestId.current) setIsLoading(false);
    }
  };

  const loadMoreClans = async () => {
    if (moreLock.current || !hasMore || isLoading) return;
    const request = requestId.current;
    moreLock.current = true; setLoadingMore(true); setMoreError(false);
    try {
      const result = await clansApi.getClans({ q: pageQuery.current, offset: nextOffset, limit: 20 });
      if (request !== requestId.current) return;
      setClans(previous => [...new Map([...previous, ...result.data].map(clan => [clan.id, clan])).values()]);
      setNextOffset(nextOffset + result.data.length);
      setClanTotal(result.pagination?.total ?? clanTotal);
      setHasMore(result.data.length > 0 && (result.pagination?.has_more ?? false));
    } catch { if (request === requestId.current) setMoreError(true); }
    finally { if (request === requestId.current) { moreLock.current = false; setLoadingMore(false); } }
  };

  useEffect(() => {
    setMyClan(null); setCreateModalOpen(false); setFormName(''); setFormTag(''); setFormDescription(''); setFormError(null);
    if (!authLoading) loadData();
    return () => { requestId.current++; };
  }, [isAuthenticated, user?.id, authLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenCreateModal = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setFormError(null);
    setCreateModalOpen(true);
  };

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    const actor = actorIdentity.current;
    if (!actor || isSubmitting || createLock.current) return;
    setFormError(null);

    if (creationCost === null || !formName.trim() || !formTag.trim()) {
      setFormError(t('common.error'));
      return;
    }

    createLock.current = true; setIsSubmitting(true);
    try {
      const res = await clansApi.createClan({
        name: formName.trim(),
        tag: formTag.trim().toUpperCase(),
        description: formDescription.trim(),
        avatar_url: user?.avatar_url || undefined,
        expected_cost: creationCost,
      });

      if (actor !== actorIdentity.current) return;
      if (res.data) {
        setCreateModalOpen(false);
        // Refresh local user coins if reduced
        if (typeof res.data.remaining_coins === 'number') updateCoinsLocally(res.data.remaining_coins);
        await refreshProfile().catch(() => undefined);
        if (actor !== actorIdentity.current) return;
        navigate(`/clans/${res.data.id}`);
      }
    } catch (err) {
      if (actor !== actorIdentity.current) return;
      setFormError(getApiErrorMessage(err, t('common.error')));
      const settings = await clansApi.getSettings().catch(() => null);
      if (actor === actorIdentity.current && settings) setCreationCost(settings.data.clan_creation_cost);
    } finally {
      createLock.current = false; setIsSubmitting(false);
    }
  };

  if (authLoading) return <div role="status" className="py-24 text-center">{t('common.loading')}</div>;
  return (
    <div className="min-h-screen bg-studio-950 pb-20">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-b from-purple-950/40 via-studio-900 to-studio-950 border-b border-studio-800/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-xs mb-3">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>{t('socialFix.clanSystem')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {t('clans.title')}
            </h1>
            <p className="text-studio-400 text-sm mt-2 max-w-xl">
              {t('clans.subtitle')}
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-3">
            {myClan ? (
              <Link
                to={`/clans/${myClan.id}`}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center gap-2 border border-purple-400/30"
              >
                <Shield className="w-5 h-5" />
                <span>{t('clans.myClan')}: [{myClan.tag}]</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={handleOpenCreateModal}
                disabled={authLoading || isLoading || loadError}
                className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-studio-950 font-black rounded-2xl shadow-glow-brand transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>{t('clans.createClan')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {/* My Clan Overview Card (if user is in a clan) */}
        {myClan && (
          <div className="mb-10 bg-gradient-to-r from-purple-950/60 via-studio-900 to-studio-900 border border-purple-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5 text-center md:text-left flex-col md:flex-row">
                <AvatarFrame
                  username={myClan.name}
                  avatarUrl={myClan.avatar_url || undefined}
                  frameUrl={myClan.frame_url}
                  size="lg"
                  className="shrink-0 drop-shadow-xl"
                />
                <div>
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                      [{myClan.tag}]
                    </span>
                    <h2 className="text-2xl font-black text-white">{myClan.name}</h2>
                    {myClan.my_role === 'leader' && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1 border border-amber-500/40">
                        <Crown className="w-3 h-3 text-amber-400" />
                        {t('socialFix.leader')}
                      </span>
                    )}
                  </div>
                  <p className="text-studio-400 text-xs mt-1 max-w-lg line-clamp-1">{myClan.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-studio-300 font-mono">
                    <span className="text-brand-400 font-bold">{t('socialFix.level', { level: myClan.level })}</span>
                    <span>•</span>
                    <span>XP: {myClan.xp} / {myClan.required_xp}</span>
                    <span>•</span>
                    <span>{t('socialFix.members')}: {myClan.member_count} / {myClan.max_members}</span>
                  </div>
                </div>
              </div>

              <Link
                to={`/clans/${myClan.id}`}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center gap-2"
              >
                <span>{t('socialFix.clanHub')}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-400" />
            <span>{t('socialFix.clanList')}</span>
          </h2>

          <form onSubmit={handleSearch} className="relative w-full sm:w-96 flex gap-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('socialFix.searchClans')}
              aria-label={t('socialFix.searchClans')}
              className="min-w-0 flex-1 pl-10 pr-4 py-3 bg-studio-900 border border-studio-800 rounded-xl text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
            />
            <button type="submit" className="px-4 py-3 bg-brand-500 text-studio-950 rounded-xl text-sm font-bold">{t('socialFix.search')}</button>
          </form>
        </div>

        {/* Clans Grid */}
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          </div>
        ) : loadError ? (
          <div role="alert" className="py-16 text-center space-y-4"><p>{t('socialFix.loadFailed')}</p><button onClick={loadData} className="px-4 py-3 bg-brand-500 text-studio-950 rounded-xl">{t('socialFix.retry')}</button></div>
        ) : clans.length === 0 ? (
          <div className="bg-studio-900/40 border border-dashed border-studio-800 rounded-3xl p-12 text-center max-w-md mx-auto">
            <Shield className="w-10 h-10 text-studio-600 mx-auto mb-3" />
            <h3 className="text-white font-bold text-base mb-1">{t('socialFix.noClans')}</h3>
            <p className="text-studio-500 text-xs mb-4">{t('socialFix.createHint')}</p>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-studio-950 font-bold text-sm rounded-xl"
            >
              {t('clans.createClan')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clans.map((c) => (
              <Link
                key={c.id}
                to={`/clans/${c.id}`}
                className="group bg-studio-900 border border-studio-800 hover:border-purple-500/50 rounded-3xl p-5 transition-all shadow-lg hover:shadow-2xl flex flex-col justify-between overflow-hidden relative"
              >
                {/* Banner backdrop */}
                {c.banner_url && (
                  <div className="absolute inset-0 h-20 opacity-20 group-hover:opacity-30 transition-opacity">
                    <img src={c.banner_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="relative z-10 flex items-start gap-4">
                  <AvatarFrame
                    username={c.name}
                    avatarUrl={c.avatar_url || undefined}
                    frameUrl={c.frame_url}
                    size="md"
                    className="shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                        [{c.tag}]
                      </span>
                      <h3 className="font-extrabold text-white text-base truncate group-hover:text-purple-300 transition-colors">
                        {c.name}
                      </h3>
                    </div>
                    <p className="text-xs text-studio-400 mt-1 line-clamp-2">
                      {c.description || t('socialFix.noClanDesc')}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-6 pt-4 border-t border-studio-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-studio-300 font-mono">
                    <span className="px-2 py-0.5 rounded-lg bg-studio-800 text-brand-400 font-bold">
                      {t('socialFix.level', { level: c.level })}
                    </span>
                    <span className="flex items-center gap-1 text-studio-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{c.member_count}/{c.max_members}</span>
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    c.is_recruiting
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-studio-800 text-studio-500'
                  }`}>
                    {c.is_recruiting ? t('clans.recruiting') : t('clans.closed')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {!isLoading && !loadError && clans.length > 0 && <div className="mt-6 text-center space-y-3">
          <p role="status" className="text-xs text-studio-400">{t('socialFix.loadedCount', { count: clans.length, total: clanTotal })}</p>
          {moreError && <p role="alert" className="text-sm text-rose-400">{t('socialFix.loadFailed')}</p>}
          {hasMore && <button disabled={loadingMore} onClick={loadMoreClans} className="px-5 py-3 rounded-xl bg-brand-500 text-studio-950 font-bold disabled:opacity-50">{loadingMore ? t('common.loading') : moreError ? t('socialFix.retry') : t('socialFix.loadMore')}</button>}
        </div>}
      </div>

      {/* Create Clan Modal */}
      {createModalOpen && (
          <Modal isOpen={createModalOpen} onClose={() => { if (!isSubmitting) setCreateModalOpen(false); }} title={t('clans.createClan')}>
          <div className="w-full">

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-studio-400">{t('socialFix.createHint')}</p>
              </div>
            </div>

            {formError && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-1.5" htmlFor="clanspage-field-1">
                  {t('clans.clanName')} *
                </label>
                <input id="clanspage-field-1"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t('socialFix.clanNameExample')}
                  maxLength={50}
                  minLength={3}
                  className="w-full px-4 py-2.5 bg-studio-950 border border-studio-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-1.5" htmlFor="clanspage-field-2">
                  {t('clans.clanTag')} ({t('socialFix.clanTagHint')}) *
                </label>
                <input id="clanspage-field-2"
                  type="text"
                  required
                  value={formTag}
                  onChange={(e) => setFormTag(e.target.value.toUpperCase())}
                  placeholder="SHDW"
                  maxLength={8}
                  minLength={2}
                  className="w-full px-4 py-2.5 bg-studio-950 border border-studio-800 rounded-xl text-white font-mono uppercase text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-1.5" htmlFor="clanspage-field-3">
                  {t('clans.description')}
                </label>
                <textarea id="clanspage-field-3"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t('socialFix.clanDescPlaceholder')}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2.5 bg-studio-950 border border-studio-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Price & Balance Notice */}
              <div className="p-4 rounded-2xl bg-studio-950 border border-studio-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-studio-400 block">{t('socialFix.clanCost')}:</span>
                  <span className="font-extrabold text-brand-400 text-sm flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-brand-400" />
                    {creationCost ?? '…'} {t('common.coins')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-studio-400 block">{t('socialFix.balance')}:</span>
                  <span className="font-bold text-white text-sm">{user?.lightning_coins || 0} ⚡</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 text-sm text-studio-400 hover:text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || creationCost === null || (user?.lightning_coins ?? 0) < creationCost}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-studio-950 font-bold text-sm rounded-xl shadow-glow-brand flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t('clans.createClan')}</span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
