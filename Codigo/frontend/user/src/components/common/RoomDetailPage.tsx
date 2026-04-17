import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, PawPrint, Check, ChevronLeft, Flame, X } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Header from '@/components/common/layout/Header';
import { rooms } from '@/data/rooms';
import { useBooking } from '@/contexts/BookingContext';
import { Badge } from '@/components/ui/badge';
import type { BookingData, Room } from '@/types/booking';
import duzePesqueiro1 from '@/assets/duzepesqueiro1.jpeg';
import duzePesqueiro2 from '@/assets/duzepesqueiro2.jpeg';
import duzePesqueiro3 from '@/assets/duzepesqueiro3.jpeg';
import duzePesqueiro4 from '@/assets/duzepesqueiro4.jpeg';
import roomCabin from '@/assets/room-cabin.jpg';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomStandard from '@/assets/room-standard.jpg';
import roomSuite from '@/assets/room-suite.jpg';

type RoomLocationState = {
  room?: Room;
  booking?: Pick<BookingData, 'checkIn' | 'checkOut' | 'guests' | 'pets'>;
};

const MAX_IMAGES = 10;
const ASSET_GALLERY_IMAGES = [
  duzePesqueiro1,
  duzePesqueiro2,
  duzePesqueiro3,
  duzePesqueiro4,
  roomCabin,
  roomDeluxe,
  roomStandard,
  roomSuite,
];

const RoomDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { booking, setBooking } = useBooking();
  const locationRoom = (location.state as RoomLocationState | null | undefined)?.room;
  const room = locationRoom ?? rooms.find((item) => item.id === id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);

  const carouselSlides = useMemo<Array<string | null>>(() => {
    const images = (room?.images ?? []).slice(0, MAX_IMAGES);
    return [
      ...images,
      ...Array.from({ length: Math.max(0, MAX_IMAGES - images.length) }, () => null),
    ];
  }, [room?.id, room?.images]);

  const galleryImages = ASSET_GALLERY_IMAGES;

  useEffect(() => {
    setActiveSlide(0);
  }, [room?.id]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedImageIndex(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

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

  const goToPreviousSlide = () => {
    setActiveSlide((current) => (current - 1 + carouselSlides.length) % carouselSlides.length);
  };

  const goToNextSlide = () => {
    setActiveSlide((current) => (current + 1) % carouselSlides.length);
  };

  const handleBookNow = () => {
    setBooking((prev) => ({ ...prev, roomId: room.id }));
    navigate('/hospedagem/booking', {
      state: {
        room,
        booking: {
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests,
          pets: booking.pets,
        },
      },
    });
  };

  const activeSlideImage = carouselSlides[activeSlide];

  return (
    <div className="relative min-h-screen bg-[#F2F2F2]">
      <Header open={sidebarOpen} setOpen={setSidebarOpen} />

      <main className={`relative z-10 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="pt-24 pb-16 px-4">
          <div className="mx-auto w-[95vw] lg:w-[80vw]">
            <button
              onClick={() => navigate('/hospedagem/rooms')}
              className="mb-6 inline-flex items-center gap-1 rounded-lg border border-[#024059]/25 bg-[#F2BF27]/25 px-3 py-2 text-sm font-medium text-[#024059] transition-colors hover:bg-[#F2BF27]/40"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar aos quartos
            </button>

            <div className="grid grid-cols-1 gap-10 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-8 overflow-hidden rounded-2xl border-2 border-[#F2AB27]/60 bg-[#F2F2F2]"
                >
                  <div className="relative h-[340px] overflow-hidden sm:h-[430px] lg:h-[520px]">
                    <AnimatePresence mode="wait">
                      {activeSlideImage ? (
                        <motion.img
                          key={`${room.id}-${activeSlide}`}
                          initial={{ opacity: 0, scale: 1.03 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.45 }}
                          src={activeSlideImage}
                          alt={`${room.name} - imagem ${activeSlide + 1}`}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <motion.div
                          key={`blank-${room.id}-${activeSlide}`}
                          initial={{ opacity: 0, scale: 1.01 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.45 }}
                          className="absolute inset-0 flex items-center justify-center bg-[#F2F2F2]"
                        >
                          <div className="text-center space-y-3">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-[#024059]/40 text-[#024059]/75">
                              <span className="text-2xl">+</span>
                            </div>
                            <p className="text-sm text-[#024059]/75">Espaço reservado para imagem</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="button"
                      onClick={goToPreviousSlide}
                      className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#F2F2F2]/45 bg-[#024059]/85 text-lg font-semibold text-[#F2F2F2] transition hover:bg-[#024059]"
                      aria-label="Imagem anterior"
                    >
                      &lt;
                    </button>
                    <button
                      type="button"
                      onClick={goToNextSlide}
                      className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#F2F2F2]/45 bg-[#024059]/85 text-lg font-semibold text-[#F2F2F2] transition hover:bg-[#024059]"
                      aria-label="Próxima imagem"
                    >
                      &gt;
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-[#F2F2F2]/35 bg-[#024059]/85 px-4 py-1.5 text-xs font-medium text-[#F2F2F2]">
                      {activeSlide + 1}/{carouselSlides.length}
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center rounded-full border border-[#284003]/35 bg-[#F2BF27]/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#284003]">
                      {room.type}
                    </span>
                    <h1 className="font-display text-3xl font-bold text-[#024059]">{room.name}</h1>
                    {room.petFriendly && (
                      <Badge className="gap-1 bg-[#F2AB27] text-[#024059]">
                        <PawPrint className="h-3 w-3" /> Pet friendly
                      </Badge>
                    )}
                  </div>

                  <p className="mb-8 rounded-xl border border-[#024059]/20 bg-[#F2F2F2] p-4 leading-relaxed text-[#024059]/85">
                    {room.description}
                  </p>

                  <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-lg mb-8 w-fit">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Este quarto está quase lotado para as próximas semanas
                    </span>
                  </div>

                  <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border-2 border-[#F2AB27]/60 bg-[#F2F2F2] p-5">
                      <h3 className="mb-2 font-display font-semibold text-[#024059]">Camas</h3>
                      <p className="text-sm text-[#284003]/80">{room.beds}</p>
                    </div>
                    <div className="rounded-xl border-2 border-[#F2AB27]/60 bg-[#F2F2F2] p-5">
                      <h3 className="mb-2 font-display font-semibold text-[#024059]">Banheiro</h3>
                      <p className="text-sm text-[#284003]/80">{room.bathroom}</p>
                    </div>
                    <div className="rounded-xl border-2 border-[#F2AB27]/60 bg-[#F2F2F2] p-5">
                      <h3 className="mb-2 font-display font-semibold text-[#024059]">Capacidade</h3>
                      <p className="flex items-center gap-1 text-sm text-[#284003]/80">
                        <Users className="h-4 w-4 text-[#024059]" /> Até {room.capacity} pessoas
                      </p>
                    </div>
                  </div>

                  <h3 className="mb-4 font-display text-xl font-semibold text-[#024059]">Comodidades</h3>
                  <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {room.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 rounded-lg border border-[#024059]/18 bg-[#F2BF27]/18 px-3 py-2 text-sm font-medium text-[#284003]"
                      >
                        <Check className="h-4 w-4 text-[#024059]" /> {amenity}
                      </div>
                    ))}
                  </div>

                  <h3 className="mb-4 font-display text-xl font-semibold text-[#024059]">Inclusos</h3>
                  <div className="mb-8 flex flex-wrap gap-2">
                    {room.extras.map((extra) => (
                      <Badge key={extra} className="border border-[#F2AB27]/70 bg-[#F2BF27]/22 text-[#284003]">
                        {extra}
                      </Badge>
                    ))}
                  </div>

                  <h3 className="mb-4 font-display text-xl font-semibold text-[#024059]">Regras</h3>
                  <ul className="mb-8 space-y-2 rounded-xl border border-[#024059]/20 bg-[#F2F2F2] p-4">
                    {room.rules.map((rule) => (
                      <li key={rule} className="text-sm text-[#284003]/88">
                        • {rule}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              <div className="space-y-8 xl:col-span-5">
                <motion.div
                  initial={{ opacity: 0, y: 28, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.16, duration: 0.45, ease: 'easeOut' }}
                  className="rounded-2xl border-2 border-[#F2AB27]/70 bg-[#024059] p-8 text-[#F2F2F2]"
                >
                  <div className="mb-5">
                    <span className="text-sm uppercase tracking-[0.14em] text-[#F2F2F2]/80">A partir de</span>
                    <div className="flex items-baseline gap-1">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={totalPrice}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="text-5xl font-bold leading-none text-[#F2BF27]"
                        >
                          R$ {totalPrice}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-sm text-[#F2F2F2]/80">
                        / {Math.max(nights, 1)} {nights === 1 ? 'noite' : 'noites'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6 space-y-3 rounded-xl border border-[#F2F2F2]/18 bg-[#F2F2F2]/8 p-4 text-sm">
                    <div className="flex justify-between border-b border-[#F2F2F2]/14 pb-2">
                      <span className="text-[#F2F2F2]/75">Check-in</span>
                      <span className="font-medium text-[#F2F2F2]">
                        {booking.checkIn ? format(booking.checkIn, 'dd MMM yyyy', { locale: ptBR }) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#F2F2F2]/14 pb-2">
                      <span className="text-[#F2F2F2]/75">Check-out</span>
                      <span className="font-medium text-[#F2F2F2]">
                        {booking.checkOut ? format(booking.checkOut, 'dd MMM yyyy', { locale: ptBR }) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#F2F2F2]/14 pb-2">
                      <span className="text-[#F2F2F2]/75">Hóspedes</span>
                      <span className="font-medium text-[#F2F2F2]">{booking.guests}</span>
                    </div>
                    {booking.pets && (
                      <div className="flex justify-between">
                        <span className="text-[#F2F2F2]/75">Pets</span>
                        <span className="font-medium text-[#F2F2F2]">Sim</span>
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
                    className="flex h-14 w-full items-center justify-center rounded-xl border border-[#F2AB27] bg-[#F2AB27] text-base font-bold text-[#024059] transition-colors hover:bg-[#F2BF27] disabled:cursor-not-allowed disabled:border-[#F2AB27]/40 disabled:bg-[#F2AB27]/40 disabled:text-[#024059]/70"
                  >
                    Reservar agora
                  </motion.button>

                  <p className="mt-3 text-center text-xs text-[#F2F2F2]/78">
                    Melhor preço garantido · Cancelamento flexível
                  </p>
                </motion.div>

                <motion.section
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24 }}
                  className="rounded-2xl bg-[#E9F2F1] p-4 sm:p-5"
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {galleryImages.map((image, index) => (
                      <motion.button
                        key={`${room.id}-album-${index}`}
                        type="button"
                        onClick={() => {
                          setActiveSlide(index % carouselSlides.length);
                          setExpandedImageIndex(index);
                        }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.03 * index }}
                        className={`group relative overflow-hidden rounded-xl border-2 transition ${
                          activeSlide === index
                            ? 'border-[#F2AB27] ring-2 ring-[#F2AB27]/45'
                            : 'border-[#024059]/20 hover:border-[#024059]/45'
                        } ${index % 5 === 0 ? 'col-span-2 row-span-2 min-h-[230px]' : 'min-h-[140px]'}`}
                        aria-label={`Visualizar foto ${index + 1}`}
                      >
                        <img
                          src={image}
                          alt={`${room.name} - foto ${index + 1}`}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </motion.button>
                    ))}
                  </div>
                </motion.section>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {expandedImageIndex !== null && galleryImages[expandedImageIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setExpandedImageIndex(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Imagem expandida"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-6xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setExpandedImageIndex(null)}
                className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#024059]/90 text-[#F2F2F2] transition hover:bg-[#024059]"
                aria-label="Fechar imagem"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={galleryImages[expandedImageIndex]}
                alt={`${room.name} - imagem expandida ${expandedImageIndex + 1}`}
                className="max-h-[88vh] w-full rounded-xl object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoomDetailPage;
