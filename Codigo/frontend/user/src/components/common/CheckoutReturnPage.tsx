import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/common/layout/Header';
import { api } from '@/lib/api';

type CheckoutReturnStatus = 'success' | 'pending' | 'failure';

type CheckoutReturnPageProps = {
  status: CheckoutReturnStatus;
};

const STATUS_CONFIG: Record<
  CheckoutReturnStatus,
  {
    title: string;
    description: string;
    badge: string;
    badgeClass: string;
    Icon: typeof CheckCircle2;
    iconClass: string;
  }
> = {
  success: {
    title: 'Pagamento aprovado',
    description: 'Seu pagamento foi aprovado e sua reserva está em processamento de confirmação.',
    badge: 'Aprovado',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    Icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
  pending: {
    title: 'Pagamento pendente',
    description: 'Recebemos sua solicitação, mas o pagamento ainda está pendente de confirmação.',
    badge: 'Pendente',
    badgeClass: 'bg-amber-100 text-amber-700',
    Icon: Clock3,
    iconClass: 'text-amber-600',
  },
  failure: {
    title: 'Pagamento não aprovado',
    description: 'O pagamento não foi concluído. Você pode revisar e tentar novamente.',
    badge: 'Falhou',
    badgeClass: 'bg-rose-100 text-rose-700',
    Icon: AlertCircle,
    iconClass: 'text-rose-600',
  },
};

const CheckoutReturnPage = ({ status }: CheckoutReturnPageProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const config = STATUS_CONFIG[status];
  const hasPersistedRef = useRef(false);
  const details = useMemo(
    () => ({
      paymentId: searchParams.get('payment_id') || searchParams.get('collection_id') || '-',
      paymentStatus: searchParams.get('status') || searchParams.get('collection_status') || '-',
      externalReference: searchParams.get('external_reference') || '-',
      merchantOrderId: searchParams.get('merchant_order_id') || '-',
      preferenceId: searchParams.get('preference_id') || '-',
    }),
    [searchParams],
  );
  const Icon = config.Icon;

  useEffect(() => {
    if (hasPersistedRef.current) return;
    hasPersistedRef.current = true;

    void api.post('/api/payments/checkout-pro/return', {
      payment_id: details.paymentId !== '-' ? details.paymentId : undefined,
      status: details.paymentStatus !== '-' ? details.paymentStatus : undefined,
      external_reference:
        details.externalReference !== '-' ? details.externalReference : undefined,
      merchant_order_id:
        details.merchantOrderId !== '-' ? details.merchantOrderId : undefined,
      preference_id: details.preferenceId !== '-' ? details.preferenceId : undefined,
    });
  }, [details]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16 pt-24">
        <div className="duze-container max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="flex items-center gap-3">
              <motion.div
                className={`rounded-full p-2 ${
                  status === 'success'
                    ? 'bg-emerald-100'
                    : status === 'pending'
                      ? 'bg-amber-100'
                      : 'bg-rose-100'
                }`}
                animate={
                  status === 'success'
                    ? { scale: [1, 1.1, 1] }
                    : status === 'pending'
                      ? { rotate: [0, 10, -10, 0] }
                      : { x: [0, -6, 6, -4, 4, 0] }
                }
                transition={{ duration: 0.8, repeat: status === 'pending' ? Infinity : 0 }}
              >
                <Icon className={`h-10 w-10 ${config.iconClass}`} />
              </motion.div>
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">{config.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
              </div>
            </div>

            <div className="mt-6">
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${config.badgeClass}`}>
                {config.badge}
              </span>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Você pode acompanhar os detalhes desta transação em suas reservas.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/hospedagem/my-reservations')}
                className="btn-gold flex-1 text-sm"
              >
                Ver minhas reservas
              </button>
              <button
                type="button"
                onClick={() => navigate('/hospedagem')}
                className="flex-1 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutReturnPage;
