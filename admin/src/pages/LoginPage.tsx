import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { adminApi } from '../api/client.ts';
import { useAuthStore } from '../stores/authStore.ts';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminApi.login(password, needsTwoFactor ? totpCode : undefined);
      if (result.requiresTwoFactor) {
        setNeedsTwoFactor(true);
        setLoading(false);
        return;
      }
      if (result.token) {
        login(result.token);
        navigate('/');
      }
    } catch {
      setError(needsTwoFactor ? 'Неверный код 2FA' : 'Неверный пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield size={28} className="text-blue-600" />
          <span className="text-xl font-bold text-slate-800">VPN Admin</span>
        </div>
        {!needsTwoFactor ? (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            autoFocus
          />
        ) : (
          <div className="mb-4">
            <p className="text-sm text-slate-600 mb-3 text-center">
              Введите код из Google Authenticator
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        )}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading || (!needsTwoFactor && !password) || (needsTwoFactor && totpCode.length !== 6)}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
        {needsTwoFactor && (
          <button
            type="button"
            onClick={() => { setNeedsTwoFactor(false); setTotpCode(''); setError(''); }}
            className="w-full mt-2 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Назад
          </button>
        )}
      </form>
    </div>
  );
}
