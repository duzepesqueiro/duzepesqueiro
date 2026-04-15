import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Header from '@/components/common/layout/Header';
import { rooms } from '@/data/rooms';
import { useBooking } from '@/contexts/BookingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Guest } from '@/types/booking';

const steps = ['Reserva', 'Hóspedes', 'Responsável', 'Revisão'];

const emptyGuest: Guest = {
  name: '', age: 0, document: '',
  address: { street: '', number: '', city: '', state: '', zip: '' },
};

const BookingPage = () => {
  const navigate = useNavigate();
  const { booking, setBooking, addReservation } = useBooking();
  const [step, setStep] = useState(0);

  const room = rooms.find(r => r.id === booking.roomId);
  const nights = booking.checkIn && booking.checkOut ? differenceInDays(booking.checkOut, booking.checkIn) : 1;
  const totalPrice = room ? room.pricePerNight * Math.max(nights, 1) : 0;

  if (!room) {
    return (
      <div className="min-h-screen bg-background pt-24 text-center">
        <Header />
        <p className="text-muted-foreground mt-16">Selecione um quarto primeiro.</p>
        <button onClick={() => navigate('/hospedagem/rooms')} className="btn-gold mt-4 inline-block">Ver quartos</button>
      </div>
    );
  }

  const next = () => {
    if (step < 3) setStep(step + 1);
    else {
      addReservation({
        id: `RES-${Date.now().toString(36).toUpperCase()}`,
        bookingData: booking,
        paymentData: { method: 'card', status: 'success' },
        status: 'confirmed',
        createdAt: new Date(),
        totalPrice,
      });
      navigate('/hospedagem/confirmation');
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  // Initialize guest details if empty
  if (step === 1 && booking.guestDetails.length === 0) {
    setBooking(prev => ({
      ...prev,
      guestDetails: [{ ...emptyGuest }],
    }));
  }

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Stepper */}
          <div className="flex items-center justify-center mb-10 gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    i <= step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-sm hidden sm:inline ${i <= step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s}
                </span>
                {i < steps.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="bg-card rounded-2xl p-6 md:p-8"
                style={{ boxShadow: 'var(--shadow-elevated)' }}
              >
                {/* STEP 0: Booking details */}
                {step === 0 && (
                  <div className="space-y-6">
                    <h2 className="font-display text-2xl font-bold text-foreground">Dados da Reserva</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Check-in</Label>
                        <Input
                          type="date"
                          value={booking.checkIn ? format(booking.checkIn, 'yyyy-MM-dd') : ''}
                          onChange={e => setBooking(prev => ({ ...prev, checkIn: e.target.value ? new Date(e.target.value + 'T12:00:00') : null }))}
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Check-out</Label>
                        <Input
                          type="date"
                          value={booking.checkOut ? format(booking.checkOut, 'yyyy-MM-dd') : ''}
                          onChange={e => setBooking(prev => ({ ...prev, checkOut: e.target.value ? new Date(e.target.value + 'T12:00:00') : null }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Nº de hóspedes</Label>
                      <Input
                        type="number"
                        min={1}
                        max={room.capacity}
                        value={booking.guests}
                        onChange={e => setBooking(prev => ({ ...prev, guests: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={booking.pets}
                        onCheckedChange={v => setBooking(prev => ({ ...prev, pets: v }))}
                      />
                      <Label className="text-foreground">Levarei animais</Label>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Observações</Label>
                      <Textarea
                        value={booking.observations}
                        onChange={e => setBooking(prev => ({ ...prev, observations: e.target.value }))}
                        placeholder="Alguma solicitação especial?"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 1: Guest details */}
                {step === 1 && (
                  <div className="space-y-6">
                    <h2 className="font-display text-2xl font-bold text-foreground">Dados dos Hóspedes</h2>
                    {booking.guestDetails.map((guest, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-border rounded-xl p-5 space-y-4"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-foreground">Hóspede {i + 1}</h3>
                          {i > 0 && (
                            <button
                              onClick={() => copyAddress(i)}
                              className="text-xs text-primary hover:underline"
                            >
                              Copiar endereço do 1º hóspede
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <Label className="text-muted-foreground">Nome completo</Label>
                            <Input value={guest.name} onChange={e => updateGuest(i, 'name', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Idade</Label>
                            <Input type="number" min={0} value={guest.age || ''} onChange={e => updateGuest(i, 'age', Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Documento (opcional)</Label>
                            <Input value={guest.document || ''} onChange={e => updateGuest(i, 'document', e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <Label className="text-muted-foreground">Rua</Label>
                            <Input value={guest.address.street} onChange={e => updateGuest(i, 'address.street', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Número</Label>
                            <Input value={guest.address.number} onChange={e => updateGuest(i, 'address.number', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Cidade</Label>
                            <Input value={guest.address.city} onChange={e => updateGuest(i, 'address.city', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Estado</Label>
                            <Input value={guest.address.state} onChange={e => updateGuest(i, 'address.state', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-muted-foreground">CEP</Label>
                            <Input
                              value={guest.address.zip}
                              onChange={e => updateGuest(i, 'address.zip', e.target.value.replace(/\D/g, '').slice(0, 8))}
                              placeholder="00000000"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <button
                      onClick={addGuest}
                      className="text-sm text-primary font-medium hover:underline"
                    >
                      + Adicionar hóspede
                    </button>
                  </div>
                )}

                {/* STEP 2: Responsible */}
                {step === 2 && (
                  <div className="space-y-6">
                    <h2 className="font-display text-2xl font-bold text-foreground">Responsável pela Reserva</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">Nome completo</Label>
                        <Input
                          value={booking.responsible.name}
                          onChange={e => setBooking(prev => ({ ...prev, responsible: { ...prev.responsible, name: e.target.value } }))}
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <Input
                          type="email"
                          value={booking.responsible.email}
                          onChange={e => setBooking(prev => ({ ...prev, responsible: { ...prev.responsible, email: e.target.value } }))}
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Telefone</Label>
                        <Input
                          value={booking.responsible.phone}
                          onChange={e => setBooking(prev => ({ ...prev, responsible: { ...prev.responsible, phone: formatPhone(e.target.value) } }))}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground">CPF</Label>
                        <Input
                          value={booking.responsible.cpf}
                          onChange={e => setBooking(prev => ({ ...prev, responsible: { ...prev.responsible, cpf: formatCpf(e.target.value) } }))}
                          placeholder="000.000.000-00"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Review */}
                {step === 3 && (
                  <div className="space-y-6">
                    <h2 className="font-display text-2xl font-bold text-foreground">Revisão da Reserva</h2>

                    <div className="space-y-4">
                      <div className="bg-muted rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quarto</h3>
                        <p className="text-foreground font-medium">{room.name}</p>
                      </div>

                      <div className="bg-muted rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Datas</h3>
                        <p className="text-foreground">
                          {booking.checkIn ? format(booking.checkIn, 'dd MMM yyyy', { locale: ptBR }) : '—'} →{' '}
                          {booking.checkOut ? format(booking.checkOut, 'dd MMM yyyy', { locale: ptBR }) : '—'}
                        </p>
                        <p className="text-sm text-muted-foreground">{Math.max(nights, 1)} noite(s)</p>
                      </div>

                      <div className="bg-muted rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hóspedes ({booking.guestDetails.length})</h3>
                        {booking.guestDetails.map((g, i) => (
                          <p key={i} className="text-foreground text-sm">{g.name || `Hóspede ${i + 1}`} — {g.age} anos</p>
                        ))}
                        {booking.pets && <p className="text-sm text-accent font-medium mt-1">🐾 Com pet</p>}
                      </div>

                      <div className="bg-muted rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Responsável</h3>
                        <p className="text-foreground text-sm">{booking.responsible.name}</p>
                        <p className="text-muted-foreground text-sm">{booking.responsible.email} · {booking.responsible.phone}</p>
                      </div>

                      <div className="rounded-xl p-5" style={{ background: 'var(--gradient-gold)' }}>
                        <div className="flex justify-between items-center">
                          <span className="text-primary-foreground font-semibold text-lg">Total</span>
                          <span className="text-primary-foreground font-bold text-2xl">R$ {totalPrice}</span>
                        </div>
                        <p className="text-primary-foreground/80 text-sm mt-1">
                          {Math.max(nights, 1)} noite(s) × R$ {room.pricePerNight}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                  <button
                    onClick={back}
                    disabled={step === 0}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={next}
                    className="btn-gold flex items-center gap-1 text-sm"
                  >
                    {step === 3 ? 'Realizar reserva' : 'Próximo'} <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default BookingPage;
