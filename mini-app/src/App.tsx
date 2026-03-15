import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import { HomePage } from './pages/HomePage';
import { PaymentPage } from './pages/PaymentPage';
import { HelpPage } from './pages/HelpPage';

function App() {
  const { ready, expand } = useTelegram();

  useEffect(() => {
    ready();
    expand();
  }, [ready, expand]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/payment/:planId" element={<PaymentPage />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
