import { useState, useEffect } from 'react';
import { adminApi } from '../api/client.ts';

export function SecurityPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadStatus = async () => {
    try {
      const { enabled } = await adminApi.get2FAStatus();
      setEnabled(enabled);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSetup = async () => {
    try {
      setError('');
      const data = await adminApi.setup2FA();
      setSetupData(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleEnable = async () => {
    try {
      setError('');
      await adminApi.enable2FA(code);
      setEnabled(true);
      setSetupData(null);
      setCode('');
      setSuccess('2FA включена!');
    } catch (e: any) {
      setError('Неверный код. Попробуйте ещё раз.');
    }
  };

  const handleDisable = async () => {
    try {
      setError('');
      await adminApi.disable2FA(disableCode);
      setEnabled(false);
      setDisableCode('');
      setSuccess('2FA отключена');
    } catch (e: any) {
      setError('Неверный код');
    }
  };

  if (loading) return <div className="p-6">Загрузка...</div>;

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">🔐 Безопасность</h1>

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{success}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-2">Двухфакторная аутентификация (2FA)</h2>
        <p className="text-sm text-slate-500 mb-4">
          Используйте Google Authenticator или другое TOTP-приложение для дополнительной защиты.
        </p>

        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
          enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {enabled ? '✅ Включена' : '❌ Отключена'}
        </div>

        {!enabled && !setupData && (
          <div>
            <button
              onClick={handleSetup}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Настроить 2FA
            </button>
          </div>
        )}

        {setupData && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">1. Отсканируйте QR-код в Google Authenticator:</p>
              <img src={setupData.qrDataUrl} alt="QR Code" className="w-48 h-48 border rounded-lg" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Или введите ключ вручную:</p>
              <code className="block bg-slate-100 p-2 rounded text-xs font-mono break-all">
                {setupData.secret}
              </code>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">2. Введите код из приложения:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleEnable}
                  disabled={code.length !== 6}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Подтвердить
                </button>
              </div>
            </div>
            <button
              onClick={() => { setSetupData(null); setCode(''); }}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Отмена
            </button>
          </div>
        )}

        {enabled && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm font-medium mb-2">Отключить 2FA:</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Код из приложения"
                className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={handleDisable}
                disabled={disableCode.length !== 6}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Отключить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
