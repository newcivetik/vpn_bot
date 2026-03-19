import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../api/client.ts';
import type { SupportTicket } from '../api/types.ts';

const REPLY_TEMPLATES = [
  { label: '🔄 Перезапустить', text: 'Попробуйте закрыть и заново открыть приложение Hiddify. Если не помогло — удалите профиль VPN и добавьте ключ заново через /key.' },
  { label: '🌍 Сменить сервер', text: 'Попробуйте сменить сервер — отправьте команду /server в бот и выберите другую локацию. Иногда определённые серверы работают лучше в зависимости от вашего провайдера.' },
  { label: '🔑 Новый ключ', text: 'Отправьте команду /key в бот, чтобы получить актуальный ключ подключения. Скопируйте его и вставьте в Hiddify заново.' },
  { label: '📱 Инструкция', text: 'Отправьте команду /help в бот — там есть пошаговая инструкция по настройке для вашего устройства (iPhone, Android, Windows, Mac).' },
  { label: '⏳ Ожидание', text: 'Спасибо за обращение! Мы проверяем вашу проблему и ответим в ближайшее время.' },
  { label: '✅ Решено', text: 'Проблема должна быть решена. Проверьте подключение и напишите, если что-то ещё не работает!' },
];

const statusLabels: Record<string, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  closed: 'Закрыт',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-green-100 text-green-700',
};

export function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getTickets(page, 20, statusFilter || undefined);
      setTickets(res.data);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTicket = async (id: number) => {
    try {
      const ticket = await adminApi.getTicket(id);
      setSelectedTicket(ticket);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [page, statusFilter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages]);

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    try {
      setSending(true);
      await adminApi.replyTicket(selectedTicket.id, replyText.trim());
      setReplyText('');
      await loadTicket(selectedTicket.id);
      await loadTickets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    try {
      await adminApi.closeTicket(selectedTicket.id);
      await loadTicket(selectedTicket.id);
      await loadTickets();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex h-screen">
      {/* Ticket List */}
      <div className="w-96 border-r border-slate-200 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold mb-3">💬 Поддержка</h2>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">Все тикеты</option>
            <option value="open">Открытые</option>
            <option value="in_progress">В работе</option>
            <option value="closed">Закрытые</option>
          </select>
        </div>

        {error && (
          <div className="p-3 m-3 bg-red-50 text-red-600 rounded text-sm">{error}</div>
        )}

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-slate-400">Загрузка...</div>
          ) : tickets.length === 0 ? (
            <div className="p-4 text-center text-slate-400">Нет тикетов</div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => loadTicket(ticket.id)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                  selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">
                    #{ticket.id} · {ticket.user?.firstName || ticket.user?.username || `User #${ticket.userId}`}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[ticket.status]}`}>
                    {statusLabels[ticket.status]}
                  </span>
                </div>
                <p className="text-sm text-slate-500 truncate">
                  {ticket.messages?.[ticket.messages.length - 1]?.text || ticket.subject}
                </p>
                <span className="text-xs text-slate-400">
                  {new Date(ticket.updatedAt).toLocaleString('ru-RU')}
                </span>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 flex items-center justify-between text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
            >
              «
            </button>
            <span className="text-slate-500">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
            >
              »
            </button>
          </div>
        )}
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {!selectedTicket ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Выбери тикет из списка
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold">
                  #{selectedTicket.id} · {selectedTicket.user?.firstName || selectedTicket.user?.username || `User #${selectedTicket.userId}`}
                </h3>
                <span className="text-sm text-slate-500">
                  TG: {selectedTicket.user?.telegramId} · {selectedTicket.subject}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[selectedTicket.status]}`}>
                  {statusLabels[selectedTicket.status]}
                </span>
                {selectedTicket.status !== 'closed' && (
                  <button
                    onClick={handleClose}
                    className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Закрыть тикет
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {selectedTicket.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.fromAdmin ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md px-4 py-2.5 rounded-2xl ${
                      msg.fromAdmin
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-white text-slate-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <span className={`text-xs mt-1 block ${msg.fromAdmin ? 'text-blue-100' : 'text-slate-400'}`}>
                      {new Date(msg.createdAt).toLocaleString('ru-RU')}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            {selectedTicket.status !== 'closed' && (
              <div className="p-4 bg-white border-t border-slate-200">
                {/* Quick reply templates */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {REPLY_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      onClick={() => setReplyText(tpl.text)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                      title={tpl.text}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Напишите ответ..."
                    rows={2}
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                  />
                  <button
                    onClick={handleReply}
                    disabled={sending || !replyText.trim()}
                    className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    {sending ? '...' : 'Отправить'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
