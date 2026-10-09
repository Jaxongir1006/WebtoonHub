import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDailyBonus } from '../../context/DailyBonusContext';
import { useLanguage } from '../../context/LanguageContext';
import { CoinBadge } from './CoinBadge';
import { AvatarFrame } from './AvatarFrame';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  Zap,
  Search,
  BookOpen,
  ShoppingBag,
  Sparkles,
  User as UserIcon,
  LogOut,
  PenTool,
  Menu,
  X,
  Compass,
  ChevronDown,
  Layers,
  Shield,
  Users
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isLoading, profileError, refreshProfile, logout, openAuthModal } = useAuth();
  const { openModal: openDailyBonusModal, isClaimedToday, rewardAmount } = useDailyBonus();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMobileMenuOpen(false); setUserDropdownOpen(false); } };
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', escape); };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.catalog'), path: '/catalog', icon: <Compass className="w-4 h-4" /> },
    { label: t('nav.wheel'), path: '/wheel', icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
    { label: t('nav.library'), path: '/library', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-studio-950/80 backdrop-blur-xl border-b border-studio-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-amber-300 flex items-center justify-center shadow-glow-brand group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-studio-950 fill-studio-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white group-hover:text-brand-400 transition-colors">
                Webtoon<span className="text-brand-500">Hub</span>
              </span>
              <span className="text-[9px] font-semibold text-brand-400/80 tracking-wider uppercase -mt-1">
                Webtoon & Manhwa
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 shrink-0">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 relative ${
                    isActive
                      ? 'text-brand-400 bg-brand-500/10'
                      : 'text-studio-300 hover:text-white hover:bg-studio-800/60'
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Search bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center relative flex-1 min-w-[160px] max-w-xs"
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-studio-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              aria-label={t('ux.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('nav.searchPlaceholder')}
              className="w-full min-h-[44px] pl-9 pr-10 py-2 bg-studio-900 border border-studio-800 rounded-full text-sm text-white placeholder-studio-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
            <button type="submit" aria-label={t('ux.search')} className="absolute right-0 top-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-brand-400"><Search className="w-4 h-4" /></button>
          </form>

          {/* Right Action Items */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Language Switcher */}
            <div className="hidden sm:block"><LanguageSwitcher /></div>

            {/* Daily Bonus Trigger Button (Olingan bo'lsa butkul yashiriladi) */}
            {!isClaimedToday && (
              <button
                onClick={openDailyBonusModal}
                className="hidden 2xl:flex min-h-[44px] items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-500/10 to-amber-500/20 border border-brand-500/30 text-brand-300 hover:border-brand-400 hover:text-white text-xs font-bold transition-all shadow-glow-brand shrink-0"
                title={t('nav.dailyBonus')}
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-spin" style={{ animationDuration: '8s' }} />
                <span className="hidden sm:inline">{t('nav.dailyBonus')}</span>
                <span className="bg-brand-500 text-studio-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {rewardAmount !== null ? `+${rewardAmount} ⚡` : t('nav.dailyBonus')}
                </span>
              </button>
            )}

            {/* Chaqmoq Badge */}
            {isAuthenticated && user && (
              <CoinBadge
                amount={user.lightning_coins}
                size="sm"
                onClick={() => navigate('/shop')}
                className="hidden sm:flex shrink-0"
              />
            )}

            {/* User Profile or Auth Buttons */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-studio-800 transition-colors"
                  aria-label={t('nav.profile')}
                  aria-expanded={userDropdownOpen}
                >
                  <AvatarFrame
                    username={user.username}
                    avatarUrl={user.avatar_url}
                    frameUrl={user.active_frame?.asset_url}
                    size="sm"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-studio-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-studio-900/95 backdrop-blur-xl border border-studio-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2.5 border-b border-studio-800/80 mb-1.5">
                      <div className="font-bold text-white text-sm truncate">{user.username}</div>
                      <div className="text-xs text-studio-400 truncate">{user.email}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-brand-400 font-bold">
                          <Zap className="w-3.5 h-3.5 fill-brand-400" />
                          <span>{user.lightning_coins} {t('common.coins')}</span>
                        </div>
                        {user.clan ? (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            [{user.clan.tag}]
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                            {t('nav.profile')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-studio-200 hover:text-white hover:bg-studio-800/80 rounded-xl transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-studio-400" />
                        <span>{t('nav.profile')}</span>
                      </Link>

                      <Link
                        to={`/users/${user.username}`}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-studio-200 hover:text-white hover:bg-studio-800/80 rounded-xl transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-brand-400" />
                        <span>{t('publicProfile.title') || 'Ommaviy profil'}</span>
                      </Link>

                      <Link
                        to="/inventory"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-studio-200 hover:text-white hover:bg-studio-800/80 rounded-xl transition-colors"
                      >
                        <Layers className="w-4 h-4 text-brand-400" />
                        <span>{t('nav.inventory')}</span>
                      </Link>

                      <Link
                        to="/shop"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-studio-200 hover:text-white hover:bg-studio-800/80 rounded-xl transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4 text-amber-400" />
                        <span>{t('nav.shop')}</span>
                      </Link>
                    </div>

                    <div className="my-1.5 border-t border-studio-800/80" />

                    <div className="space-y-0.5">
                      <Link
                        to="/clans"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-studio-200 hover:text-white hover:bg-studio-800/80 rounded-xl transition-colors"
                      >
                        <Shield className="w-4 h-4 text-purple-400" />
                        <span>{t('nav.clans')}</span>
                      </Link>

                      <Link
                        to="/friends"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-studio-200 hover:text-white hover:bg-studio-800/80 rounded-xl transition-colors"
                      >
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>{t('nav.friends')}</span>
                      </Link>

                      <Link
                        to="/become-creator"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-studio-200 hover:text-white hover:bg-studio-800/80 rounded-xl transition-colors"
                      >
                        <PenTool className="w-4 h-4 text-cyan-400" />
                        <span>{t('nav.creator')}</span>
                      </Link>
                    </div>

                    <div className="my-1.5 border-t border-studio-800/80" />

                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : isLoading || profileError ? (
              <button disabled={isLoading} onClick={() => refreshProfile().catch(() => {})} className="min-h-[44px] px-2 text-sm text-studio-300">{isLoading ? t('readerFix.checking') : t('common.retry')}</button>
            ) : (
              <div className="hidden xl:flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-studio-200 hover:text-white transition-colors"
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-500 text-studio-950 hover:bg-brand-400 active:scale-95 transition-all shadow-glow-brand"
                >
                  {t('nav.register')}
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-studio-400 hover:text-white rounded-lg hover:bg-studio-800"
              aria-label={mobileMenuOpen ? t('common.close') : t('nav.menu')}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden py-4 border-t border-studio-800/80 space-y-3 max-h-[calc(100dvh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 px-3 sm:hidden">
              <LanguageSwitcher align="left" />
              {isAuthenticated && user && <CoinBadge amount={user.lightning_coins} size="sm" onClick={() => navigate('/shop')} />}
            </div>
            {!isClaimedToday && (
              <button onClick={openDailyBonusModal} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-brand-300 hover:bg-studio-800">
                <span>{t('nav.dailyBonus')}</span>{rewardAmount !== null && <span>+{rewardAmount} ⚡</span>}
              </button>
            )}
            {/* Mobile search */}
            <form onSubmit={handleSearchSubmit} className="relative mb-3">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-studio-400" />
              <input
                type="text"
                aria-label={t('ux.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                className="w-full min-h-[44px] pl-9 pr-12 py-2 bg-studio-900 border border-studio-800 rounded-xl text-sm text-white placeholder-studio-400 focus:outline-none focus:border-brand-500"
              />
              <button type="submit" aria-label={t('ux.search')} className="absolute right-0 top-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-brand-400"><Search className="w-4 h-4" /></button>
            </form>

            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-studio-200 hover:text-white hover:bg-studio-800"
                >
                  <div className="flex items-center gap-3">
                    {link.icon}
                    <span>{link.label}</span>
                  </div>
                </Link>
              ))}
            </div>

            {!isAuthenticated && !isLoading && !profileError && (
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-studio-800">
                <button onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }} className="px-3 py-2 rounded-xl bg-studio-800 text-sm font-semibold text-white">{t('nav.login')}</button>
                <button onClick={() => { openAuthModal('register'); setMobileMenuOpen(false); }} className="px-3 py-2 rounded-xl bg-brand-500 text-sm font-bold text-studio-950">{t('nav.register')}</button>
              </div>
            )}

            {isAuthenticated && user && (
              <div className="pt-2 border-t border-studio-800 space-y-1">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-studio-200 hover:text-white hover:bg-studio-800"
                >
                  <UserIcon className="w-4 h-4 text-studio-400" />
                  <span>{t('nav.profile')}</span>
                </Link>
                <Link
                  to="/inventory"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-studio-200 hover:text-white hover:bg-studio-800"
                >
                  <Layers className="w-4 h-4 text-brand-400" />
                  <span>{t('nav.inventory')}</span>
                </Link>
                <Link
                  to="/shop"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-studio-200 hover:text-white hover:bg-studio-800"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>{t('nav.shop')}</span>
                </Link>
                <Link
                  to="/clans"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-studio-200 hover:text-white hover:bg-studio-800"
                >
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>{t('nav.clans')}</span>
                </Link>
                <Link
                  to="/friends"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-studio-200 hover:text-white hover:bg-studio-800"
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>{t('nav.friends')}</span>
                </Link>
                <Link
                  to="/become-creator"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-studio-200 hover:text-white hover:bg-studio-800"
                >
                  <PenTool className="w-4 h-4 text-cyan-400" />
                  <span>{t('nav.creator')}</span>
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
