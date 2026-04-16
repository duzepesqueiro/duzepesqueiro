import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { differenceInDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Header from '@/components/common/layout/Header';
import { rooms } from '@/data/rooms';
import { useBooking } from '@/contexts/BookingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import type { Guest } from '@/types/booking';

const steps = ['Reserva', 'Hospedes', 'Responsavel', 'Revisao'];

type BookingErrors = Record<string, string>;

const createEmptyGuest = (): Guest => ({
  name: '',
  age: 0,
  document: '',
  address: { street: '', number: '', city: '', state: '', zip: '' },
});

const normalizeDigits = (value: string) => value.replace(/\D/g, '');

const formatPhone = (value: string) => {
  const digits = normalizeDigits(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCpf = (value: string) => {
  const digits = normalizeDigits(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const isEmailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const BookingPage = () => {
  const navigate = useNavigate();
  const { booking, setBooking, addReservation } = useBooking();
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<BookingErrors>({});

  const room = rooms.find((r) => r.id === booking.roomId);
  const nights = booking.checkIn && booking.checkOut
    ? Math.max(differenceInDays(booking.checkOut, booking.checkIn), 1)
    : 1;
  const totalPrice = room ? room.pricePerNight * nights : 0;

  useEffect(() => {
    if (step === 1 && booking.guestDetails.length === 0) {
      setBooking((prev) => ({
        ...prev,
        guestDetails: [createEmptyGuest()],
      }));
    }
  }, [booking.guestDetails.length, setBooking, step]);

  if (!room) {
    return (
      <div className="min-h-screen bg-background pt-24 text-center">
        <Header />
        <p className="text-muted-foreground mt-16">Selecione um quarto primeiro.</p>
        <button
          onClick={() => navigate('/hospedagem/rooms')}
          className="btn-gold mt-4 inline-block"
        >
          Ver quartos
        </button>
      </div>
    );
  }


  const clearError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateGuest = (index: number, field: string, value: string | number) => {
    setBooking((prev) => {
      const guestDetails = [...prev.guestDetails];
      const currentGuest = guestDetails[index] ?? createEmptyGuest();

      if (field.startsWith('address.')) {
        const addressField = field.split('.')[1] as keyof Guest['address'];
        guestDetails[index] = {
          ...currentGuest,
          address: { ...currentGuest.address, [addressField]: value },
        };
      } else {
        guestDetails[index] = { ...currentGuest, [field]: value } as Guest;
      }

      return { ...prev, guestDetails };
    });

    clearError(`${index}-${field}`);
  };

  const copyAddress = (index: number) => {
    if (index <= 0) return;

    setBooking((prev) => {
      const source = prev.guestDetails[0];
      const target = prev.guestDetails[index] ?? createEmptyGuest();
      if (!source) return prev;

      const guestDetails = [...prev.guestDetails];
      guestDetails[index] = {
        ...target,
        address: { ...source.address },
      };

      return { ...prev, guestDetails };
    });

    ['street', 'number', 'city', 'state', 'zip'].forEach((field) => {
      clearError(`${index}-address.${field}`);
    });
  };

  const addGuest = () => {
    const maxGuests = Math.max(1, Math.min(room.capacity, booking.guests));

    if (booking.guestDetails.length >= maxGuests) {
      toast({
        title: 'Limite atingido',
        description: `O numero de hospedes ja chegou ao total selecionado para este quarto.`,
        variant: 'destructive',
      });
      return;
    }

    setBooking((prev) => ({
      ...prev,
      guestDetails: [...prev.guestDetails, createEmptyGuest()],
    }));

    clearError('guest-count');
  };

  const validateStep = (targetStep: number): BookingErrors => {
    const errors: BookingErrors = {};

    if (targetStep === 0) {
      if (!booking.checkIn) {
        errors.checkIn = 'Selecione a data de check-in.';
      }

      if (!booking.checkOut) {
        errors.checkOut = 'Selecione a data de check-out.';
      }

      if (booking.checkIn && startOfDay(booking.checkIn) < startOfDay(new Date())) {
        errors.checkIn = 'Check-in nao pode ser em data passada.';
      }

      if (booking.checkIn && booking.checkOut && booking.checkOut <= booking.checkIn) {
        errors.checkOut = 'Check-out precisa ser depois do check-in.';
      }

      if (!Number.isInteger(booking.guests) || booking.guests < 1) {
        errors.guests = 'Informe pelo menos 1 hospede.';
      } else if (booking.guests > room.capacity) {
        errors.guests = `Este quarto aceita no maximo ${room.capacity} hospede(s).`;
      }
    }

    if (targetStep === 1) {
      const expectedGuests = Math.max(booking.guests, 1);

      if (booking.guestDetails.length < expectedGuests) {
        errors['guest-count'] = `Faltam ${expectedGuests - booking.guestDetails.length} hospede(s) para completar a reserva.`;
      }

      if (booking.guestDetails.length > expectedGuests) {
        errors['guest-count'] = 'A quantidade de hospedes precisa ser ajustada na etapa anterior.';
      }

      booking.guestDetails.forEach((guest, index) => {
        if (!guest.name.trim()) {
          errors[`${index}-name`] = 'Nome obrigatorio.';
        }
        if (!guest.age || guest.age <= 0) {
          errors[`${index}-age`] = 'Idade invalida.';
        }
        if (!guest.address.street.trim()) {
          errors[`${index}-address.street`] = 'Rua obrigatoria.';
        }
        if (!guest.address.number.trim()) {
          errors[`${index}-address.number`] = 'Numero obrigatorio.';
        }
        if (!guest.address.city.trim()) {
          errors[`${index}-address.city`] = 'Cidade obrigatoria.';
        }
        if (!guest.address.state.trim()) {
          errors[`${index}-address.state`] = 'Estado obrigatorio.';
        }
        if (!guest.address.zip.trim()) {
          errors[`${index}-address.zip`] = 'CEP obrigatorio.';
        }
      });
    }

    if (targetStep === 2) {
      if (!booking.responsible.name.trim()) {
        errors['responsible-name'] = 'Nome obrigatorio.';
      }

      if (!isEmailValid(booking.responsible.email)) {
        errors['responsible-email'] = 'Email invalido.';
      }

      const phoneDigits = normalizeDigits(booking.responsible.phone);
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        errors['responsible-phone'] = 'Telefone invalido.';
      }

      const cpfDigits = normalizeDigits(booking.responsible.cpf);
      if (cpfDigits.length !== 11) {
        errors['responsible-cpf'] = 'CPF completo obrigatorio.';
      }
    }

    return errors;
  };

  const validateAll = () => ({
    ...validateStep(0),
    ...validateStep(1),
    ...validateStep(2),
  });

  const getFirstInvalidStep = (errors: BookingErrors) => {
    const keys = Object.keys(errors);
    if (keys.some((key) => ['checkIn', 'checkOut', 'guests'].includes(key))) {
      return 0;
    }
    if (keys.some((key) => key === 'guest-count' || /^\d+-/.test(key))) {
      return 1;
    }
    if (keys.some((key) => key.startsWith('responsible-'))) {
      return 2;
    }
    return 3;
  };

  const next = () => {
    const errors = step === 3 ? validateAll() : validateStep(step);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast({
        title: 'Nao foi possivel continuar',
        description: Object.values(errors)[0],
        variant: 'destructive',
      });
      if (step === 3) {
        setStep(getFirstInvalidStep(errors));
      }
      return;
    }

    setFieldErrors({});

    if (step < 3) {
      setStep((prev) => prev + 1);
      return;
    }

    addReservation({
      id: `RES-${Date.now().toString(36).toUpperCase()}`,
      bookingData: booking,
      paymentData: { method: 'card', status: 'success' },
      status: 'confirmed',
      createdAt: new Date(),
      totalPrice,
    });
    navigate('/hospedagem/confirmation');
  };

  const back = () => {
    if (step > 0) {
      setFieldErrors({});
      setStep((prev) => prev - 1);
    }
  };

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <p className="mt-1 text-xs text-destructive">{fieldErrors[key]}</p>
    ) : null;

  const fieldClass = (key: string) =>
    fieldErrors[key] ? 'border-destructive focus-visible:ring-destructive' : '';


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
                <span
                  className={`text-sm hidden sm:inline ${
                    i <= step ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {s}
                </span>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />
                )}
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
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    Dados da Reserva
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Check-in</Label>
                      <Input
                        type="date"
                        value={booking.checkIn ? format(booking.checkIn, 'yyyy-MM-dd') : ''}
                        onChange={(e) =>
                          setBooking((prev) => ({
                            ...prev,
                            checkIn: e.target.value ? new Date(`${e.target.value}T12:00:00`) : null,
                          }))
                        }
                        className={fieldClass('checkIn')}
                      />
                      {fieldError('checkIn')}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Check-out</Label>
                      <Input
                        type="date"
                        value={booking.checkOut ? format(booking.checkOut, 'yyyy-MM-dd') : ''}
                        onChange={(e) =>
                          setBooking((prev) => ({
                            ...prev,
                            checkOut: e.target.value ? new Date(`${e.target.value}T12:00:00`) : null,
                          }))
                        }
                        className={fieldClass('checkOut')}
                      />
                      {fieldError('checkOut')}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Numero de hospedes</Label>
                    <Input
                      type="number"
                      min={1}
                      max={room.capacity}
                      value={booking.guests}
                      onChange={(e) =>
                        setBooking((prev) => ({
                          ...prev,
                          guests: Number(e.target.value),
                        }))
                      }
                      className={fieldClass('guests')}
                    />
                    {fieldError('guests')}
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={booking.pets}
                      onCheckedChange={(value) =>
                        setBooking((prev) => ({ ...prev, pets: value }))
                      }
                    />
                    <Label className="text-foreground">Levarei animais</Label>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Observacoes</Label>
                    <Textarea
                      value={booking.observations}
                      onChange={(e) =>
                        setBooking((prev) => ({ ...prev, observations: e.target.value }))
                      }
                      placeholder="Alguma solicitacao especial?"
                    />
                  </div>
                </div>
              )}

              {/* STEP 1: Guest details */}
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    Dados dos Hospedes
                  </h2>
                  {fieldError('guest-count')}
                  {booking.guestDetails.map((guest, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-border rounded-xl p-5 space-y-4"
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-foreground">Hospede {i + 1}</h3>
                        {i > 0 && (
                          <button
                            onClick={() => copyAddress(i)}
                            className="text-xs text-primary hover:underline"
                          >
                            Copiar endereco do 1o hospede
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <Label className="text-muted-foreground">Nome completo</Label>
                          <Input
                            value={guest.name}
                            onChange={(e) => updateGuest(i, 'name', e.target.value)}
                            className={fieldClass(`${i}-name`)}
                          />
                          {fieldError(`${i}-name`)}
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Idade</Label>
                          <Input
                            type="number"
                            min={0}
                            value={guest.age || ''}
                            onChange={(e) => updateGuest(i, 'age', Number(e.target.value))}
                            className={fieldClass(`${i}-age`)}
                          />
                          {fieldError(`${i}-age`)}
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Documento (opcional)</Label>
                          <Input
                            value={guest.document || ''}
                            onChange={(e) => updateGuest(i, 'document', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <Label className="text-muted-foreground">Rua</Label>
                          <Input
                            value={guest.address.street}
                            onChange={(e) => updateGuest(i, 'address.street', e.target.value)}
                            className={fieldClass(`${i}-address.street`)}
                          />
                          {fieldError(`${i}-address.street`)}
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Numero</Label>
                          <Input
                            value={guest.address.number}
                            onChange={(e) => updateGuest(i, 'address.number', e.target.value)}
                            className={fieldClass(`${i}-address.number`)}
                          />
                          {fieldError(`${i}-address.number`)}
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Cidade</Label>
                          <Input
                            value={guest.address.city}
                            onChange={(e) => updateGuest(i, 'address.city', e.target.value)}
                            className={fieldClass(`${i}-address.city`)}
                          />
                          {fieldError(`${i}-address.city`)}
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Estado</Label>
                          <Input
                            value={guest.address.state}
                            onChange={(e) => updateGuest(i, 'address.state', e.target.value)}
                            className={fieldClass(`${i}-address.state`)}
                          />
                          {fieldError(`${i}-address.state`)}
                        </div>
                        <div>
                          <Label className="text-muted-foreground">CEP</Label>
                          <Input
                            value={guest.address.zip}
                            onChange={(e) =>
                              updateGuest(
                                i,
                                'address.zip',
                                e.target.value.replace(/\D/g, '').slice(0, 8)
                              )
                            }
                            className={fieldClass(`${i}-address.zip`)}
                            placeholder="00000000"
                          />
                          {fieldError(`${i}-address.zip`)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <button
                    onClick={addGuest}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    + Adicionar hospede
                  </button>
                </div>
              )}

              {/* STEP 2: Responsible */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    Responsavel pela Reserva
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Nome completo</Label>
                      <Input
                        value={booking.responsible.name}
                        onChange={(e) =>
                          setBooking((prev) => ({
                            ...prev,
                            responsible: { ...prev.responsible, name: e.target.value },
                          }))
                        }
                        className={fieldClass('responsible-name')}
                      />
                      {fieldError('responsible-name')}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <Input
                        type="email"
                        value={booking.responsible.email}
                        onChange={(e) =>
                          setBooking((prev) => ({
                            ...prev,
                            responsible: { ...prev.responsible, email: e.target.value },
                          }))
                        }
                        className={fieldClass('responsible-email')}
                      />
                      {fieldError('responsible-email')}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Telefone</Label>
                      <Input
                        value={booking.responsible.phone}
                        onChange={(e) =>
                          setBooking((prev) => ({
                            ...prev,
                            responsible: {
                              ...prev.responsible,
                              phone: formatPhone(e.target.value),
                            },
                          }))
                        }
                        placeholder="(00) 00000-0000"
                        className={fieldClass('responsible-phone')}
                      />
                      {fieldError('responsible-phone')}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">CPF</Label>
                      <Input
                        value={booking.responsible.cpf}
                        onChange={(e) =>
                          setBooking((prev) => ({
                            ...prev,
                            responsible: {
                              ...prev.responsible,
                              cpf: formatCpf(e.target.value),
                            },
                          }))
                        }
                        placeholder="000.000.000-00"
                        className={fieldClass('responsible-cpf')}
                      />
                      {fieldError('responsible-cpf')}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Review */}
              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    Revisao da Reserva
                  </h2>

                  <div className="space-y-4">
                    <div className="bg-muted rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Quarto
                      </h3>
                      <p className="text-foreground font-medium">{room.name}</p>
                    </div>

                    <div className="bg-muted rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Datas
                      </h3>
                      <p className="text-foreground">
                        {booking.checkIn
                          ? format(booking.checkIn, 'dd MMM yyyy', { locale: ptBR })
                          : '-'}{' '}
                        -{' '}
                        {booking.checkOut
                          ? format(booking.checkOut, 'dd MMM yyyy', { locale: ptBR })
                          : '-'}
                      </p>
                      <p className="text-sm text-muted-foreground">{Math.max(nights, 1)} noite(s)</p>
                    </div>

                    <div className="bg-muted rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Hospedes ({booking.guestDetails.length})
                      </h3>
                      {booking.guestDetails.map((g, i) => (
                        <p key={i} className="text-foreground text-sm">
                          {g.name || `Hospede ${i + 1}`} - {g.age} anos
                        </p>
                      ))}
                      {booking.pets && <p className="text-sm text-accent font-medium mt-1">Com pet</p>}
                    </div>

                    <div className="bg-muted rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Responsavel
                      </h3>
                      <p className="text-foreground text-sm">{booking.responsible.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {booking.responsible.email} - {booking.responsible.phone}
                      </p>
                    </div>

                    <div className="rounded-xl p-5" style={{ background: 'var(--gradient-gold)' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-primary-foreground font-semibold text-lg">Total</span>
                        <span className="text-primary-foreground font-bold text-2xl">R$ {totalPrice}</span>
                      </div>
                      <p className="text-primary-foreground/80 text-sm mt-1">
                        {Math.max(nights, 1)} noite(s) x R$ {room.pricePerNight}
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
                  {step === 3 ? 'Realizar reserva' : 'Proximo'} <ChevronRight className="h-4 w-4" />
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