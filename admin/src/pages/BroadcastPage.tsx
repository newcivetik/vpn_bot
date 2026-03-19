import { useState } from 'react';
import { Header } from '../components/Header.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { adminApi } from '../api/client.ts';
import { Send, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import type { BroadcastResult } from '../api/types.ts';

const MAX_MESSAGE_LENGTH = 4096;

export function BroadcastPage() {
  const [text, setText] = useState('');
  const [sendToUsers, setSendToUsers] = useState(true);
  const [onlyActive, setOnlyActive] = useState(false);
  const [postToChannel, setPostToChannel] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const handleSend = async () => {
    setConfirm(false);
    setSending(true);
    setError(null);
    try {
      let res: BroadcastResult;
      if (sendToUsers) {
        res = await adminApi.broadcast(text.trim(), onlyActive, postToChannel);
      } else {
        // Only channel
        const { success } = await adminApi.postToChannel(text.trim());
        res = { sent: 0, failed: success ? 0 : 1, total: 0 };
      }
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

        {/* Quick templates */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Обновление', text: '🔄 Обновление сервиса\n\nМы обновили серверы для повышения скорости и стабильности.\n\nНикаких действий с вашей стороны не требуется.' },
            { label: 'Акция', text: '🎁 Специальное предложение!\n\nТолько сейчас — скидка 20% на все тарифы!\n\nИспользуй промокод SALE20 при оплате.' },
            { label: 'Тех. работы', text: '⚙️ Плановые технические работы\n\nСегодня с 03:00 до 05:00 (МСК) возможны кратковременные перебои в работе VPN.\n\nПриносим извинения за неудобства.' },
          ].map((t) => (
            <button
              key={t.label}
              onClick={() => setText(t.text)}
              className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={sendToUsers}
              onChange={(e) => setSendToUsers(e.target.checked)}
              className="rounded"
            />
            Отправить пользователям
          </label>
          {sendToUsers && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="rounded"
              />
              Только с активной подпиской
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={postToChannel}
              onChange={(e) => setPostToChannel(e.target.checked)}
              className="rounded"
            />
            Опубликовать в канал @sellwhy
          </label>
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            {preview ? <EyeOff size={14} /> : <Eye size={14} />}
            {preview ? 'Скрыть' : 'Превью'}
          </button>
        </div>

        {/* Preview */}
        {preview && text.trim() && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-400 mb-2">Предпросмотр в Telegram:</div>
            <div className="bg-white rounded-lg p-3 shadow-sm text-sm whitespace-pre-wrap text-slate-800 max-w-sm">
              {text}
            </div>
          </div>
        )}

        <button
          onClick={() => setConfirm(true)}
          disabled={!text.trim() || sending || isOverLimit || (!sendToUsers && !postToChannel)}
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
              <div className="font-medium text-green-800">
                {result.total > 0 ? 'Рассылка завершена' : 'Опубликовано в канал'}
              </div>
              <div className="text-green-700 mt-1">
                {result.total > 0 && <>Отправлено: {result.sent} / {result.total}</>}
                {result.total > 0 && result.failed > 0 && ` (ошибок: ${result.failed})`}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        title="Подтверждение рассылки"
        message={`${sendToUsers ? `Отправить сообщение ${onlyActive ? 'пользователям с активной подпиской' : 'всем пользователям'}` : ''}${sendToUsers && postToChannel ? '\n+ ' : ''}${postToChannel ? 'Опубликовать в канал @sellwhy' : ''}`}
        onConfirm={handleSend}
        onCancel={() => setConfirm(false)}
        confirmLabel="Отправить"
      />
    </>
  );
}
