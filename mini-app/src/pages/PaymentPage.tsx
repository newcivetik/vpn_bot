import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { PlanDTO } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores/userStore';
import { Star, CreditCard, ArrowLeft, Tag, Check, X, CheckCircle } from 'lucide-react';
import { toast } from '../components/Toast';

declare global {
  interface Window {
    YooMoneyCheckoutWidget?: new (config: {
      confirmation_token: string;
      return_url?: string;
      error_callback: (error: { error: string }) => void;
    }) => {
      render: (containerId: string) => Promise<void>;
      destroy: () => void;
    };
  }
}

export function PaymentPage() {
  const { planId } = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<PlanDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWidget, setShowWidget] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const navigate = useNavigate();
  const { tg, haptic, backButton, initData } = useTelegram();
  const { subscription } = useUserStore();
  const widgetRef = useRef<{ destroy: () => void } | null>(null);

  // Personal discount
  const [personalDiscount, setPersonalDiscount] = useState<{
    id: number;
    discountPercent: number;
    bonusDays: number;
    reason?: string;
    expiresAt?: string;
  } | null>(null);

  // Promo state
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    discountPercent?: number;
    bonusDays?: number;
    error?: string;
  } | null>(null);
  const [validating, setValidating] = useState(false);

  const showWidgetRef = useRef(showWidget);
  showWidgetRef.current = showWidget;

  useEffect(() => {
    backButton?.show();
    const goBack = () => {
      if (showWidgetRef.current) {
        widgetRef.current?.destroy();
        widgetRef.current = null;
        setShowWidget(false);
      } else {
        navigate('/plans');
      }
    };
    backButton?.onClick(goBack);

    api.getPlans().then((plans) => {
      const found = plans.find((p) => p.id === Number(planId));
      setPlan(found || null);
      setLoading(false);
    }).catch((e) => {
      console.error('Failed to load plans:', e);
      setLoading(false);
    });

    if (initData) {
      api.getPersonalDiscount(initData)
        .then((d) => setPersonalDiscount(d))
        .catch(() => {});
    }

    return () => {
      backButton?.offClick(goBack);
      backButton?.hide();
      widgetRef.current?.destroy();
    };
  }, [planId, navigate, backButton]);

  // Auto-suggest RENEW15 for returning users
  useEffect(() => {
    if (subscription && initData) {
      setShowPromo(true);
      setPromoCode('RENEW15');
      api.validatePromo('RENEW15', initData)
        .then((result) => { if (result.valid) setPromoResult(result); })
        .catch(() => {});
    }
  }, [subscription, initData]);

  const handleValidatePromo = async () => {
    if (!promoCode.trim() || validating) return;
    setValidating(true);
    try {
      const result = await api.validatePromo(promoCode.trim(), initData);
      setPromoResult(result);
      if (result.valid) haptic?.notificationOccurred('success');
    } catch {
      setPromoResult({ valid: false, error: 'Ошибка проверки' });
    } finally {
      setValidating(false);
    }
  };

  const handleStars = async () => {
    if (paying || !plan) return;
    haptic?.impactOccurred('medium');
    setPaying(true);

    try {
      const validPromo = promoResult?.valid ? promoCode.trim() : undefined;
      const { invoiceLink } = await api.createInvoice(plan.id, initData, validPromo);
      tg?.openInvoice(invoiceLink, (status) => {
        if (status === 'paid') {
          haptic?.notificationOccurred('success');
          setPaymentSuccess(true);
          setTimeout(() => navigate('/'), 2500);
        }
        setPaying(false);
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      toast(`Ошибка: ${msg.slice(0, 100)}`, 'error');
      setPaying(false);
    }
  };

  const loadYokassaWidget = (): Promise<boolean> => {
    if (window.YooMoneyCheckoutWidget) return Promise.resolve(true);
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js';
      script.onload = () => resolve(!!window.YooMoneyCheckoutWidget);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const handleYokassa = async () => {
    if (paying || !plan) return;
    haptic?.impactOccurred('medium');
    setPaying(true);

    try {
      const widgetAvailable = await loadYokassaWidget();
      const validPromo = promoResult?.valid ? promoCode.trim() : undefined;

      if (!widgetAvailable) {
        // Fallback: redirect-based payment for mobile WebView
        const { confirmationUrl } = await api.createYokassaPayment(plan.id, initData, validPromo, false);
        if (confirmationUrl) {
          tg?.openLink(confirmationUrl, { try_instant_view: false });
        } else {
          toast('Ошибка: не удалось создать платёж', 'error');
        }
        return;
      }

      const { confirmationToken } = await api.createYokassaPayment(plan.id, initData, validPromo, true);
      setShowWidget(true);
      await new Promise((r) => setTimeout(r, 100));

      const checkout = new window.YooMoneyCheckoutWidget!({
        confirmation_token: confirmationToken!,
        return_url: `${window.location.origin}/`,
        error_callback: (error) => {
          console.error('YooKassa widget error:', error);
          setShowWidget(false);
          setPaying(false);
          toast('Ошибка оплаты. Попробуйте позже', 'error');
        },
      });

      widgetRef.current = checkout;
      await checkout.render('yokassa-widget');
    } catch (err: any) {
      console.error('YooKassa payment error:', err);
      setShowWidget(false);
      const msg = err?.message || String(err);
      toast(`Ошибка: ${msg.slice(0, 100)}`, 'error');
    } finally {
      setPaying(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[70vh] animate-fade-in text-center">
        {/* Animated success circle */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-[#C1F0DB] flex items-center justify-center animate-bounce-in">
            <CheckCircle size={48} className="text-[#2D8B5E]" />
          </div>
          {/* Decorative ping ring */}
          <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-[#C1F0DB]/30 animate-ping" />
        </div>

        <h2 className="text-2xl font-black text-[#3D2C4E] mb-2">Оплата прошла!</h2>
        <p className="text-sm font-semibold text-[#6B5A7A] mb-1">VPN подключение активировано</p>
        <p className="text-xs text-[#6B5A7A] mb-6">Перенаправление на главную...</p>

        {/* Progress bar */}
        <div className="w-32 h-1 bg-[#E8D5F5]/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C1F0DB] rounded-full transition-all duration-[2500ms] ease-linear"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  }

  if (loading || !plan) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-32 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
        <div className="h-16 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
        <div className="h-16 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (showWidget) {
    return (
      <div className="p-4 pb-8 space-y-4">
        <div className="bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] rounded-3xl p-6 text-white text-center">
          <CreditCard size={28} className="mx-auto mb-2" />
          <h2 className="text-lg font-bold">Оплата картой</h2>
          <div className="text-sm text-white/80">{plan.name} — {plan.price} ₽</div>
        </div>
        <div id="yokassa-widget" />
      </div>
    );
  }

  const trafficLabel =
    plan.trafficLimitGB > 0 ? `${plan.trafficLimitGB} ГБ` : 'Безлимит';

  // Personal discount takes priority over promo
  const pdDiscount = personalDiscount?.discountPercent || 0;
  const promoDiscount = promoResult?.valid ? promoResult.discountPercent || 0 : 0;
  const discount = pdDiscount > 0 ? pdDiscount : promoDiscount;
  const discountedPrice = discount > 0 ? Math.round(plan.price * (1 - discount / 100)) : plan.price;

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      {/* Plan summary */}
      <div className="bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] rounded-3xl p-6 text-white text-center shadow-[0_6px_24px_rgba(160,130,210,0.3)] animate-bounce-in">
        <h2 className="text-xl font-black mb-1">{plan.name}</h2>
        <div className="text-sm text-white/80 mb-3">
          {trafficLabel} · {plan.maxDevices} устр. · {plan.durationDays} дней
          {promoResult?.valid && promoResult.bonusDays ? ` + ${promoResult.bonusDays} бонус` : ''}
        </div>
        <div className="text-3xl font-black">
          {discount > 0 && (
            <span className="text-lg line-through text-white/50 mr-2">{plan.price} ₽</span>
          )}
          {discountedPrice} ₽
        </div>
        {discount > 0 && (
          <div className="text-sm text-white/80 mt-1">Скидка {discount}%</div>
        )}
      </div>

      {/* Personal discount badge */}
      {personalDiscount && personalDiscount.discountPercent > 0 && (
        <div className="bg-gradient-to-r from-[#C1F0DB] to-[#A8E6CF] rounded-3xl p-4 animate-bounce-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎁</span>
            <span className="font-bold text-[#2D8B5E] text-sm">Персональная скидка {personalDiscount.discountPercent}%</span>
          </div>
          {personalDiscount.reason && (
            <div className="text-xs text-[#2D8B5E]/80">{personalDiscount.reason}</div>
          )}
          {personalDiscount.expiresAt && (
            <div className="text-xs text-[#2D8B5E]/60 mt-1">
              До {new Date(personalDiscount.expiresAt).toLocaleDateString('ru-RU')}
            </div>
          )}
        </div>
      )}

      {/* Promo code */}
      <div className="space-y-2 animate-bounce-in" style={{ animationDelay: '60ms' }}>
        {!showPromo ? (
          <button
            onClick={() => setShowPromo(true)}
            className="flex items-center gap-2 text-sm text-[#6B5A7A] px-3 py-2.5 -mx-2"
          >
            <Tag size={14} />
            Есть промокод?
          </button>
        ) : (
          <div className="bg-white rounded-3xl p-4 shadow-[0_4px_20px_rgba(100,60,120,0.08)]">
            <div className="text-xs font-medium text-[#9B8AAB] mb-1.5">Промокод</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoResult(null);
                }}
                placeholder="Введи промокод"
                className="flex-1 bg-[#FFF8F0] rounded-[18px] border-2 border-[#E8D5F5]/50 p-4 text-[#3D2C4E] font-semibold text-sm outline-none placeholder:text-[#9B8AAB] focus:border-[#E8D5F5] focus:shadow-[0_0_0_4px_rgba(232,213,245,0.25)] transition-all"
                maxLength={32}
                autoFocus
              />
              <button
                onClick={handleValidatePromo}
                disabled={validating || !promoCode.trim()}
                className="bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] text-white rounded-2xl px-4 py-2 text-xs font-semibold disabled:opacity-50 transition-all"
              >
                {validating ? '...' : 'Применить'}
              </button>
            </div>
            {promoResult && (
              <div className={`flex items-center gap-1.5 mt-2 text-xs ${promoResult.valid ? 'text-[#2D8B5E]' : 'text-[#FF6B6B]'}`}>
                {promoResult.valid ? <Check size={12} /> : <X size={12} />}
                {promoResult.valid
                  ? `Промокод активен!${promoResult.discountPercent ? ` −${promoResult.discountPercent}%` : ''}${promoResult.bonusDays ? ` +${promoResult.bonusDays} дн.` : ''}`
                  : promoResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment methods */}
      <div className="space-y-3 animate-bounce-in" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center gap-2 px-1 mb-1">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-[#C9A0F0]" />
            <div className="w-2 h-2 rounded-full bg-[#C9A0F0]" />
            <div className="w-2 h-2 rounded-full bg-[#E8D5F5]/40" />
          </div>
          <span className="text-xs text-[#9B8AAB]">Шаг 2 из 3</span>
        </div>
        <h3 className="text-sm font-semibold text-[#9B8AAB] px-1">
          Способ оплаты
        </h3>

        <div className="bg-white rounded-3xl p-4 shadow-[0_8px_32px_rgba(100,60,120,0.10)] space-y-3">
          <button
            onClick={handleStars}
            disabled={paying}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl active:scale-[0.98] transition-all text-left hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(100,60,120,0.15)] ${paying ? 'opacity-50' : ''}`}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FFD4B8] to-[#FFAA80] flex items-center justify-center">
              <Star size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[#3D2C4E]">Telegram Stars</div>
              <div className="text-sm text-[#6B5A7A]">{plan.priceStars} Stars</div>
            </div>
            <span className="text-[#9B8AAB]">›</span>
          </button>

          <button
            onClick={handleYokassa}
            disabled={paying}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl active:scale-[0.98] transition-all text-left hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(100,60,120,0.15)] ${paying ? 'opacity-50' : ''}`}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] flex items-center justify-center">
              <CreditCard size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[#3D2C4E]">Банковская карта</div>
              <div className="text-sm text-[#6B5A7A]">{discountedPrice} ₽ · СБП</div>
            </div>
            <span className="text-[#9B8AAB]">›</span>
          </button>
        </div>
      </div>

      {/* Back */}
      <button
        onClick={() => navigate('/plans')}
        className="w-full flex items-center justify-center gap-2 py-3 text-[#6B5A7A] text-sm font-semibold"
      >
        <ArrowLeft size={16} />
        Назад к тарифам
      </button>
    </div>
  );
}
