import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, XCircle, Eye, UserPen } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useBooking } from '@/contexts/BookingContext';
import { rooms } from '@/data/rooms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ReservationDetailDialog from '@/components/reservations/ReservationDetailDialog';
import EditGuestsDialog from '@/components/reservations/EditGuestsDialog';
import CancelReservationDialog from '@/components/reservations/CancelReservationDialog';
import type { Reservation, Guest } from '@/types/booking';

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
                const room = rooms.find(r => r.id === res.bookingData.roomId);
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
                        <span className="font-semibold text-foreground">R$ {res.totalPrice}</span>
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
          room={rooms.find(r => r.id === detailRes.bookingData.roomId)}
        />
      )}

      {editRes && (
        <EditGuestsDialog
          open={!!editRes}
          onOpenChange={(o) => !o && setEditRes(null)}
          guests={editRes.bookingData.guestDetails}
          maxCapacity={rooms.find(r => r.id === editRes.bookingData.roomId)?.capacity || 10}
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
