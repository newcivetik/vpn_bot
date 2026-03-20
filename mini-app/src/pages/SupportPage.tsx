import { useState, useEffect, useRef } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { api } from '../api/client';
import { toast } from '../components/Toast';

interface SupportMessage {
  id: number;
  text: string;
  fromAdmin: boolean;
  createdAt: string;
}

interface SupportTicket {
  id: number;
  status: string;
  messages: SupportMessage[];
}

export function SupportPage() {
  const { initData } = useTelegram();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTicket = async () => {
    try {
      const data = await api.getSupportTicket(initData);
      setTicket(data);
      setError(false);
    } catch {
      if (loading) setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
    const interval = setInterval(loadTicket, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    try {
      setSending(true);
      await api.sendSupportMessage(text.trim(), initData);
      setText('');
      await loadTicket();
    } catch {
      toast('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-12 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
        <div className="h-24 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
        <div className="h-16 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center py-12">
        <p className="text-4xl mb-3">😔</p>
        <p className="text-[#3D2C4E] font-bold">Не удалось загрузить</p>
        <button
          onClick={() => { setLoading(true); setError(false); loadTicket(); }}
          className="mt-3 px-6 py-2 rounded-full bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] text-white text-sm font-bold"
        >
          Повторить
        </button>
      </div>
    );
  }

  const messages = ticket?.messages || [];
  const isClosed = ticket?.status === 'closed';

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* Header */}
      <div className="px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-[#E8D5F5]/30">
        <h1 className="text-lg font-bold text-[#3D2C4E]">💬 Поддержка</h1>
        {ticket && (
          <span className={`text-xs font-medium ${isClosed ? 'text-green-600' : 'text-[#7B5EA7]'}`}>
            {isClosed ? 'Обращение закрыто' : 'Обращение открыто'}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && !isClosed && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-[#6B5A7A] font-medium">Напишите нам!</p>
            <p className="text-sm text-[#9B8AAB] mt-1">
              Опишите проблему — мы ответим в ближайшее время
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.fromAdmin ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                msg.fromAdmin
                  ? 'bg-white text-[#3D2C4E] rounded-bl-sm shadow-sm'
                  : 'bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] text-white rounded-br-sm'
              }`}
            >
              {msg.fromAdmin && (
                <p className="text-xs font-bold text-[#7B5EA7] mb-1">Поддержка</p>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <span className={`text-[10px] mt-1 block ${msg.fromAdmin ? 'text-[#9B8AAB]' : 'text-white/70'}`}>
                {new Date(msg.createdAt).toLocaleString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isClosed ? (
        <div className="p-4 bg-white/80 border-t border-[#E8D5F5]/30 text-center">
          <p className="text-sm text-[#6B5A7A]">
            Обращение закрыто. Напишите новое сообщение, чтобы открыть новый тикет.
          </p>
        </div>
      ) : null}
      <div className="p-3 bg-white/80 backdrop-blur-sm border-t border-[#E8D5F5]/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение..."
            className="flex-1 px-4 py-2.5 bg-[#F5F0FA] rounded-full text-sm text-[#3D2C4E] placeholder-[#9B8AAB] focus:outline-none focus:ring-2 focus:ring-[#C9A0F0]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] text-white rounded-full disabled:opacity-50 transition-all active:scale-90"
          >
            {sending ? '...' : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
}
