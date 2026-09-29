import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
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
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Layout wrapper to conditionally show main Navbar and Footer
const AppLayout: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const isReaderPage = location.pathname.startsWith('/chapters/');

  return (
    <div className="flex flex-col min-h-screen bg-studio-950 text-studio-100">
      <ScrollToTop />
      {!isReaderPage && <Navbar />}

      <main className="flex-1">
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
          <Route path="*" element={<NotFoundPage />} />
        </Routes></Suspense>
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
