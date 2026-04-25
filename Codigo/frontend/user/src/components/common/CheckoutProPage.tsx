import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Wallet, initMercadoPago } from '@mercadopago/sdk-react';
import Header from '@/components/common/layout/Header';

const CheckoutProPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preferenceId = (searchParams.get('preferenceId') || '').trim();
  const initPoint = (searchParams.get('initPoint') || '').trim();
  const publicKey = ((import.meta as any)?.env?.VITE_MERCADOPAGO_PUBLIC_KEY || '').trim();

  useEffect(() => {
    if (!publicKey) return;
    initMercadoPago(publicKey);
  }, [publicKey]);

  const hasWalletData = useMemo(
    () => Boolean(publicKey && preferenceId),
    [publicKey, preferenceId],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-4 pb-16 pt-24">
        <div className="container mx-auto max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <h1 className="font-display text-3xl font-bold text-foreground">Checkout Mercado Pago</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Clique no botão abaixo para continuar o pagamento com segurança no Mercado Pago.
            </p>

            {hasWalletData ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div id="walletBrick_container" className="w-full">
                  <Wallet initialization={{ preferenceId }} />
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Não foi possível inicializar o checkout</p>
                    <p className="mt-1 text-sm">
                      Verifique se `VITE_MERCADOPAGO_PUBLIC_KEY` e `preferenceId` estão configurados.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {initPoint ? (
                <a
                  href={initPoint}
                  className="btn-gold inline-flex flex-1 items-center justify-center gap-2 text-sm"
                >
                  Abrir checkout direto <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => navigate('/hospedagem/my-reservations')}
                className="flex-1 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Ver minhas reservas
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutProPage;
