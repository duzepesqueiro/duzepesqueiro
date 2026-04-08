import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, PawPrint, Check, ChevronLeft, Flame } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Header from '@/components/layout/Header';
import { rooms } from '@/data/rooms';
import { useBooking } from '@/contexts/BookingContext';
import { Badge } from '@/components/ui/badge';

const RoomDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { booking, setBooking } = useBooking();
  const room = rooms.find(r => r.id === id);

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Quarto não encontrado.</p>
      </div>
    );
  }

  const nights = booking.checkIn && booking.checkOut
    ? differenceInDays(booking.checkOut, booking.checkIn)
    : 1;
  const totalPrice = room.pricePerNight * Math.max(nights, 1);

  const handleBookNow = () => {
    setBooking(prev => ({ ...prev, roomId: room.id }));
    navigate('/booking');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <button
            onClick={() => navigate('/rooms')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar aos quartos
          </button>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left - Gallery + Info */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl overflow-hidden mb-8"
              >
                <img
                  src={room.images[0]}
                  alt={room.name}
                  className="w-full aspect-[16/9] object-cover"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-3xl font-bold text-foreground">{room.name}</h1>
                  {room.petFriendly && (
                    <Badge className="bg-primary text-primary-foreground gap-1">
                      <PawPrint className="h-3 w-3" /> Pet friendly
                    </Badge>
                  )}
                </div>

                <p className="text-muted-foreground mb-8 leading-relaxed">{room.description}</p>

                {/* Urgency badge */}
                <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-lg mb-8 w-fit">
                  <Flame className="h-4 w-4" />
                  <span className="text-sm font-medium">Este quarto está quase lotado para as próximas semanas</span>
                </div>

                {/* Structure */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-card rounded-xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <h3 className="font-display font-semibold text-foreground mb-2">Camas</h3>
                    <p className="text-sm text-muted-foreground">{room.beds}</p>
                  </div>
                  <div className="bg-card rounded-xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <h3 className="font-display font-semibold text-foreground mb-2">Banheiro</h3>
                    <p className="text-sm text-muted-foreground">{room.bathroom}</p>
                  </div>
                  <div className="bg-card rounded-xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
                    <h3 className="font-display font-semibold text-foreground mb-2">Capacidade</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-4 w-4" /> Até {room.capacity} pessoas
                    </p>
                  </div>
                </div>

                {/* Amenities */}
                <h3 className="font-display text-xl font-semibold text-foreground mb-4">Comodidades</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                  {room.amenities.map(a => (
                    <div key={a} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary" /> {a}
                    </div>
                  ))}
                </div>

                {/* Extras */}
                <h3 className="font-display text-xl font-semibold text-foreground mb-4">Inclusos</h3>
                <div className="flex flex-wrap gap-2 mb-8">
                  {room.extras.map(e => (
                    <Badge key={e} variant="secondary">{e}</Badge>
                  ))}
                </div>

                {/* Rules */}
                <h3 className="font-display text-xl font-semibold text-foreground mb-4">Regras</h3>
                <ul className="space-y-2 mb-8">
                  {room.rules.map(r => (
                    <li key={r} className="text-sm text-muted-foreground">• {r}</li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Right - Booking box (sticky) */}
            <div className="lg:w-80">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-24 bg-card rounded-2xl p-6"
                style={{ boxShadow: 'var(--shadow-elevated)' }}
              >
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground">A partir de</span>
                  <div className="flex items-baseline gap-1">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={totalPrice}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="text-3xl font-bold text-foreground"
                      >
                        R$ {totalPrice}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-sm text-muted-foreground">
                      / {Math.max(nights, 1)} {nights === 1 ? 'noite' : 'noites'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-in</span>
                    <span className="text-foreground font-medium">
                      {booking.checkIn ? format(booking.checkIn, 'dd MMM yyyy', { locale: ptBR }) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-out</span>
                    <span className="text-foreground font-medium">
                      {booking.checkOut ? format(booking.checkOut, 'dd MMM yyyy', { locale: ptBR }) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hóspedes</span>
                    <span className="text-foreground font-medium">{booking.guests}</span>
                  </div>
                  {booking.pets && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pets</span>
                      <span className="text-foreground font-medium">Sim</span>
                    </div>
                  )}
                </div>

                {booking.guests > room.capacity && (
                  <p className="text-destructive text-sm mb-4">
                    ⚠ Este quarto comporta até {room.capacity} pessoas
                  </p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBookNow}
                  disabled={booking.guests > room.capacity}
                  className="btn-gold w-full h-12 flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reservar agora
                </motion.button>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  Melhor preço garantido · Cancelamento flexível
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoomDetailPage;
