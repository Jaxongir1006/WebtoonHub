import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDailyBonus } from '../../context/DailyBonusContext';
import { CoinBadge } from './CoinBadge';
import { AvatarFrame } from './AvatarFrame';
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
  ChevronDown
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const { openModal: openDailyBonusModal, isClaimedToday } = useDailyBonus();
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: 'Bosh sahifa', path: '/' },
    { label: 'Katalog', path: '/catalog', icon: <Compass className="w-4 h-4" /> },
    { label: 'Kutubxona', path: '/library', icon: <BookOpen className="w-4 h-4" /> },
    { label: "Do'kon", path: '/shop', icon: <ShoppingBag className="w-4 h-4" /> },
    { label: 'Mualliflik', path: '/become-creator', icon: <PenTool className="w-4 h-4" /> },
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
                O'zbekcha manhvalar
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'text-brand-400 bg-brand-500/10'
                      : 'text-studio-300 hover:text-white hover:bg-studio-800/60'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Search bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center relative flex-1 max-w-xs"
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-studio-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Manhvalar bo'yicha qidiruv..."
              className="w-full pl-9 pr-3 py-1.5 bg-studio-900 border border-studio-800 rounded-full text-xs text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </form>

          {/* Right Action Items */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Daily Bonus Trigger Button (Olingan bo'lsa butkul yashiriladi) */}
            {!isClaimedToday && (
              <button
                onClick={openDailyBonusModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-500/10 to-amber-500/20 border border-brand-500/30 text-brand-300 hover:border-brand-400 hover:text-white text-xs font-bold transition-all shadow-glow-brand shrink-0"
                title="Kunlik kirish bonusi (+15 ⚡)"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-spin" style={{ animationDuration: '8s' }} />
                <span className="hidden sm:inline">Kunlik bonus</span>
                <span className="bg-brand-500 text-studio-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  +15 ⚡
                </span>
              </button>
            )}

            {/* Chaqmoq Badge */}
            {isAuthenticated && user && (
              <CoinBadge
                amount={user.lightning_coins}
                size="sm"
                onClick={() => navigate('/shop')}
                className="shrink-0"
              />
            )}

            {/* User Profile or Auth Buttons */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-studio-800 transition-colors"
                >
                  <AvatarFrame
                    username={user.username}
                    frameUrl={user.active_frame?.asset_url}
                    size="sm"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-studio-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-studio-900 border border-studio-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-studio-800 mb-1">
                      <div className="font-bold text-white text-sm truncate">{user.username}</div>
                      <div className="text-xs text-studio-400 truncate">{user.email}</div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-brand-400 font-semibold">
                        <Zap className="w-3.5 h-3.5 fill-brand-400" />
                        <span>{user.lightning_coins} Chaqmoq</span>
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-studio-200 hover:text-white hover:bg-studio-800 rounded-xl transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-studio-400" />
                      <span>Mening profilim</span>
                    </Link>

                    <Link
                      to="/library"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-studio-200 hover:text-white hover:bg-studio-800 rounded-xl transition-colors"
                    >
                      <BookOpen className="w-4 h-4 text-studio-400" />
                      <span>Kutubxonam</span>
                    </Link>

                    <Link
                      to="/shop"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-studio-200 hover:text-white hover:bg-studio-800 rounded-xl transition-colors"
                    >
                      <ShoppingBag className="w-4 h-4 text-studio-400" />
                      <span>Do'kon & Ramkalar</span>
                    </Link>

                    <div className="my-1 border-t border-studio-800" />

                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Chiqish</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-studio-200 hover:text-white transition-colors"
                >
                  Kirish
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-500 text-studio-950 hover:bg-brand-400 active:scale-95 transition-all shadow-glow-brand"
                >
                  Ro'yxatdan o'tish
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-studio-400 hover:text-white rounded-lg hover:bg-studio-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-studio-800/80 space-y-3 animate-in slide-in-from-top-2 duration-200">
            {/* Mobile search */}
            <form onSubmit={handleSearchSubmit} className="relative mb-3">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-studio-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Manhvalar qidirish..."
                className="w-full pl-9 pr-3 py-2 bg-studio-900 border border-studio-800 rounded-xl text-xs text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
              />
            </form>

            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-studio-200 hover:text-white hover:bg-studio-800"
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            {isAuthenticated && user && (
              <div className="pt-2 border-t border-studio-800 space-y-1">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-studio-200 hover:text-white hover:bg-studio-800"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profil sozlamalari</span>
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Tizimdan chiqish</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
