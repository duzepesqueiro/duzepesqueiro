import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, differenceInDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Header from '@/components/common/layout/Header';
import { rooms } from '@/data/rooms';
import { useBooking } from '@/contexts/BookingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import type { BookingData, Guest, Room } from '@/types/booking';

const steps = ['Reserva', 'Hospedes', 'Responsavel', 'Revisao'];

type BookingErrors = Record<string, string>;

type BookingLocationState = {
  room?: Room;
  booking?: Pick<BookingData, 'checkIn' | 'checkOut' | 'guests' | 'pets'>;
};

const createEmptyGuest = (): Guest => ({
  name: '',
  age: 0,
  document: '',
  address: { street: '', number: '', city: '', state: '', zip: '' },
});

const normalizeDigits = (value: string) => value.replace(/\D/g, '');

const FULL_NAME_REGEX = /^[A-Za-zÀ-ÿ]+(?:[ '\-][A-Za-zÀ-ÿ]+)+$/;
const STREET_REGEX = /^[A-Za-zÀ-ÿ0-9]+(?:[ '\-][A-Za-zÀ-ÿ0-9]+)+$/;
const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const CEP_REGEX = /^\d{5}-\d{3}$/;
const PLATE_REGEX = /^(?:[A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z0-9]\d{2})$/;

const BRAZIL_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
] as const;

const formatCep = (value: string) => {
  const digits = normalizeDigits(value).slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
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

const isFullNameValid = (value: string) => FULL_NAME_REGEX.test(value.trim());
const isStreetValid = (value: string) => STREET_REGEX.test(value.trim());
const isCpfValid = (value: string) => CPF_REGEX.test(value.trim());
const isCepValid = (value: string) => CEP_REGEX.test(value.trim());
const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
const formatPlate = (value: string) => {
  const normalized = normalizePlate(value);
  if (normalized.length === 7 && /^[A-Z]{3}\d{4}$/.test(normalized)) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  }
  return normalized;
};
const isPlateValid = (value: string) => PLATE_REGEX.test(normalizePlate(value));
const isValidDateValue = (value: Date | null): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());
const parseDateInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return isValidDateValue(parsed) ? parsed : null;
};
const formatDateValue = (value: Date | null, pattern: string) =>
  isValidDateValue(value) ? format(value, pattern, { locale: ptBR }) : '';

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { booking, setBooking, addReservation } = useBooking();
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<BookingErrors>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const locationState = location.state as BookingLocationState | null | undefined;
  const locationRoom = locationState?.room;
  const bookingSeed = locationState?.booking;
  const room = locationRoom ?? rooms.find((r) => r.id === booking.roomId);
  const checkInDate = isValidDateValue(booking.checkIn) ? startOfDay(booking.checkIn) : null;
  const checkOutDate = isValidDateValue(booking.checkOut) ? startOfDay(booking.checkOut) : null;
  const nights = checkInDate && checkOutDate
    ? Math.max(differenceInDays(checkOutDate, checkInDate), 1)
    : 1;
  const totalPrice = room ? room.pricePerNight * nights : 0;
  const selectedResponsibleGuest =
    booking.responsibleGuestIndex !== null
      ? booking.guestDetails[booking.responsibleGuestIndex] ?? null
      : null;
  const selectedResponsibleAddress = selectedResponsibleGuest
    ? `${selectedResponsibleGuest.address.street}, ${selectedResponsibleGuest.address.number} - ${selectedResponsibleGuest.address.city}/${selectedResponsibleGuest.address.state} · CEP ${selectedResponsibleGuest.address.zip}`
    : '';

  useEffect(() => {
    if (!room) return;

    setBooking((prev) => ({
      ...prev,
      roomId: room.id,
      checkIn: bookingSeed?.checkIn ?? prev.checkIn,
      checkOut: bookingSeed?.checkOut ?? prev.checkOut,
      guests: bookingSeed?.guests ?? prev.guests,
      pets: bookingSeed?.pets ?? prev.pets,
    }));
  }, [bookingSeed, room, setBooking]);

  useEffect(() => {
    if (step === 1 && booking.guestDetails.length === 0) {
      setBooking((prev) => ({
        ...prev,
        guestDetails: [createEmptyGuest()],
      }));
    }
  }, [booking.guestDetails.length, setBooking, step]);

  useEffect(() => {
    if (
      booking.responsibleGuestIndex !== null &&
      booking.responsibleGuestIndex >= booking.guestDetails.length
    ) {
      setBooking((prev) => ({
        ...prev,
        responsibleGuestIndex: null,
      }));
    }
  }, [booking.guestDetails.length, booking.responsibleGuestIndex, setBooking]);

  if (!room) {
    return (
      <div className="relative min-h-screen bg-background">
        <Header open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className={`relative z-10 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <div className="pt-24 pb-16 px-4 text-center">
            <p className="text-muted-foreground mt-16">Selecione um quarto primeiro.</p>
            <button
              onClick={() => navigate('/hospedagem/rooms')}
              className="btn-gold mt-4 inline-block"
            >
              Ver quartos
            </button>
          </div>
        </div>
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

  const selectResponsibleGuest = (index: number) => {
    setBooking((prev) => ({
      ...prev,
      responsibleGuestIndex: index,
    }));
    clearError('responsible-guest');
  };

  const updateVehiclePlate = (value: string) => {
    setBooking((prev) => ({
      ...prev,
      vehiclePlate: formatPlate(value),
    }));
    clearError('vehiclePlate');
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
    const today = startOfDay(new Date());

    if (targetStep === 0) {
      if (booking.checkIn && !isValidDateValue(booking.checkIn)) {
        errors.checkIn = 'Selecione uma data valida.';
      } else if (!booking.checkIn) {
        errors.checkIn = 'Selecione a data de check-in.';
      }

      if (booking.checkOut && !isValidDateValue(booking.checkOut)) {
        errors.checkOut = 'Selecione uma data valida.';
      } else if (!booking.checkOut) {
        errors.checkOut = 'Selecione a data de check-out.';
      }

      if (checkInDate && checkInDate < today) {
        errors.checkIn = 'Check-in nao pode ser em data passada.';
      }

      if (checkInDate && checkOutDate) {
        const stayDays = differenceInDays(checkOutDate, checkInDate);

        if (stayDays <= 0) {
          errors.checkOut = 'Check-out precisa ser depois do check-in.';
        } else if (stayDays > 15) {
          errors.checkOut = 'A hospedagem pode ter no máximo 15 dias.';
        }
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
        } else if (!isFullNameValid(guest.name)) {
          errors[`${index}-name`] = 'Informe nome e sobrenome.';
        }
        if (!guest.age || guest.age <= 0) {
          errors[`${index}-age`] = 'Idade invalida.';
        } else if (index === 0 && guest.age < 18) {
          errors[`${index}-age`] = 'O hospede principal precisa ter pelo menos 18 anos.';
        }
        if (!guest.address.street.trim()) {
          errors[`${index}-address.street`] = 'Rua obrigatoria.';
        } else if (!isStreetValid(guest.address.street)) {
          errors[`${index}-address.street`] = 'Informe rua e complemento com pelo menos duas palavras.';
        }
        if (!guest.address.number.trim()) {
          errors[`${index}-address.number`] = 'Numero obrigatorio.';
        }
        if (!guest.address.city.trim()) {
          errors[`${index}-address.city`] = 'Cidade obrigatoria.';
        }
        if (!guest.address.state.trim()) {
          errors[`${index}-address.state`] = 'Estado obrigatorio.';
        } else if (!BRAZIL_STATES.some((state) => state.value === guest.address.state)) {
          errors[`${index}-address.state`] = 'Selecione um estado valido.';
        }
        if (!guest.address.zip.trim()) {
          errors[`${index}-address.zip`] = 'CEP obrigatorio.';
        } else if (!isCepValid(guest.address.zip)) {
          errors[`${index}-address.zip`] = 'CEP invalido. Use 00000-000.';
        }
        if (!guest.document.trim()) {
          errors[`${index}-document`] = 'CPF obrigatorio.';
        } else if (!isCpfValid(guest.document)) {
          errors[`${index}-document`] = 'CPF invalido.';
        }
      });
    }

    if (targetStep === 2) {
      if (booking.responsibleGuestIndex === null) {
        errors['responsible-guest'] = 'Selecione o hospede responsavel.';
      } else if (!booking.guestDetails[booking.responsibleGuestIndex]) {
        errors['responsible-guest'] = 'Selecione um hospede valido.';
      }

      if (!booking.vehiclePlate.trim()) {
        errors['vehiclePlate'] = 'Informe a placa do veiculo.';
      } else if (!isPlateValid(booking.vehiclePlate)) {
        errors['vehiclePlate'] = 'Placa invalida. Use ABC1234 ou ABC1D23.';
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
    if (keys.some((key) => key.startsWith('responsible-') || key === 'vehiclePlate')) {
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
      return;
    }

    navigate(`/hospedagem/rooms/${room.id}`, { state: { room } });
  };

  const todayValue = format(startOfDay(new Date()), 'yyyy-MM-dd');
  const checkOutMinValue = checkInDate ? format(addDays(checkInDate, 1), 'yyyy-MM-dd') : todayValue;
  const checkOutMaxValue = checkInDate
    ? format(addDays(checkInDate, 15), 'yyyy-MM-dd')
    : format(addDays(startOfDay(new Date()), 15), 'yyyy-MM-dd');

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
    <div className="relative min-h-screen bg-background">
      <Header open={sidebarOpen} setOpen={setSidebarOpen} />

      <main className={`relative z-10 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="pt-24 pb-16 px-4">
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

          <div className="mb-8 rounded-2xl border border-border/70 bg-card p-5 md:p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">{room.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{room.description}</p>
              </div>

              <div className="rounded-xl bg-muted px-4 py-3 md:text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo</p>
                <p className="text-sm text-foreground mt-1">
                  {formatDateValue(booking.checkIn, 'dd MMM yyyy') || 'Check-in não definido'}
                </p>
                <p className="text-sm text-foreground">
                  {formatDateValue(booking.checkOut, 'dd MMM yyyy') || 'Check-out não definido'}
                </p>
                <p className="text-sm text-foreground">{booking.guests} hóspede(s)</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Restrições</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {room.rules.map((rule) => (
                  <Badge key={rule} variant="secondary">
                    {rule}
                  </Badge>
                ))}
                <Badge variant="secondary">Check-in a partir de hoje</Badge>
                <Badge variant="secondary">Estadia máxima de 15 dias</Badge>
                {booking.pets ? <Badge className="bg-primary text-primary-foreground">Com pet</Badge> : null}
              </div>
            </div>
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
                        value={formatDateValue(booking.checkIn, 'yyyy-MM-dd')}
                        min={todayValue}
                        onChange={(e) =>
                          setBooking((prev) => ({
                            ...prev,
                            checkIn: parseDateInput(e.target.value),
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
                        value={formatDateValue(booking.checkOut, 'yyyy-MM-dd')}
                        min={checkOutMinValue}
                        max={checkOutMaxValue}
                        onChange={(e) =>
                          setBooking((prev) => ({
                            ...prev,
                            checkOut: parseDateInput(e.target.value),
                          }))
                        }
                        className={fieldClass('checkOut')}
                      />
                      {fieldError('checkOut')}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check-in não pode ser antes de hoje e a estadia tem limite de 15 dias.
                  </p>
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
                            placeholder="Nome e sobrenome"
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
                          <Label className="text-muted-foreground">CPF</Label>
                          <Input
                            value={guest.document || ''}
                            onChange={(e) => updateGuest(i, 'document', formatCpf(e.target.value))}
                            className={fieldClass(`${i}-document`)}
                            placeholder="000.000.000-00"
                            inputMode="numeric"
                          />
                          {fieldError(`${i}-document`)}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <Label className="text-muted-foreground">Rua</Label>
                          <Input
                            value={guest.address.street}
                            onChange={(e) => updateGuest(i, 'address.street', e.target.value)}
                            className={fieldClass(`${i}-address.street`)}
                            placeholder="Rua e complemento"
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
                          <Select value={guest.address.state} onValueChange={(value) => updateGuest(i, 'address.state', value)}>
                            <SelectTrigger className={fieldClass(`${i}-address.state`)}>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {BRAZIL_STATES.map((state) => (
                                <SelectItem key={state.value} value={state.value}>
                                  {state.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldError(`${i}-address.state`)}
                        </div>
                        <div>
                          <Label className="text-muted-foreground">CEP</Label>
                          <Input
                            value={guest.address.zip}
                            onChange={(e) =>
                              updateGuest(i, 'address.zip', formatCep(e.target.value))
                            }
                            className={fieldClass(`${i}-address.zip`)}
                            placeholder="00000-000"
                            inputMode="numeric"
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
                    Responsavel pela Reserva e veiculo
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <Label className="text-muted-foreground">Selecione o hospede responsavel *</Label>
                      <span className="text-xs text-muted-foreground">Clique em um card para carregar os dados</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {booking.guestDetails.map((guest, i) => {
                        const isSelected = booking.responsibleGuestIndex === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => selectResponsibleGuest(i)}
                            className={`rounded-xl border p-4 text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border bg-card hover:border-primary/50 hover:bg-muted/60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground">
                                  {guest.name || `Hospede ${i + 1}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {guest.age} anos · CPF {guest.document || '--'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {guest.address.city || 'cidade nao informada'} / {guest.address.state || '--'}
                                </p>
                              </div>
                              {isSelected ? (
                                <Badge className="shrink-0 bg-primary text-primary-foreground">Selecionado</Badge>
                              ) : (
                                <span className="text-xs font-medium text-muted-foreground shrink-0">Selecionar</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {fieldError('responsible-guest')}
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-foreground">Dados carregados do hospede escolhido</h3>
                        <p className="text-sm text-muted-foreground">
                          Essas informacoes sao puxadas automaticamente do hospede selecionado.
                        </p>
                      </div>
                      {selectedResponsibleGuest && (
                        <Badge variant="secondary">Carregado</Badge>
                      )}
                    </div>

                    {selectedResponsibleGuest ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-muted p-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</p>
                          <p className="text-sm font-medium text-foreground break-words">{selectedResponsibleGuest.name}</p>
                        </div>
                        <div className="rounded-xl bg-muted p-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">CPF</p>
                          <p className="text-sm font-medium text-foreground break-words">{selectedResponsibleGuest.document}</p>
                        </div>
                        <div className="rounded-xl bg-muted p-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Idade</p>
                          <p className="text-sm font-medium text-foreground break-words">{selectedResponsibleGuest.age} anos</p>
                        </div>
                        <div className="rounded-xl bg-muted p-3 md:col-span-2">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Endereco</p>
                          <p className="text-sm font-medium text-foreground break-words">{selectedResponsibleAddress}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Selecione um hospede acima para carregar nome, CPF, idade e endereco.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Placa do veiculo *</Label>
                      <Input
                        value={booking.vehiclePlate}
                        onChange={(e) => updateVehiclePlate(e.target.value)}
                        className={fieldClass('vehiclePlate')}
                        placeholder="ABC1234 ou ABC1D23"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                      />
                      {fieldError('vehiclePlate')}
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
                        {formatDateValue(booking.checkIn, 'dd MMM yyyy') || '-'}{' '}
                        -{' '}
                        {formatDateValue(booking.checkOut, 'dd MMM yyyy') || '-'}
                      </p>
                      <p className="text-sm text-muted-foreground">{Math.max(nights, 1)} noite(s)</p>
                    </div>

                    <div className="bg-muted rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Hospedes ({booking.guestDetails.length})
                      </h3>
                      {booking.guestDetails.map((g, i) => (
                        <div key={i} className="text-foreground text-sm mb-2 last:mb-0">
                          <p className="font-medium">{g.name || `Hospede ${i + 1}`}</p>
                          <p className="text-muted-foreground">
                            {g.age} anos · CPF: {g.document} · {g.address.city || 'cidade não informada'} / {g.address.state || '--'}
                          </p>
                        </div>
                      ))}
                      {booking.pets && <p className="text-sm text-accent font-medium mt-1">Com pet</p>}
                    </div>

                    <div className="bg-muted rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Responsavel
                      </h3>
                      {selectedResponsibleGuest ? (
                        <div className="space-y-1 text-sm">
                          <p className="text-foreground font-medium">
                            {selectedResponsibleGuest.name}
                          </p>
                          <p className="text-muted-foreground">
                            {selectedResponsibleGuest.age} anos · CPF: {selectedResponsibleGuest.document}
                          </p>
                          <p className="text-muted-foreground">
                            {selectedResponsibleAddress}
                          </p>
                          <p className="text-muted-foreground">
                            Placa do veiculo: {booking.vehiclePlate || '--'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Hospede responsavel nao selecionado.</p>
                      )}
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
                  type="button"
                  onClick={back}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
        </div>
      </main>
    </div>
  );
};

export default BookingPage;
