import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CreditCard, QrCode, ChevronLeft, Copy, Clock3, ShieldCheck } from 'lucide-react';
import Header from '@/components/common/layout/Header';
import { useBooking } from '@/contexts/BookingContext';
import { api } from '@/lib/api';
import { mapApiChaletToRoom } from '@/lib/hostingRoomMapper';
import type { Room } from '@/types/booking';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatBRL } from '@/lib/currency';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

type ApiChaletDetail = {
  id: string;
  name: string;
  description?: string;
  unitType?: string;
  maxGuests?: number;
  basePrice?: number;
  currentPrice?: number;
  amenities?: string[];
  images?: Array<{ id?: string; imageUrl?: string }>;
  petFriendly?: boolean;
  rooms?: string[];
  notes?: string;
};

type ApiReservationResponse = {
  id: string;
  code?: string;
  totalAmount?: number;
};

type ApiLoggedUserProfile = {
  nome?: string;
  email?: string;
  telefone?: string;
};

type PaymentMethod = 'pix' | 'card';

type PaymentLocationState = {
  room?: Room;
  totalPrice?: number;
};

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { booking, payment, setPayment, addReservation } = useBooking();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const [method, setMethod] = useState<PaymentMethod>((payment.method as PaymentMethod) || 'pix');
  const [cardNumber, setCardNumber] = useState(payment.card?.number || '');
  const [cardName, setCardName] = useState(payment.card?.name || '');
  const [cardExpiry, setCardExpiry] = useState(payment.card?.expiry || '');
  const [cardCvv, setCardCvv] = useState(payment.card?.cvv || '');
  const [pixTimeLeftSeconds, setPixTimeLeftSeconds] = useState(15 * 60);

  const state = location.state as PaymentLocationState | null;
  const stateRoom = state?.room;
  const authEmail = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return window.localStorage.getItem('auth_email') || '';
  }, []);

  const { data: apiRoomData } = useQuery<ApiChaletDetail>({
    queryKey: ['payment-room-detail', booking.roomId],
    queryFn: async () => {
      const { data } = await api.get(`/api/chales/${booking.roomId}`);
      return data as ApiChaletDetail;
    },
    enabled: Boolean(booking.roomId && !stateRoom),
  });
  const { data: loggedUserProfile } = useQuery<ApiLoggedUserProfile>({
    queryKey: ['payment-user-profile', authEmail],
    queryFn: async () => {
      const { data } = await api.get('/user/usuarios/me', {
        params: { email: authEmail },
      });
      return data as ApiLoggedUserProfile;
    },
    enabled: Boolean(authEmail),
  });

  const room = stateRoom ?? (apiRoomData ? mapApiChaletToRoom(apiRoomData) : null);
  const nights = useMemo(() => {
    if (!booking.checkIn || !booking.checkOut) return 1;
    const diff = Math.max(
      1,
      Math.ceil((booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)),
    );
    return diff;
  }, [booking.checkIn, booking.checkOut]);

  const totalPrice = state?.totalPrice ?? (room ? room.pricePerNight * nights : 0);
  const appPaymentAmount = totalPrice * 0.5;
  const checkinPaymentAmount = totalPrice * 0.5;

  const pixKey = useMemo(
    () =>
      `duze-${booking.roomId || 'room'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    [booking.roomId],
  );
  const pixPayload = useMemo(
    () => `Pagamento Reserva Du Ze | Valor: ${formatBRL(appPaymentAmount)} | Chave: ${pixKey}`,
    [appPaymentAmount, pixKey],
  );
  const pixQrCodeUrl = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        pixPayload,
      )}`,
    [pixPayload],
  );
  const pixMinutes = String(Math.floor(pixTimeLeftSeconds / 60)).padStart(2, '0');
  const pixSeconds = String(pixTimeLeftSeconds % 60).padStart(2, '0');

  useEffect(() => {
    if (method !== 'pix') return;
    if (pixTimeLeftSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setPixTimeLeftSeconds((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [method, pixTimeLeftSeconds]);

  const copyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      toast({ title: 'Chave PIX copiada!' });
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar a chave PIX.',
        variant: 'destructive',
      });
    }
  };

  const createReservationMutation = useMutation({
    mutationFn: async () => {
      if (!room) throw new Error('Quarto não encontrado.');
      if (!booking.checkIn || !booking.checkOut) throw new Error('Check-in e check-out são obrigatórios.');
      if (booking.responsibleGuestIndex === null || !booking.guestDetails[booking.responsibleGuestIndex]) {
        throw new Error('Selecione um hóspede responsável válido.');
      }
      if (method === 'card' && (!cardNumber.trim() || !cardName.trim() || !cardExpiry.trim() || !cardCvv.trim())) {
        throw new Error('Preencha os dados do cartão para continuar.');
      }

      const responsibleGuest = booking.guestDetails[booking.responsibleGuestIndex];
      const reservationEmail = (loggedUserProfile?.email || authEmail || '').trim();
      if (!reservationEmail) {
        throw new Error('Não foi possível identificar o e-mail da conta logada para envio da confirmação.');
      }
      const payload = {
        chaletId: room.id,
        checkInDate: booking.checkIn.toISOString(),
        checkOutDate: booking.checkOut.toISOString(),
        adults: booking.guestDetails.length,
        children: 0,
        guestName: responsibleGuest.name.trim(),
        guestEmail: reservationEmail,
        guestPhone: (loggedUserProfile?.telefone || '').trim() || undefined,
        vehiclePlate: booking.vehiclePlate,
        notes: booking.observations.trim() || undefined,
        paymentMethod: method === 'card' ? 'CREDIT_CARD' : 'PIX',
        policiesAccepted: booking.termsAccepted,
        policiesAcceptedAt: new Date().toISOString(),
        policyVersion: booking.policyVersion,
        policyTerm: booking.policyTerm,
        guests: booking.guestDetails.map((guest) => ({
          fullName: guest.name.trim(),
          cpf: guest.document.trim(),
          age: guest.age,
        })),
        responsibleGuestIndex: booking.responsibleGuestIndex,
      };

      const { data } = await api.post('/api/reservas', payload);
      return data as ApiReservationResponse;
    },
  });

  const handlePay = async () => {
    try {
      setPayment({
        method,
        status: 'processing',
        card:
          method === 'card'
            ? { number: cardNumber, name: cardName, expiry: cardExpiry, cvv: cardCvv }
            : undefined,
      });
      const response = await createReservationMutation.mutateAsync();
      setPayment((prev) => ({ ...prev, status: 'success' }));
      addReservation({
        id: response.code ?? response.id,
        bookingData: booking,
        paymentData: {
          method,
          status: 'success',
          card:
            method === 'card'
              ? { number: cardNumber, name: cardName, expiry: cardExpiry, cvv: cardCvv }
              : undefined,
        },
        status: 'confirmed',
        createdAt: new Date(),
        totalPrice: Number(response.totalAmount ?? totalPrice),
      });
      navigate('/hospedagem/confirmation');
    } catch (error: any) {
      setPayment((prev) => ({ ...prev, status: 'error' }));
      const backendMessage =
        error?.response?.data?.message ?? error?.message ?? 'Não foi possível processar o pagamento.';
      toast({
        title: 'Erro no pagamento',
        description: Array.isArray(backendMessage) ? backendMessage[0] : backendMessage,
        variant: 'destructive',
      });
    }
  };

  if (!room) {
    return (
      <div className="relative min-h-screen bg-background">
        {!isMobile ? <Header open={sidebarOpen} setOpen={setSidebarOpen} /> : null}
        <div className={`relative z-10 transition-all duration-300 ${isMobile ? '' : sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <div className="pt-24 pb-16">
            <div className="duze-container text-center">
              <p className="text-muted-foreground mt-16">Dados da reserva não encontrados.</p>
              <button onClick={() => navigate('/hospedagem/booking')} className="btn-gold mt-4 inline-block">
                Voltar para reserva
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F2F2F2]">
      {!isMobile ? <Header open={sidebarOpen} setOpen={setSidebarOpen} /> : null}
      <main className={`relative z-10 transition-all duration-300 ${isMobile ? '' : sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="pt-24 pb-16">
          <div className="duze-container max-w-4xl">
            <button
              type="button"
              onClick={() => navigate('/hospedagem/booking')}
              className="mb-6 inline-flex items-center gap-1 rounded-lg border border-[#024059]/25 bg-[#F2BF27]/25 px-3 py-2 text-sm font-medium text-[#024059] transition-colors hover:bg-[#F2BF27]/40"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar para revisão
            </button>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h1 className="font-display text-3xl font-bold text-foreground">Pagamento da Reserva</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Escolha a forma de pagamento para concluir sua reserva.
                </p>
                <div className="mt-4 rounded-xl border border-[#F2AB27]/45 bg-[#FFF7DE] p-4 text-[#7A4A00]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em]">Lembrete importante</p>
                  <p className="mt-1 text-sm font-medium">
                    Pagamento 50% pelo aplicativo e 50% no check-in, de acordo com a lei do turismo.
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => setMethod('pix')}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      method === 'pix' ? 'border-[#024059] bg-[#024059]/5' : 'border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <QrCode className="h-4 w-4" /> PIX
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('card')}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      method === 'card' ? 'border-[#024059] bg-[#024059]/5' : 'border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CreditCard className="h-4 w-4" /> Cartão de crédito
                    </div>
                  </button>
                </div>

                {method === 'card' ? (
                  <div className="mt-6 grid grid-cols-1 gap-4">
                    <div>
                      <Label>Número do cartão</Label>
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="0000 0000 0000 0000"
                      />
                    </div>
                    <div>
                      <Label>Nome impresso no cartão</Label>
                      <Input
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Validade</Label>
                        <Input
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/AA"
                        />
                      </div>
                      <div>
                        <Label>CVV</Label>
                        <Input
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#024059]/20 bg-[#024059]/5 p-4 text-sm">
                      <p className="font-semibold text-foreground">Cartão personalizado</p>
                      <p className="mt-1 text-muted-foreground">
                        Pagamento inicial de {formatBRL(appPaymentAmount)} no app e saldo de{' '}
                        {formatBRL(checkinPaymentAmount)} no check-in.
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" /> Ambiente seguro para transações.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-[#024059]/20 bg-[#024059]/5 p-5 text-sm text-foreground">
                    <div className="space-y-4">
                      <div className="w-full rounded-lg border border-[#024059]/20 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          QR Code PIX
                        </p>
                        <div className="mt-3 flex justify-center">
                          <div className="overflow-hidden rounded-lg border border-[#024059]/25 bg-white p-2">
                            <img src={pixQrCodeUrl} alt="QR Code PIX" className="h-[220px] w-[220px]" />
                          </div>
                        </div>
                      </div>

                      <div className="w-full rounded-lg border border-[#024059]/20 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Chave aleatória PIX
                        </p>
                        <p className="mt-2 break-all font-mono text-sm text-foreground">{pixKey}</p>
                        <button
                          type="button"
                          onClick={copyPixKey}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#024059] hover:underline"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copiar chave
                        </button>
                      </div>

                      <div className="w-full rounded-lg border border-[#F2AB27]/40 bg-[#FFF7DE] p-4 text-[#7A4A00]">
                        <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em]">
                          <Clock3 className="h-3.5 w-3.5" /> Tempo restante
                        </p>
                        <p className="mt-1 text-2xl font-extrabold">
                          {pixMinutes}:{pixSeconds}
                        </p>
                        <p className="text-sm">
                          Após expirar, gere um novo pagamento para continuar.
                        </p>
                      </div>

                      <p className="rounded-lg border border-[#024059]/15 bg-white/70 px-4 py-3 text-base font-semibold text-[#024059]">
                        Valor para pagar agora no aplicativo: <span className="font-extrabold">{formatBRL(appPaymentAmount)}</span>.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <aside className="rounded-2xl border border-[#024059]/20 bg-[#024059] p-6 text-white">
                <h2 className="text-lg font-semibold">Resumo</h2>
                <div className="mt-4 space-y-2 text-sm">
                  <p>{room.name}</p>
                  <p>{nights} noite(s)</p>
                  <p>{booking.guestDetails.length} hóspede(s)</p>
                </div>
                <div className="mt-6 border-t border-white/20 pt-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/80">Total</p>
                  <p className="text-4xl font-extrabold text-[#F2BF27]">{formatBRL(totalPrice)}</p>
                  <p className="mt-3 text-base font-semibold text-white">
                    No app: <span className="text-[#F2BF27] font-extrabold">{formatBRL(appPaymentAmount)}</span> · No check-in:{' '}
                    <span className="text-[#F2BF27] font-extrabold">{formatBRL(checkinPaymentAmount)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={createReservationMutation.isPending}
                  className="btn-gold mt-6 w-full text-base"
                >
                  {createReservationMutation.isPending ? 'Processando pagamento...' : 'Pagar e finalizar reserva'}
                </button>
              </aside>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentPage;
