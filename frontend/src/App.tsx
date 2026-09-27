import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DailyBonusProvider } from './context/DailyBonusContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { DailyBonusModal } from './components/home/DailyBonusModal';

// Pages
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { WebtoonDetailPage } from './pages/WebtoonDetailPage';
import { ReaderPage } from './pages/ReaderPage';
import { LibraryPage } from './pages/LibraryPage';
import { ShopPage } from './pages/ShopPage';
import { ProfilePage } from './pages/ProfilePage';
import { CreatorApplyPage } from './pages/CreatorApplyPage';
import { NotFoundPage } from './pages/NotFoundPage';

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
  const isReaderPage = location.pathname.startsWith('/chapters/');

  return (
    <div className="flex flex-col min-h-screen bg-studio-950 text-studio-100">
      <ScrollToTop />
      {!isReaderPage && <Navbar />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/webtoons/:idOrSlug" element={<WebtoonDetailPage />} />
          <Route path="/chapters/:id" element={<ReaderPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/become-creator" element={<CreatorApplyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
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
      <AuthProvider>
        <DailyBonusProvider>
          <AppLayout />
        </DailyBonusProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
