import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';

const PlansPage = lazy(() => import('./pages/PlansPage').then((m) => ({ default: m.PlansPage })));
const PaymentPage = lazy(() => import('./pages/PaymentPage').then((m) => ({ default: m.PaymentPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const ServerPage = lazy(() => import('./pages/ServerPage').then((m) => ({ default: m.ServerPage })));
const SupportPage = lazy(() => import('./pages/SupportPage').then((m) => ({ default: m.SupportPage })));

function PageLoader() {
  return (
    <div className="p-4 space-y-4">
      <div className="h-32 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
      <div className="h-16 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
    </div>
  );
}

function App() {
  const { tg, ready, expand } = useTelegram();

  useEffect(() => {
    ready();
    expand();
    tg?.setHeaderColor('#FFF8F0');
    tg?.setBackgroundColor('#FFF8F0');
  }, [ready, expand, tg]);

  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/plans/:planId/pay" element={<PaymentPage />} />
            <Route path="/servers" element={<ServerPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
