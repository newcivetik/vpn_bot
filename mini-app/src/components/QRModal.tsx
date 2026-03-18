import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';

interface Props {
  connectionLink: string;
  onClose: () => void;
}

export function QRModal({ connectionLink, onClose }: Props) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QR-код подключения"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-tg-bg rounded-3xl p-6 mx-4 max-w-sm w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-tg-text">QR-код подключения</h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="w-11 h-11 rounded-full bg-tg-secondary flex items-center justify-center hover:bg-tg-hint/20 transition-colors"
          >
            <X size={18} className="text-tg-hint" />
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 flex items-center justify-center">
          <QRCodeSVG value={connectionLink} size={240} level="M" />
        </div>

        <p className="text-xs text-tg-hint text-center mt-3">
          Отсканируйте в Hiddify или другом клиенте
        </p>
      </div>
    </div>
  );
}
