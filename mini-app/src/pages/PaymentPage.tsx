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
      const { invoiceLink } = await api.createInvoice(plan.id, initData);
      tg?.openInvoice(invoiceLink, (status) => {
        if (status === 'paid') {
          haptic?.notificationOccurred('success');
          setPaymentSuccess(true);
          setTimeout(() => navigate('/'), 2500);
        }
        setPaying(false);
      });
    } catch {
      setPaying(false);
    }
  };

  const handleYokassa = async () => {
    if (paying || !plan) return;
    haptic?.impactOccurred('medium');
    setPaying(true);

    try {
      const { confirmationToken } = await api.createYokassaPayment(plan.id, initData);
      setShowWidget(true);
      await new Promise((r) => setTimeout(r, 100));

      const checkout = new window.YooMoneyCheckoutWidget!({
        confirmation_token: confirmationToken,
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
    } catch (err) {
      console.error('YooKassa payment error:', err);
      setShowWidget(false);
      toast('Ошибка создания платежа', 'error');
    } finally {
      setPaying(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[70vh] animate-fade-in text-center">
        {/* Animated success circle */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-brand-green/10 flex items-center justify-center animate-bounce-in">
            <CheckCircle size={48} className="text-brand-green" />
          </div>
          {/* Decorative rings */}
          <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-brand-green/20 animate-ping" />
        </div>

        <h2 className="text-2xl font-bold text-tg-text mb-2">Оплата прошла!</h2>
        <p className="text-sm text-tg-hint mb-1">VPN подключение активировано</p>
        <p className="text-xs text-tg-hint mb-6">Перенаправление на главную...</p>

        {/* Progress bar */}
        <div className="w-32 h-1 bg-tg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-[2500ms] ease-linear"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  }

  if (loading || !plan) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-32 bg-tg-secondary rounded-3xl animate-pulse" />
        <div className="h-16 bg-tg-secondary rounded-2xl animate-pulse" />
        <div className="h-16 bg-tg-secondary rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (showWidget) {
    return (
      <div className="p-4 pb-8 space-y-4">
        <div className="bg-gradient-primary rounded-3xl p-5 text-white text-center">
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

  const discount = promoResult?.valid ? promoResult.discountPercent || 0 : 0;
  const discountedPrice = discount > 0 ? Math.round(plan.price * (1 - discount / 100)) : plan.price;

  return (
    <div className="p-4 pb-4 space-y-5 animate-fade-in">
      {/* Plan summary */}
      <div className="bg-gradient-primary rounded-3xl p-5 text-white text-center">
        <h2 className="text-lg font-bold mb-1">{plan.name}</h2>
        <div className="text-sm text-white/80 mb-3">
          {trafficLabel} · {plan.maxDevices} устр. · {plan.durationDays} дней
          {promoResult?.valid && promoResult.bonusDays ? ` + ${promoResult.bonusDays} бонус` : ''}
        </div>
        <div className="text-3xl font-bold">
          {discount > 0 && (
            <span className="text-lg line-through text-white/50 mr-2">{plan.price} ₽</span>
          )}
          {discountedPrice} ₽
        </div>
        {discount > 0 && (
          <div className="text-sm text-white/80 mt-1">Скидка {discount}%</div>
        )}
      </div>

      {/* Promo code */}
      <div className="space-y-2">
        {!showPromo ? (
          <button
            onClick={() => setShowPromo(true)}
            className="flex items-center gap-2 text-sm text-tg-link px-3 py-2.5 -mx-2"
          >
            <Tag size={14} />
            Есть промокод?
          </button>
        ) : (
          <div className="bg-tg-secondary rounded-2xl p-3">
            <div className="text-xs font-medium text-tg-hint mb-1.5">Промокод</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoResult(null);
                }}
                placeholder="Введи промокод"
                className="flex-1 bg-transparent text-tg-text text-sm outline-none placeholder:text-tg-hint"
                maxLength={32}
                autoFocus
              />
              <button
                onClick={handleValidatePromo}
                disabled={validating || !promoCode.trim()}
                className="px-3 py-1.5 rounded-lg bg-gradient-primary text-white text-xs font-semibold disabled:opacity-50"
              >
                {validating ? '...' : 'Применить'}
              </button>
            </div>
            {promoResult && (
              <div className={`flex items-center gap-1.5 mt-2 text-xs ${promoResult.valid ? 'text-brand-green' : 'text-brand-red'}`}>
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
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1 mb-1">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-brand-purple" />
            <div className="w-2 h-2 rounded-full bg-brand-purple" />
            <div className="w-2 h-2 rounded-full bg-brand-purple/30" />
          </div>
          <span className="text-xs text-tg-hint">Шаг 2 из 3</span>
        </div>
        <h3 className="text-sm font-semibold text-tg-hint px-1">
          Способ оплаты
        </h3>

        <button
          onClick={handleStars}
          disabled={paying}
          className={`w-full flex items-center gap-4 p-4 bg-tg-secondary rounded-2xl active:scale-[0.98] transition-all text-left hover:shadow-card hover:-translate-y-0.5 ${paying ? 'opacity-50' : ''}`}
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Star size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-tg-text">Telegram Stars</div>
            <div className="text-sm text-tg-hint">{plan.priceStars} Stars</div>
          </div>
          <span className="text-tg-hint">›</span>
        </button>

        <button
          onClick={handleYokassa}
          disabled={paying}
          className={`w-full flex items-center gap-4 p-4 bg-tg-secondary rounded-2xl active:scale-[0.98] transition-all text-left hover:shadow-card hover:-translate-y-0.5 ${paying ? 'opacity-50' : ''}`}
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center">
            <CreditCard size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-tg-text">Банковская карта</div>
            <div className="text-sm text-tg-hint">{discountedPrice} ₽ · СБП</div>
          </div>
          <span className="text-tg-hint">›</span>
        </button>
      </div>

      {/* Back */}
      <button
        onClick={() => navigate('/plans')}
        className="w-full flex items-center justify-center gap-2 py-3 text-tg-link text-sm"
      >
        <ArrowLeft size={16} />
        Назад к тарифам
      </button>
    </div>
  );
}
