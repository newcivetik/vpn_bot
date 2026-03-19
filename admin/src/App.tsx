import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore.ts';
import { Layout } from './components/Layout.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { UsersPage } from './pages/UsersPage.tsx';
import { UserDetailPage } from './pages/UserDetailPage.tsx';
import { SubscriptionsPage } from './pages/SubscriptionsPage.tsx';
import { PlansPage } from './pages/PlansPage.tsx';
import { ServersPage } from './pages/ServersPage.tsx';
import { PaymentsPage } from './pages/PaymentsPage.tsx';
import { PromosPage } from './pages/PromosPage.tsx';
import { BroadcastPage } from './pages/BroadcastPage.tsx';
import { SupportPage } from './pages/SupportPage.tsx';
import { PersonalDiscountsPage } from './pages/PersonalDiscountsPage.tsx';
import { AdminLogsPage } from './pages/AdminLogsPage.tsx';
import type { ReactNode } from 'react';

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch {
    return true;
  }
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  if (!token || isTokenExpired(token)) {
    if (token) logout();
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
        <Route path="/users/:id" element={<PrivateRoute><UserDetailPage /></PrivateRoute>} />
        <Route path="/subscriptions" element={<PrivateRoute><SubscriptionsPage /></PrivateRoute>} />
        <Route path="/plans" element={<PrivateRoute><PlansPage /></PrivateRoute>} />
        <Route path="/servers" element={<PrivateRoute><ServersPage /></PrivateRoute>} />
        <Route path="/payments" element={<PrivateRoute><PaymentsPage /></PrivateRoute>} />
        <Route path="/promos" element={<PrivateRoute><PromosPage /></PrivateRoute>} />
        <Route path="/personal-discounts" element={<PrivateRoute><PersonalDiscountsPage /></PrivateRoute>} />
        <Route path="/support" element={<PrivateRoute><SupportPage /></PrivateRoute>} />
        <Route path="/broadcast" element={<PrivateRoute><BroadcastPage /></PrivateRoute>} />
        <Route path="/logs" element={<PrivateRoute><AdminLogsPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
