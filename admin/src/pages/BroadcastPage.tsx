import { useState } from 'react';
import { Header } from '../components/Header.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { adminApi } from '../api/client.ts';
import { Send, CheckCircle } from 'lucide-react';
import type { BroadcastResult } from '../api/types.ts';

export function BroadcastPage() {
  const [text, setText] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const handleSend = async () => {
    setConfirm(false);
    setSending(true);
    try {
      const res = await adminApi.broadcast(text, onlyActive);
      setResult(res);
      setText('');
    } finally {
      setSending(false);
    }
  };

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
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Введите текст для рассылки..."
          />
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
          disabled={!text.trim() || sending}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={16} />
          {sending ? 'Отправка...' : 'Отправить'}
        </button>

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
