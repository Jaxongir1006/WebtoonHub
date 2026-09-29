import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { clansApi } from '../api/clans';
import { ClanDetail, ClanSummary } from '../types';
import { AvatarFrame } from '../components/common/AvatarFrame';
import { getApiErrorMessage } from '../api/client';
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
  const { user, isAuthenticated, openAuthModal, updateCoinsLocally } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [clans, setClans] = useState<ClanSummary[]>([]);
  const [myClan, setMyClan] = useState<ClanDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create clan modal
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>('');
  const [formTag, setFormTag] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clansRes, myClanRes] = await Promise.all([
        clansApi.getClans({ q: searchQuery }),
        isAuthenticated ? clansApi.getMyClan() : Promise.resolve({ data: null }),
      ]);
      setClans(clansRes.data || []);
      setMyClan(myClanRes.data || null);
    } catch (err) {
      console.error("Error loading clans:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    clansApi.getClans({ q: searchQuery }).then((res) => {
      setClans(res.data || []);
    });
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
    setFormError(null);

    if (!formName.trim() || !formTag.trim()) {
      setFormError("Klan nomi va tegi to'ldirilishi shart");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await clansApi.createClan({
        name: formName.trim(),
        tag: formTag.trim().toUpperCase(),
        description: formDescription.trim(),
        avatar_url: user?.avatar_url || undefined,
      });

      if (res.data) {
        setCreateModalOpen(false);
        // Refresh local user coins if reduced
        if (user && user.lightning_coins >= 300) {
          updateCoinsLocally(user.lightning_coins - 300);
        }
        navigate(`/clans/${res.data.id}`);
      }
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Klan tashkil qilishda xatolik"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-studio-950 pb-20">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-b from-purple-950/40 via-studio-900 to-studio-950 border-b border-studio-800/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-xs mb-3">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>WebtoonHub Klanlar Tizimi</span>
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
                        Yetakchisiz
                      </span>
                    )}
                  </div>
                  <p className="text-studio-400 text-xs mt-1 max-w-lg line-clamp-1">{myClan.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-studio-300 font-mono">
                    <span className="text-brand-400 font-bold">Daraja {myClan.level}</span>
                    <span>•</span>
                    <span>XP: {myClan.xp} / {myClan.required_xp}</span>
                    <span>•</span>
                    <span>A'zolar: {myClan.member_count} / {myClan.max_members}</span>
                  </div>
                </div>
              </div>

              <Link
                to={`/clans/${myClan.id}`}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center gap-2"
              >
                <span>Klan Markazi & Chat</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-400" />
            <span>Klanlar Reytingi & Ro'yxati</span>
          </h2>

          <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Klan nomi yoki tegi..."
              className="w-full pl-10 pr-4 py-2 bg-studio-900 border border-studio-800 rounded-xl text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
            />
          </form>
        </div>

        {/* Clans Grid */}
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          </div>
        ) : clans.length === 0 ? (
          <div className="bg-studio-900/40 border border-dashed border-studio-800 rounded-3xl p-12 text-center max-w-md mx-auto">
            <Shield className="w-10 h-10 text-studio-600 mx-auto mb-3" />
            <h3 className="text-white font-bold text-base mb-1">Hozircha klanlar topilmadi</h3>
            <p className="text-studio-500 text-xs mb-4">Birinchi bo'lib o'z shaxsiy klaningizni tashkil qiling!</p>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-studio-950 font-bold text-sm rounded-xl"
            >
              Klan tuzish
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
                      {c.description || "Ushbu klan haqida ma'lumot kiritilmagan"}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-6 pt-4 border-t border-studio-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-studio-300 font-mono">
                    <span className="px-2 py-0.5 rounded-lg bg-studio-800 text-brand-400 font-bold">
                      Lvl {c.level}
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
      </div>

      {/* Create Clan Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-studio-900 border border-studio-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 text-studio-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{t('clans.createClan')}</h3>
                <p className="text-xs text-studio-400">O'z ittifoqingizni yarating va yetakchi bo'ling</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-1.5">
                  {t('clans.clanName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Masalan: Shadow Monarchs"
                  maxLength={50}
                  className="w-full px-4 py-2.5 bg-studio-950 border border-studio-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-1.5">
                  {t('clans.clanTag')} (2-6 belgi) *
                </label>
                <input
                  type="text"
                  required
                  value={formTag}
                  onChange={(e) => setFormTag(e.target.value.toUpperCase())}
                  placeholder="SHDW"
                  maxLength={6}
                  className="w-full px-4 py-2.5 bg-studio-950 border border-studio-800 rounded-xl text-white font-mono uppercase text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-studio-300 uppercase tracking-wider mb-1.5">
                  {t('clans.description')}
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Klaningiz maqsadi va qoidalari..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2.5 bg-studio-950 border border-studio-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Price & Balance Notice */}
              <div className="p-4 rounded-2xl bg-studio-950 border border-studio-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-studio-400 block">Klan tashkil qilish narxi:</span>
                  <span className="font-extrabold text-brand-400 text-sm flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-brand-400" />
                    300 Chaqmoq
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-studio-400 block">Sizdagi balans:</span>
                  <span className="font-bold text-white text-sm">{user?.lightning_coins || 0} ⚡</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 text-sm text-studio-400 hover:text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-studio-950 font-bold text-sm rounded-xl shadow-glow-brand flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Klan yaratish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
