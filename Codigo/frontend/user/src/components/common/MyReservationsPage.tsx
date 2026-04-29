import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, XCircle, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/common/layout/Header';
import { api } from '@/lib/api';
import { mapApiChaletToRoom } from '@/lib/hostingRoomMapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ReservationDetailDialog from '@/components/common/reservation/ReservationDetailDialog';
import CancelReservationDialog from '@/components/common/reservation/CancelReservationDialog';
import type { Reservation, PaymentData } from '@/types/booking';
import type { Room } from '@/types/booking';
import { formatBRL } from '@/lib/currency';

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

type ApiReservation = {
  id: string;
  code?: string;
  chaletId: string;
  guestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  adults?: number;
  children?: number;
  totalAmount?: number;
  status?: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  createdAt?: string;
  vehiclePlate?: string | null;
  notes?: string | null;
};

const reservationStatusColors: Record<Reservation['status'], string> = {
  confirmed: 'bg-primary text-primary-foreground',
  pending: 'bg-accent text-accent-foreground',
  cancelled: 'bg-destructive text-destructive-foreground',
  completed: 'bg-emerald-600 text-white',
  occupied: 'bg-sky-600 text-white',
  no_show: 'bg-slate-600 text-white',
};

const reservationStatusLabels: Record<Reservation['status'], string> = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  cancelled: 'Cancelada',
  completed: 'Concluida',
  occupied: 'Em hospedagem',
  no_show: 'Nao compareceu',
};

const paymentStatusColors: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  REFUNDED: 'bg-violet-100 text-violet-700',
  CHARGED_BACK: 'bg-fuchsia-100 text-fuchsia-700',
};

const paymentStatusLabels: Record<string, string> = {
  APPROVED: 'Pagamento aprovado',
  PENDING: 'Pagamento pendente',
  CANCELLED: 'Pagamento cancelado',
  REJECTED: 'Pagamento recusado',
  REFUNDED: 'Pagamento reembolsado',
  CHARGED_BACK: 'Estornado',
};

const mapApiReservationStatus = (status?: string): Reservation['status'] => {
  const value = String(status || '').toUpperCase();
  if (value === 'CONFIRMED') return 'confirmed';
  if (value === 'CANCELLED') return 'cancelled';
  if (value === 'COMPLETED') return 'completed';
  if (value === 'OCCUPIED') return 'occupied';
  if (value === 'NO_SHOW') return 'no_show';
  return 'pending';
};

const mapPaymentMethod = (method?: string | null): PaymentData['method'] => {
  const value = String(method || '').toLowerCase();
  if (value.includes('pix')) return 'pix';
  if (value.includes('credit') || value.includes('card')) return 'card';
  return null;
};

const mapPaymentDataStatus = (status?: string | null): PaymentData['status'] => {
  const value = String(status || '').toUpperCase();
  if (value === 'APPROVED') return 'success';
  if (value === 'PENDING') return 'processing';
  if (value === 'REJECTED') return 'error';
  return 'idle';
};

const mapPaymentMethodLabel = (method?: string | null): string => {
  const value = String(method || '').toUpperCase();
  if (value.includes('PIX')) return 'PIX';
  if (value.includes('CREDIT')) return 'Cartao de credito';
  if (value.includes('DEBIT')) return 'Cartao de debito';
  if (value.includes('BOLETO')) return 'Boleto';
  return 'Nao informado';
};

