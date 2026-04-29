import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, XCircle, Eye, UserPen, Clock } from 'lucide-react';
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

  const getCountdown = (checkInDate: string) => {
    const diff = differenceInDays(new Date(checkInDate), new Date());
    if (diff === 0) return "É hoje!";
    if (diff > 0) return `Faltam ${diff} dias`;
    return null;
  };

  return (
    <div className="min-h-screen bg-[#fcf9f2]"> 
      <Header />

      <main className="pt-28 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
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

          {reservations.length === 0 ? (
            <div className="text-center py-20 bg-white/50 backdrop-blur rounded-3xl border border-dashed border-slate-300">
              <CalendarDays className="h-14 w-14 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium">Nenhuma reserva encontrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {reservations.map((res, i) => {
                const room = roomById[res.bookingData.roomId];
                const countdown = res.bookingData.checkIn ? getCountdown(res.bookingData.checkIn) : null;

                return (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group bg-white rounded-[24px] border border-slate-200 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 overflow-hidden"
                  >
                    <div className="flex flex-col h-full">
                      <div className="relative h-56 w-full overflow-hidden">
                        {room ? (
                          <img
                            src={room.images[0]}
                            alt={room.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-200 animate-pulse" />
                        )}
                        
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-[#10b981] hover:bg-[#10b981] text-white border-none px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-lg">
                            Confirmada
                          </Badge>
                        </div>

                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-white/20">
                          <span className="text-white font-bold text-sm">
                            {formatBRL(res.totalPrice)}
                          </span>
                        </div>

                        {countdown && (
                          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-slate-100">
                            <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{countdown}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-7 flex-1 flex flex-col">
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
                              {res.bookingData.checkIn ? format(new Date(res.bookingData.checkIn), "dd MMM", { locale: ptBR }) : '—'}
                            </p>
                          </div>
                          <div className="p-4">
                            <p className="text-[9px] uppercase text-slate-400 font-black tracking-widest mb-1">Check-out</p>
                            <p className="text-sm font-bold text-slate-700 uppercase leading-none">
                              {res.bookingData.checkOut ? format(new Date(res.bookingData.checkOut), "dd MMM", { locale: ptBR }) : '—'}
                            </p>
                          </div>
                          <div className="col-span-2 p-3 bg-white border-t border-slate-100 text-center">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">
                              {res.bookingData.guests} hóspedes registrados
                            </p>
                          </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                          <Button 
                            onClick={() => setDetailRes(res)}
                            className="flex-1 h-12 bg-slate-900 hover:bg-blue-900 text-white transition-all duration-300 rounded-xl font-bold shadow-lg"
                          >
                            <Eye className="h-4 w-4 mr-2" /> Detalhes
                          </Button>
                          
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-12 w-12 rounded-xl border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                              onClick={() => setEditRes(res)}
                              title="Editar hóspedes"
                            >
                              <UserPen className="h-4 w-4" />
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-12 w-12 rounded-xl border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm"
                              onClick={() => setCancelRes(res)}
                              title="Cancelar reserva"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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