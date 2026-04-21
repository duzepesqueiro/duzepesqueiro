import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, XCircle, Eye, UserPen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/common/layout/Header';
import { useBooking } from '@/contexts/BookingContext';
import { api } from '@/lib/api';
import { mapApiChaletToRoom } from '@/lib/hostingRoomMapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ReservationDetailDialog from '@/components/common/reservation/ReservationDetailDialog';
import EditGuestsDialog from '@/components/common/reservation/EditGuestsDialog';
import CancelReservationDialog from '@/components/common/reservation/CancelReservationDialog';
import type { Reservation, Guest } from '@/types/booking';
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

const statusColors: Record<string, string> = {
  confirmed: 'bg-primary text-primary-foreground',
  pending: 'bg-accent text-accent-foreground',
  cancelled: 'bg-destructive text-destructive-foreground',
};

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  cancelled: 'Cancelada',
};

const MyReservationsPage = () => {
  const { reservations, updateReservationGuests } = useBooking();
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const [editRes, setEditRes] = useState<Reservation | null>(null);
  const [cancelRes, setCancelRes] = useState<Reservation | null>(null);

  const handleSaveGuests = (id: string, guests: Guest[]) => {
    updateReservationGuests(id, guests);
  };

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

          {reservations.length === 0 ? (
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
                          <p className="text-xs text-muted-foreground font-mono truncate">{res.id}</p>
                        </div>
                        <Badge className={statusColors[res.status]}>{statusLabels[res.status]}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                        <span>
                          {res.bookingData.checkIn ? format(new Date(res.bookingData.checkIn), 'dd MMM', { locale: ptBR }) : '—'} →{' '}
                          {res.bookingData.checkOut ? format(new Date(res.bookingData.checkOut), 'dd MMM', { locale: ptBR }) : '—'}
                        </span>
                        <span>{res.bookingData.guests} hóspede(s)</span>
                        <span className="font-semibold text-foreground">{formatBRL(res.totalPrice)}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDetailRes(res)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Ver detalhes
                        </Button>
                        {res.status !== 'cancelled' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setEditRes(res)}>
                              <UserPen className="h-3.5 w-3.5 mr-1" /> Editar hóspedes
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancelRes(res)}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
                            </Button>
                          </>
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

      {editRes && (
        <EditGuestsDialog
          open={!!editRes}
          onOpenChange={(o) => !o && setEditRes(null)}
          guests={editRes.bookingData.guestDetails}
          maxCapacity={roomById[editRes.bookingData.roomId]?.capacity || 10}
          onSave={(guests) => handleSaveGuests(editRes.id, guests)}
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
