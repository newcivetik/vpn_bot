import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { PlanDTO } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';

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
  const navigate = useNavigate();
  const { tg, haptic, backButton, initData } = useTelegram();
  const widgetRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    backButton?.show();
    const goBack = () => {
      if (showWidget) {
        widgetRef.current?.destroy();
        widgetRef.current = null;
        setShowWidget(false);
      } else {
        navigate('/');
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

  const [paying, setPaying] = useState(false);

  const handleStars = async () => {
    if (paying || !plan) return;
    haptic?.impactOccurred('medium');
    setPaying(true);

    try {
      const { invoiceLink } = await api.createInvoice(plan.id, initData);
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
      const { confirmationToken } = await api.createYokassaPayment(plan.id, initData);

      setShowWidget(true);

      // Wait for DOM to render the container
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
        <div className="h-32 bg-tg-secondary rounded-2xl animate-pulse" />
        <div className="h-14 bg-tg-secondary rounded-2xl animate-pulse" />
        <div className="h-14 bg-tg-secondary rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (showWidget) {
    return (
      <div className="p-4 pb-8 space-y-4">
        <div className="bg-tg-secondary rounded-2xl p-4 text-center">
          <h2 className="text-lg font-bold text-tg-text">Оплата картой</h2>
          <div className="text-sm text-tg-hint">{plan.name} — {plan.price} ₽</div>
        </div>
        <div id="yokassa-widget" />
      </div>
    );
  }

  const trafficLabel =
    plan.trafficLimitGB > 0 ? `${plan.trafficLimitGB} ГБ` : 'Безлимит';

  return (
    <div className="p-4 pb-8 space-y-6">
      {/* Plan summary */}
      <div className="bg-tg-secondary rounded-2xl p-5 text-center">
        <h2 className="text-lg font-bold text-tg-text mb-1">{plan.name}</h2>
        <div className="text-sm text-tg-hint mb-3">
          {trafficLabel} · {plan.maxDevices} устр. · {plan.durationDays} дней
        </div>
        <div className="text-3xl font-bold text-tg-text">{plan.price} ₽</div>
      </div>

      {/* Payment methods */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-tg-hint px-1">
          Способ оплаты
        </h3>

        <button
          onClick={handleStars}
          className="w-full flex items-center gap-4 p-4 bg-tg-secondary rounded-2xl active:opacity-80 transition-opacity text-left"
        >
          <span className="text-2xl">⭐</span>
          <div className="flex-1">
            <div className="font-semibold text-tg-text">Telegram Stars</div>
            <div className="text-sm text-tg-hint">
              {plan.priceStars} Stars
            </div>
          </div>
          <span className="text-tg-hint">›</span>
        </button>

        <button
          onClick={handleYokassa}
          className="w-full flex items-center gap-4 p-4 bg-tg-secondary rounded-2xl active:opacity-80 transition-opacity text-left"
        >
          <span className="text-2xl">💳</span>
          <div className="flex-1">
            <div className="font-semibold text-tg-text">Банковская карта</div>
            <div className="text-sm text-tg-hint">{plan.price} ₽</div>
          </div>
          <span className="text-tg-hint">›</span>
        </button>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="w-full py-3 text-tg-link text-sm"
      >
        ← Назад к тарифам
      </button>
    </div>
  );
}
