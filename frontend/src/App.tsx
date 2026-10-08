import React, { Suspense, useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { usePageMetadata } from './hooks/usePageMetadata';
import { DailyBonusProvider } from './context/DailyBonusContext';
import { useLanguage } from './context/LanguageContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { DailyBonusModal } from './components/home/DailyBonusModal';

// Pages
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

const CatalogPage = React.lazy(() => import('./pages/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const WebtoonDetailPage = React.lazy(() => import('./pages/WebtoonDetailPage').then((m) => ({ default: m.WebtoonDetailPage })));
const ReaderPage = React.lazy(() => import('./pages/ReaderPage').then((m) => ({ default: m.ReaderPage })));
const LibraryPage = React.lazy(() => import('./pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const ShopPage = React.lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const LuckyWheelPage = React.lazy(() => import('./pages/LuckyWheelPage').then((m) => ({ default: m.LuckyWheelPage })));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const InventoryPage = React.lazy(() => import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const CreatorApplyPage = React.lazy(() => import('./pages/CreatorApplyPage').then((m) => ({ default: m.CreatorApplyPage })));
const ClansPage = React.lazy(() => import('./pages/ClansPage').then((m) => ({ default: m.ClansPage })));
const ClanDetailPage = React.lazy(() => import('./pages/ClanDetailPage').then((m) => ({ default: m.ClanDetailPage })));
const FriendsPage = React.lazy(() => import('./pages/FriendsPage').then((m) => ({ default: m.FriendsPage })));
const PublicProfilePage = React.lazy(() => import('./pages/PublicProfilePage').then((m) => ({ default: m.PublicProfilePage })));

// Scroll to top on route change
const scrollPositions = new Map<string, number>();
const ScrollToTop: React.FC = () => {
  const location = useLocation();
  const navigation = useNavigationType();
  useLayoutEffect(() => {
    const original = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => { history.scrollRestoration = original; };
  }, []);
  useLayoutEffect(() => {
    let frame = 0; let attempts = 0; let restoring = true;
    let previousHeight = 0; let stableFrames = 0;
    const target = navigation === 'POP' && !location.pathname.startsWith('/chapters/') ? scrollPositions.get(location.key) || 0 : 0;
    const restore = () => {
      const height = document.documentElement.scrollHeight;
      stableFrames = height === previousHeight ? stableFrames + 1 : 0;
      previousHeight = height;
      window.scrollTo(0, target);
      const loading = Boolean(document.querySelector('#main-content [aria-busy="true"], #main-content [role="status"]'));
      if (target > 0 && attempts++ < 120 && (loading || stableFrames < 8 || target > height - window.innerHeight)) frame = requestAnimationFrame(restore);
      else restoring = false;
    };
    const cancel = () => { restoring = false; cancelAnimationFrame(frame); };
    const remember = () => { if (!restoring) scrollPositions.set(location.key, window.scrollY); };
    restore();
    window.addEventListener('scroll', remember, { passive: true });
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', remember); window.removeEventListener('wheel', cancel); window.removeEventListener('touchstart', cancel);
      if (scrollPositions.size > 100) scrollPositions.delete(scrollPositions.keys().next().value!);
    };
  }, [location.key, navigation]);
  return null;
};

// Layout wrapper to conditionally show main Navbar and Footer
const AppLayout: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { profileError, refreshProfile } = useAuth();
  const isReaderPage = location.pathname.startsWith('/chapters/');
  const dynamicRoute = isReaderPage || location.pathname.startsWith('/webtoons/');
  const routeLabels: Record<string, string> = { '/': 'nav.home', '/catalog': 'nav.catalog', '/library': 'nav.library', '/shop': 'nav.shop', '/wheel': 'nav.wheel', '/inventory': 'nav.inventory', '/profile': 'nav.profile', '/friends': 'nav.friends', '/clans': 'nav.clans', '/become-creator': 'creator.title', '/reset-password': 'readerFix.forgotTitle' };
  const routeLabel = routeLabels[location.pathname] || (location.pathname.startsWith('/clans/') ? 'nav.clans' : location.pathname.startsWith('/users/') ? 'nav.profile' : 'common.notFound');
  usePageMetadata(dynamicRoute ? undefined : t(routeLabel));

  return (
    <div className="flex flex-col min-h-screen bg-studio-950 text-studio-100">
      <ScrollToTop />
      <a href="#main-content" className="fixed -top-20 focus:top-2 left-4 z-[100] bg-brand-500 text-studio-950 px-4 py-3 rounded-xl font-bold">{t('readerFix.skip')}</a>
      {!isReaderPage && <Navbar />}

      <main id="main-content" tabIndex={-1} className="flex-1">
        {profileError && <div role="alert" className="p-4 text-center bg-rose-500/10 text-rose-200"><span>{profileError}</span> <button className="min-h-[44px] px-4 font-bold underline" onClick={() => refreshProfile().catch(() => {})}>{t('common.retry')}</button></div>}
        <ErrorBoundary key={location.pathname} message={t('ux.errorBoundary')} retryLabel={t('common.retry')}>
        <Suspense fallback={<div role="status" className="py-24 text-center text-studio-400">{t('common.loading')}</div>}><Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/webtoons/:idOrSlug" element={<WebtoonDetailPage />} />
          <Route path="/chapters/:id" element={<ReaderPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/wheel" element={<LuckyWheelPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/clans" element={<ClansPage />} />
          <Route path="/clans/:id" element={<ClanDetailPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/users/:identifier" element={<PublicProfilePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/become-creator" element={<CreatorApplyPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes></Suspense>
        </ErrorBoundary>
      </main>

      {!isReaderPage && <Footer />}

      {/* Global Modals */}
      <AuthModal />
      <DailyBonusModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <DailyBonusProvider>
            <AppLayout />
          </DailyBonusProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
};

export default App;