const MyReservationsPage = () => {
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const [cancelRes, setCancelRes] = useState<Reservation | null>(null);

  const {
    data: reservations = [],
    isLoading: isLoadingReservations,
    isError: isErrorReservations,
  } = useQuery<Reservation[]>({
    queryKey: ['my-reservations'],
    queryFn: async () => {
      const { data } = await api.get('/api/reservas/minhas');
      const items = Array.isArray(data) ? (data as ApiReservation[]) : [];
      return items.map((item) => {
        const paymentStatusValue = item.paymentStatus ? String(item.paymentStatus).toUpperCase() : null;
        return {
          id: item.id,
          code: item.code,
          guestName: item.guestName,
          bookingData: {
            roomId: item.chaletId,
            checkIn: item.checkInDate ? new Date(item.checkInDate) : null,
            checkOut: item.checkOutDate ? new Date(item.checkOutDate) : null,
            guests: Math.max(Number(item.adults ?? 0) + Number(item.children ?? 0), 1),
            pets: false,
            guestDetails: [],
            responsibleGuestIndex: null,
            vehiclePlate: item.vehiclePlate || '',
            observations: item.notes || '',
            termsAccepted: true,
            policyVersion: '',
            policyTerm: '',
          },
          paymentData: {
            method: mapPaymentMethod(item.paymentMethod),
            status: mapPaymentDataStatus(item.paymentStatus),
          },
          paymentStatus: paymentStatusValue,
          paymentMethod: item.paymentMethod || null,
          status: mapApiReservationStatus(item.status),
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          totalPrice: Number(item.totalAmount ?? 0),
        } satisfies Reservation;
      });
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const reservationRoomIds = useMemo(
    () =>
      Array.from(
        new Set(
          reservations
            .map((res) => res.bookingData.roomId)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [reservations],
  );

  const { data: roomById = {} } = useQuery<Record<string, Room>>({
    queryKey: ['my-reservations-rooms', reservationRoomIds.join('|')],
    enabled: reservationRoomIds.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        reservationRoomIds.map(async (id) => {
          try {
            const { data } = await api.get(`/api/chales/${id}`);
            return [id, mapApiChaletToRoom(data as ApiChaletDetail)] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      const entries = responses.filter(([, room]) => Boolean(room)) as Array<[string, Room]>;
      return Object.fromEntries(entries);
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl font-bold text-foreground mb-8"
          >
            Minhas Reservas
          </motion.h1>

          {isLoadingReservations ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">Carregando reservas...</p>
            </div>
          ) : isErrorReservations ? (
            <div className="text-center py-16">
              <p className="text-destructive text-lg">Nao foi possivel carregar suas reservas agora.</p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Nenhuma reserva ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((res, i) => {
                const room = roomById[res.bookingData.roomId];
                return (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card rounded-xl p-5 flex flex-col sm:flex-row gap-4"
                    style={{ boxShadow: 'var(--shadow-card)' }}
                  >
                    {room && (
                      <img
                        src={room.images[0]}
                        alt={room.name}
                        className="w-full sm:w-32 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="min-w-0">
                          <h3 className="font-display font-semibold text-foreground">{room?.name || 'Quarto'}</h3>
                          <p className="text-xs text-muted-foreground font-mono truncate">{res.code || res.id}</p>
                          <p className="text-xs text-muted-foreground truncate">{res.guestName || 'Hospede principal'}</p>
                        </div>
                        <Badge className={reservationStatusColors[res.status]}>{reservationStatusLabels[res.status]}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                        <span>
                          {res.bookingData.checkIn ? format(new Date(res.bookingData.checkIn), 'dd MMM', { locale: ptBR }) : '—'} →{' '}
                          {res.bookingData.checkOut ? format(new Date(res.bookingData.checkOut), 'dd MMM', { locale: ptBR }) : '—'}
                        </span>
                        <span>{res.bookingData.guests} hóspede(s)</span>
                        <span>{mapPaymentMethodLabel(res.paymentMethod)}</span>
                        <span className="font-semibold text-foreground">{formatBRL(res.totalPrice)}</span>
                      </div>
                      <div className="mb-3">
                        <Badge className={paymentStatusColors[String(res.paymentStatus || 'PENDING')] || 'bg-muted text-foreground'}>
                          {paymentStatusLabels[String(res.paymentStatus || 'PENDING')] || 'Pagamento pendente'}
                        </Badge>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDetailRes(res)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Ver detalhes
                        </Button>
                        {res.status !== 'cancelled' && (
                          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancelRes(res)}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      {detailRes && (
        <ReservationDetailDialog
          open={!!detailRes}
          onOpenChange={(o) => !o && setDetailRes(null)}
          reservation={detailRes}
          room={roomById[detailRes.bookingData.roomId]}
        />
      )}

      {cancelRes && (
        <CancelReservationDialog
          open={!!cancelRes}
          onOpenChange={(o) => !o && setCancelRes(null)}
          reservationId={cancelRes.id}
        />
      )}
    </div>
  );
};

export default MyReservationsPage;
