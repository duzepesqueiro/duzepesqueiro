import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';
import Header from '@/components/common/layout/Header';

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-4 pb-16 pt-24">
        <div className="container mx-auto max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="flex items-center gap-3">
              <Icon className={`h-10 w-10 ${config.iconClass}`} />
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

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Retorno Mercado Pago</p>
              <div className="mt-3 space-y-2 text-sm text-foreground">
                <p>payment_id: {details.paymentId}</p>
                <p>status: {details.paymentStatus}</p>
                <p>external_reference: {details.externalReference}</p>
                <p>merchant_order_id: {details.merchantOrderId}</p>
                <p>preference_id: {details.preferenceId}</p>
              </div>
            </div>

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
