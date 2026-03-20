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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(61,44,78,0.5)] backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#FFF8F0] rounded-[32px] p-7 mx-4 max-w-sm w-full shadow-[0_30px_90px_rgba(100,60,120,0.25)] animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-[#3D2C4E]">QR-код подключения</h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="w-11 h-11 rounded-full bg-[#E8D5F5]/30 flex items-center justify-center hover:bg-[#E8D5F5]/50 transition-colors"
          >
            <X size={18} className="text-[#6B5A7A]" />
          </button>
        </div>

        <div className="bg-white rounded-3xl p-5 flex items-center justify-center shadow-inner">
          <QRCodeSVG value={connectionLink} size={240} level="M" />
        </div>

        <p className="text-xs font-semibold text-[#9B8AAB] text-center mt-4">
          Отсканируйте в Happ или другом клиенте
        </p>
      </div>
    </div>
  );
}
