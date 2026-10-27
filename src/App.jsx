import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import Home from './pages/Home';
import LegalPage from './pages/LegalPage';
import DataRequest from './pages/DataRequest';
import CookieBanner from './components/CookieBanner';
import { LangProvider, useLang } from './i18n/LangContext';
import { SHOW_VIRTUAL_TOUR } from './lib/features';
import useTilt3D from './hooks/useTilt3D';

const Tour = lazy(() => import('./pages/Tour'));

function SiteLayout({ children }) {
  const { t } = useLang();
  return (
    <>
      <a className="skip-link" href="#main">{t("Skip to main content")}</a>
      <Header />
      {children}
      <Footer />
      <WhatsAppButton />
      <CookieBanner />
    </>
  );
}

export default function App() {
  useTilt3D();

  return (
    <LangProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SiteLayout><Home /></SiteLayout>} />
        <Route path="/privacy" element={<SiteLayout><LegalPage page="privacy" /></SiteLayout>} />
        <Route path="/terms" element={<SiteLayout><LegalPage page="terms" /></SiteLayout>} />
        <Route path="/refund" element={<SiteLayout><LegalPage page="refund" /></SiteLayout>} />
        <Route path="/licenses" element={<SiteLayout><LegalPage page="licenses" /></SiteLayout>} />
        <Route path="/data-request" element={<SiteLayout><DataRequest /></SiteLayout>} />
        <Route path="/cookies" element={<SiteLayout><LegalPage page="cookies" /></SiteLayout>} />
        {SHOW_VIRTUAL_TOUR ? (
        <Route path="/tour" element={
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
            <Tour />
          </Suspense>
        } />
        ) : (
          <Route path="/tour" element={<Navigate to="/" replace />} />
        )}
      </Routes>
    </BrowserRouter>
    </LangProvider>
  );
}
