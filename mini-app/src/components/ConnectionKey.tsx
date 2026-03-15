import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTelegram } from '../hooks/useTelegram';

interface Props {
  connectionLink: string;
}

export function ConnectionKey({ connectionLink }: Props) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { haptic } = useTelegram();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(connectionLink);
      setCopied(true);
      haptic?.notificationOccurred('success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement('textarea');
      input.value = connectionLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-tg-secondary rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-tg-text">Ключ подключения</h3>
        <button
          onClick={() => setShowQR(!showQR)}
          className="text-tg-link text-sm"
        >
          {showQR ? 'Скрыть QR' : 'QR-код'}
        </button>
      </div>

      {showQR && (
        <div className="flex justify-center mb-3 p-4 bg-white rounded-xl">
          <QRCodeSVG value={connectionLink} size={200} />
        </div>
      )}

      <div className="bg-tg-bg rounded-xl p-3 mb-3 break-all text-xs text-tg-hint font-mono leading-relaxed max-h-20 overflow-y-auto">
        {connectionLink}
      </div>

      <button
        onClick={handleCopy}
        className="w-full py-3 rounded-xl font-semibold text-tg-button-text bg-tg-button active:opacity-80 transition-opacity"
      >
        {copied ? '✓ Скопировано' : 'Скопировать ключ'}
      </button>
    </div>
  );
}
