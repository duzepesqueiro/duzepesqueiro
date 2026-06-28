import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, XCircle, Eye, Clock, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/common/layout/Header';
import { api, createReview } from '@/lib/api';
import { mapApiChaletToRoom } from '@/lib/hostingRoomMapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ReservationDetailDialog from '@/components/common/reservation/ReservationDetailDialog';
import CancelReservationDialog from '@/components/common/reservation/CancelReservationDialog';
import ReviewModal from '@/components/reviews/ReviewModal';
import { toast } from '@/hooks/use-toast';
import type { Reservation, PaymentData } from '@/types/booking';
import type { Room } from '@/types/booking';
import { formatBRL } from '@/lib/currency';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

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

const parseLocalDateParam = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
};

const PAGE_SIZE = 10;

const MyReservationsPage = () => {
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const [cancelRes, setCancelRes] = useState<Reservation | null>(null);
  const [reviewRes, setReviewRes] = useState<Reservation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

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
            checkIn: item.checkInDate ? parseLocalDateParam(item.checkInDate) : null,
            checkOut: item.checkOutDate ? parseLocalDateParam(item.checkOutDate) : null,
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

  const completedReservationIds = useMemo(
    () => reservations.filter((r) => r.status === 'completed').map((r) => r.id),
    [reservations],
  );

  const { data: hasReviewByReservationId = {}, refetch: refetchReviewFlags } = useQuery<
    Record<string, boolean>
  >({
    queryKey: ['my-reservations-has-review', completedReservationIds.join('|')],
    enabled: completedReservationIds.length > 0,
    queryFn: async () => {
      const responses = await Promise.all(
        completedReservationIds.map(async (reservationId) => {
          try {
            await api.get(`/api/reviews/subject/HOSTING/${reservationId}`);
            return [reservationId, true] as const;
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 404) {
              return [reservationId, false] as const;
            }
            return [reservationId, false] as const;
          }
        }),
      );
      return Object.fromEntries(responses);
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

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

  const sortedReservations = useMemo(() => {
    const list = [...reservations];
    list.sort((a, b) => {
      const aCheckIn = a.bookingData.checkIn?.getTime();
      const bCheckIn = b.bookingData.checkIn?.getTime();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();

      const aHasCheckIn = typeof aCheckIn === 'number';
      const bHasCheckIn = typeof bCheckIn === 'number';

      if (aHasCheckIn && bHasCheckIn) {
        const aUpcoming = aCheckIn >= todayTime;
        const bUpcoming = bCheckIn >= todayTime;

        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        return aUpcoming ? aCheckIn - bCheckIn : bCheckIn - aCheckIn;
      }

      if (aHasCheckIn && !bHasCheckIn) return -1;
      if (!aHasCheckIn && bHasCheckIn) return 1;

      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    return list;
  }, [reservations]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedReservations.length / PAGE_SIZE)),
    [sortedReservations.length],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [sortedReservations.length]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(Math.max(1, prev), totalPages));
  }, [totalPages]);

  const paginatedReservations = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedReservations.slice(start, start + PAGE_SIZE);
  }, [sortedReservations, currentPage]);

  const paginationRange = useMemo(() => {
    const maxLinks = 5;
    const half = Math.floor(maxLinks / 2);
    const start = Math.max(1, Math.min(currentPage - half, totalPages - maxLinks + 1));
    const end = Math.min(totalPages, start + maxLinks - 1);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [currentPage, totalPages]);

  const getCountdown = (checkInDate: Date) => {
    const diff = differenceInDays(checkInDate, new Date());
    if (diff === 0) return "É hoje!";
    if (diff > 0) return `Faltam\u00A0${diff}\u00A0dias`;
    return null;
  };

  return (
    <div className="min-h-screen bg-[#fcf9f2]"> 
      {!isMobile ? <Header open={sidebarOpen} setOpen={setSidebarOpen} /> : null}

      <main className={`pt-28 pb-16 transition-all duration-300 ${isMobile ? '' : sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="duze-container max-w-5xl">
          <header className="mb-10">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl font-bold text-[#1a2b3c] tracking-tight"
            >
              Minhas Reservas
            </motion.h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Gerencie suas estadias na Pousada Duze.</p>
          </header>

          {isLoadingReservations ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-10">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                  <div className="h-56 w-full animate-pulse bg-slate-200" />
                  <div className="space-y-4 p-7">
                    <div className="h-6 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-20 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-12 w-full animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : isErrorReservations ? (
            <div className="text-center py-20 bg-white/50 backdrop-blur rounded-3xl border border-dashed border-slate-300">
              <CalendarDays className="h-14 w-14 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-700 text-lg font-semibold">Não foi possível carregar suas reservas.</p>
              <p className="mt-2 text-slate-500 text-sm">Tente novamente em alguns instantes.</p>
            </div>
          ) : sortedReservations.length === 0 ? (
            <div className="text-center py-20 bg-white/50 backdrop-blur rounded-3xl border border-dashed border-slate-300">
              <CalendarDays className="h-14 w-14 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium">Nenhuma reserva encontrada.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Exibindo{' '}
                  <span className="font-semibold text-slate-700">
                    {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, sortedReservations.length)}
                  </span>{' '}
                  de <span className="font-semibold text-slate-700">{sortedReservations.length}</span> reservas
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-10">
                {paginatedReservations.map((res, i) => {
                  const room = roomById[res.bookingData.roomId];
                  const countdown = res.bookingData.checkIn ? getCountdown(res.bookingData.checkIn) : null;
                  const canReview = res.status === 'completed' && hasReviewByReservationId[res.id] === false;

                  return (
                    <motion.div
                      key={res.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]"
                    >
                      <div className="flex h-full flex-col">
                        <div className="relative h-56 w-full overflow-hidden">
                          {room ? (
                            <img
                              src={room.images[0]}
                              alt={room.name}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="h-full w-full animate-pulse bg-slate-200" />
                          )}

                          <div className="absolute left-4 top-4">
                            <Badge className="bg-[#10b981] hover:bg-[#10b981] text-white border-none px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-lg">
                              Confirmada
                            </Badge>
                          </div>

                          <div className="absolute right-4 top-4 rounded-xl border border-white/20 bg-black/60 px-3 py-1.5 shadow-lg backdrop-blur-md">
                            <span className="text-sm font-bold text-white">{formatBRL(res.totalPrice)}</span>
                          </div>

                          {countdown && (
                            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full border border-slate-100 bg-white/95 px-3 py-1 shadow-md backdrop-blur">
                              <Clock className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{countdown}</span>
                            </div>
                          )}
                        </div>

                        <div className="p-7 flex-1 flex flex-col">
                          <div className="mb-4">
                            <Badge className={paymentStatusColors[String(res.paymentStatus || 'PENDING')] || 'bg-muted text-foreground'}>
                              {paymentStatusLabels[String(res.paymentStatus || 'PENDING')] || 'Pagamento pendente'}
                            </Badge>
                          </div>

                          <div className="mb-5">
                            <h3 className="font-display font-extrabold text-2xl text-slate-800 mb-1 leading-tight group-hover:text-blue-900 transition-colors">
                              {room?.name || 'Carregando...'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">RES-{res.id.slice(0, 8)}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-0 mb-6 border border-slate-100 rounded-2xl overflow-hidden shadow-inner bg-slate-50/50">
                            <div className="p-4 border-r border-slate-100">
                              <p className="text-[9px] uppercase text-slate-400 font-black tracking-widest mb-1">Check-in</p>
                              <p className="text-sm font-bold text-slate-700 uppercase leading-none">
                                {res.bookingData.checkIn ? format(res.bookingData.checkIn, 'dd MMM', { locale: ptBR }) : '—'}
                              </p>
                            </div>
                            <div className="p-4">
                              <p className="text-[9px] uppercase text-slate-400 font-black tracking-widest mb-1">Check-out</p>
                              <p className="text-sm font-bold text-slate-700 uppercase leading-none">
                                {res.bookingData.checkOut ? format(res.bookingData.checkOut, 'dd MMM', { locale: ptBR }) : '—'}
                              </p>
                            </div>
                            <div className="col-span-2 p-3 bg-white border-t border-slate-100 text-center">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">
                                {res.bookingData.guests} hóspedes registrados
                              </p>
                            </div>
                          </div>

                          <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <Button
                              onClick={() => setDetailRes(res)}
                              className="h-12 w-full bg-slate-900 font-bold text-white shadow-lg transition-all duration-300 hover:bg-blue-900 sm:flex-1"
                            >
                              <Eye className="mr-2 h-4 w-4" /> Detalhes
                            </Button>

                            {canReview ? (
                              <Button
                                onClick={() => setReviewRes(res)}
                                variant="outline"
                                className="h-12 w-full rounded-xl border-[#F2AB27]/60 bg-[#F2BF27]/25 font-bold text-[#284003] shadow-sm hover:bg-[#F2BF27]/35 hover:border-[#F2AB27] sm:w-auto"
                                title="Avaliar reserva"
                              >
                                <Star className="mr-2 h-4 w-4" /> Avaliar
                              </Button>
                            ) : null}

                            <Button
                              variant="outline"
                              size="icon"
                              className="h-12 w-full rounded-xl border-slate-200 text-slate-400 shadow-sm transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 sm:w-12"
                              onClick={() => setCancelRes(res)}
                              title="Cancelar reserva"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {totalPages > 1 ? (
                <div className="flex justify-center pt-2">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                        />
                      </PaginationItem>

                      {paginationRange.map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink isActive={page === currentPage} onClick={() => setCurrentPage(page)}>
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>

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

      {reviewRes ? (
        <ReviewModal
          open={!!reviewRes}
          onOpenChange={(o) => !o && setReviewRes(null)}
          title="Avaliar sua estadia"
          description={`Conte como foi sua experiência em "${roomById[reviewRes.bookingData.roomId]?.name ?? 'este chalé'}".`}
          onSubmit={async ({ rating, comment }) => {
            try {
              await createReview({
                domain: 'HOSTING',
                subjectId: reviewRes.id,
                rating,
                comment,
              });
              toast({ title: 'Avaliação enviada', description: 'Obrigado por compartilhar sua experiência.' });
              await refetchReviewFlags();
            } catch (err: any) {
              const message = err?.response?.data?.message;
              const text = Array.isArray(message) ? message.join(', ') : String(message || 'Não foi possível enviar sua avaliação.');
              toast({ title: 'Erro ao enviar', description: text, variant: 'destructive' });
            }
          }}
        />
      ) : null}
    </div>
  );
};

export default MyReservationsPage;
