import { createHmac, timingSafeEqual } from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

const MAX_AUTH_AGE_SECONDS = 300; // 5 minutes

export function validateTelegramWebAppData(
  initData: string,
  botToken: string,
): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    // Check auth_date expiry to prevent replay attacks
    const authDate = params.get('auth_date');
    if (!authDate) return null;
    const authTimestamp = parseInt(authDate, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(authTimestamp) || now - authTimestamp > MAX_AUTH_AGE_SECONDS) {
      return null;
    }

    // Сортируем параметры
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Генерируем секретный ключ
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Проверяем подпись (timing-safe comparison)
    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash.length !== hash.length) return null;
    const a = Buffer.from(calculatedHash, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (!timingSafeEqual(a, b)) return null;

    const userStr = params.get('user');
    if (!userStr) return null;

    return JSON.parse(userStr) as TelegramUser;
  } catch {
    return null;
  }
}
