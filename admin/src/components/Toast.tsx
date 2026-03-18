import { useEffect, useState } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

let addToast: ((text: string, type?: 'success' | 'error' | 'info') => void) | null = null;

export function toast(text: string, type: 'success' | 'error' | 'info' = 'success') {
  addToast?.(text, type);
}

let nextId = 0;

export function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToast = (text, type = 'success') => {
      const id = nextId++;
      setMessages((prev) => [...prev, { id, text, type }]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, 3000);
    };
    return () => { addToast = null; };
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {messages.map((msg) => {
        const Icon = msg.type === 'success' ? Check : msg.type === 'error' ? X : AlertTriangle;
        const bg = msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700'
          : msg.type === 'error' ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-blue-50 border-blue-200 text-blue-700';
        return (
          <div key={msg.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-sm animate-fade-in ${bg}`}>
            <Icon size={16} />
            <span className="text-sm font-medium">{msg.text}</span>
          </div>
        );
      })}
    </div>
  );
}
