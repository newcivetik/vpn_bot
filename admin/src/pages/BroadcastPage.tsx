import { useState } from 'react';
import { Header } from '../components/Header.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { adminApi } from '../api/client.ts';
import { Send, CheckCircle, AlertTriangle } from 'lucide-react';
import type { BroadcastResult } from '../api/types.ts';

const MAX_MESSAGE_LENGTH = 4096;

export function BroadcastPage() {
  const [text, setText] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setConfirm(false);
    setSending(true);
    setError(null);
    try {
      const res = await adminApi.broadcast(text.trim(), onlyActive);
      setResult(res);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  const isOverLimit = text.length > MAX_MESSAGE_LENGTH;

  return (
    <>
      <Header title="Рассылка" />
      <div className="p-6 max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Текст сообщения</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={MAX_MESSAGE_LENGTH}
            className={`w-full px-4 py-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${isOverLimit ? 'border-red-400' : 'border-slate-300'}`}
            placeholder="Введите текст для рассылки..."
          />
          <div className={`text-xs mt-1 ${isOverLimit ? 'text-red-500' : 'text-slate-400'}`}>
            {text.length} / {MAX_MESSAGE_LENGTH}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
            className="rounded"
          />
          Только пользователям с активной подпиской
        </label>

        <button
          onClick={() => setConfirm(true)}
          disabled={!text.trim() || sending || isOverLimit}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={16} />
          {sending ? 'Отправка...' : 'Отправить'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 mt-0.5" />
            <div className="text-sm font-medium text-red-800">{error}</div>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle size={20} className="text-green-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-green-800">Рассылка завершена</div>
              <div className="text-green-700 mt-1">
                Отправлено: {result.sent} / {result.total}
                {result.failed > 0 && ` (ошибок: ${result.failed})`}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        title="Подтверждение рассылки"
        message={`Отправить сообщение ${onlyActive ? 'пользователям с активной подпиской' : 'всем пользователям'}?`}
        onConfirm={handleSend}
        onCancel={() => setConfirm(false)}
        confirmLabel="Отправить"
      />
    </>
  );
}
