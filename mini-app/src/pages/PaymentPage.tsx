import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { PlanDTO } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { Star, CreditCard, ArrowLeft, Tag, Check, X } from 'lucide-react';

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
  const navigate = useNavigate();
  const { tg, haptic, backButton, initData } = useTelegram();
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

  useEffect(() => {
    backButton?.show();
    const goBack = () => {
      if (showWidget) {
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
    });

    return () => {
      backButton?.offClick(goBack);
      backButton?.hide();
      widgetRef.current?.destroy();
    };
  }, [planId, navigate, backButton, showWidget]);

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
      const activePromo = promoResult?.valid ? promoCode : undefined;
      const { invoiceLink } = await api.createInvoice(plan.id, initData, activePromo);
      tg?.openInvoice(invoiceLink, (status) => {
        if (status === 'paid') {
          navigate('/');
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
      const activePromo = promoResult?.valid ? promoCode : undefined;
      const { confirmationToken } = await api.createYokassaPayment(plan.id, initData, activePromo);
      setShowWidget(true);
      await new Promise((r) => setTimeout(r, 100));

      const checkout = new window.YooMoneyCheckoutWidget!({
        confirmation_token: confirmationToken,
        return_url: `${window.location.origin}/`,
        error_callback: (error) => {
          console.error('YooKassa widget error:', error);
          setShowWidget(false);
          setPaying(false);
          alert('Ошибка оплаты. Попробуйте позже.');
        },
      });

      widgetRef.current = checkout;
      await checkout.render('yokassa-widget');
    } catch (err) {
      console.error('YooKassa payment error:', err);
      setShowWidget(false);
      alert('Ошибка создания платежа. Попробуйте позже или выберите оплату Stars.');
    } finally {
      setPaying(false);
    }
  };

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
            className="flex items-center gap-2 text-sm text-tg-link px-1"
          >
            <Tag size={14} />
            Есть промокод?
          </button>
        ) : (
          <div className="bg-tg-secondary rounded-2xl p-3">
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
        <h3 className="text-sm font-semibold text-tg-hint px-1">
          Способ оплаты
        </h3>

        <button
          onClick={handleStars}
          disabled={paying}
          className="w-full flex items-center gap-4 p-4 bg-tg-secondary rounded-2xl active:scale-[0.98] transition-transform text-left"
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
          className="w-full flex items-center gap-4 p-4 bg-tg-secondary rounded-2xl active:scale-[0.98] transition-transform text-left"
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
