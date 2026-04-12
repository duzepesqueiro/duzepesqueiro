import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { differenceInCalendarDays } from 'date-fns';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const initialGuest = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
};

const getDateTimeIso = (date, time) => {
  if (!date || !time) {
    return null;
  }
  return new Date(`${date}T${time}:00`).toISOString();
};

const CreateManualReservationModal = ({ isOpen, onClose, chalets, onCreate }) => {
  const [values, setValues] = useState({
    chaletId: '',
    checkInDate: '',
    checkInTime: '14:00',
    checkOutDate: '',
    checkOutTime: '12:00',
    notes: '',
    guests: [{ ...initialGuest }],
  });
  const [errors, setErrors] = useState({});

  const portalElement = useMemo(() => {
    if (typeof document === 'undefined') {
      return null;
    }
    const existingPortal = document.getElementById('hosting-modal-portal');
    if (existingPortal) {
      return existingPortal;
    }
    const newPortal = document.createElement('div');
    newPortal.setAttribute('id', 'hosting-modal-portal');
    document.body.appendChild(newPortal);
    return newPortal;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setValues({
      chaletId: '',
      checkInDate: '',
      checkInTime: '14:00',
      checkOutDate: '',
      checkOutTime: '12:00',
      notes: '',
      guests: [{ ...initialGuest }],
    });
    setErrors({});
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const selectedChalet = useMemo(
    () => chalets.find((item) => item.id === values.chaletId),
    [chalets, values.chaletId]
  );

  const nights = useMemo(() => {
    if (!values.checkInDate || !values.checkOutDate) {
      return 0;
    }
    return Math.max(differenceInCalendarDays(new Date(values.checkOutDate), new Date(values.checkInDate)), 0);
  }, [values.checkInDate, values.checkOutDate]);

  const estimatedTotal = useMemo(
    () => nights * Number(selectedChalet?.dailyRate || 0),
    [nights, selectedChalet?.dailyRate]
  );

  if (!isOpen || !portalElement) {
    return null;
  }

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setGuestField = (index, field, value) => {
    setValues((prev) => ({
      ...prev,
      guests: prev.guests.map((guest, guestIndex) => (guestIndex === index ? { ...guest, [field]: value } : guest)),
    }));
    setErrors((prev) => ({ ...prev, guests: undefined }));
  };

  const addGuest = () => {
    setValues((prev) => ({ ...prev, guests: [...prev.guests, { ...initialGuest }] }));
  };

  const removeGuest = (index) => {
    setValues((prev) => ({ ...prev, guests: prev.guests.filter((_, guestIndex) => guestIndex !== index) }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.chaletId) {
      nextErrors.chaletId = 'Selecione um chalé.';
    }
    if (!values.checkInDate || !values.checkInTime) {
      nextErrors.checkIn = 'Informe check-in completo.';
    }
    if (!values.checkOutDate || !values.checkOutTime) {
      nextErrors.checkOut = 'Informe check-out completo.';
    }
    const checkInIso = getDateTimeIso(values.checkInDate, values.checkInTime);
    const checkOutIso = getDateTimeIso(values.checkOutDate, values.checkOutTime);
    if (checkInIso && checkOutIso && new Date(checkOutIso) <= new Date(checkInIso)) {
      nextErrors.checkOut = 'Check-out deve ser posterior ao check-in.';
    }
    if (!values.guests.length) {
      nextErrors.guests = 'Adicione ao menos um hóspede.';
    } else if (values.guests.some((guest) => !guest.name || !guest.email || !guest.phone || !guest.cpf)) {
      nextErrors.guests = 'Preencha nome, email, telefone e CPF de todos os hóspedes.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    onCreate({
      chaletId: values.chaletId,
      checkInAt: getDateTimeIso(values.checkInDate, values.checkInTime),
      checkOutAt: getDateTimeIso(values.checkOutDate, values.checkOutTime),
      guests: values.guests,
      notes: values.notes.trim(),
      total: estimatedTotal,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Fechar modal" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-4xl bg-card border border-border rounded-lg shadow-soft-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-xl font-heading font-semibold text-foreground">Criar Reserva Manualmente</h3>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">✕</Button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className={`text-sm font-medium ${errors.chaletId ? 'text-destructive' : 'text-foreground'}`}>Chalé</label>
            <select
              value={values.chaletId}
              onChange={(event) => setField('chaletId', event.target.value)}
              className={`w-full h-10 rounded-md border px-3 text-sm bg-background focus-visible:outline-none focus-visible:ring-2 ${
                errors.chaletId ? 'border-destructive focus-visible:ring-destructive' : 'border-input focus-visible:ring-ring'
              }`}
            >
              <option value="">Selecione um chalé</option>
              {chalets.map((chalet) => (
                <option key={chalet.id} value={chalet.id}>
                  {chalet.name} ({formatCurrency(chalet.dailyRate)}/diária)
                </option>
              ))}
            </select>
            {errors.chaletId ? <p className="text-sm text-destructive">{errors.chaletId}</p> : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Check-in"
                type="date"
                value={values.checkInDate}
                onChange={(event) => setField('checkInDate', event.target.value)}
              />
              <Input
                label="Horário"
                type="time"
                value={values.checkInTime}
                onChange={(event) => setField('checkInTime', event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Check-out"
                type="date"
                value={values.checkOutDate}
                onChange={(event) => setField('checkOutDate', event.target.value)}
              />
              <Input
                label="Horário"
                type="time"
                value={values.checkOutTime}
                onChange={(event) => setField('checkOutTime', event.target.value)}
              />
            </div>
          </div>
          {errors.checkIn ? <p className="text-sm text-destructive">{errors.checkIn}</p> : null}
          {errors.checkOut ? <p className="text-sm text-destructive">{errors.checkOut}</p> : null}

          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Hóspedes</h4>
              <Button type="button" variant="outline" size="sm" onClick={addGuest}>
                + Adicionar Hóspede
              </Button>
            </div>

            {values.guests.map((guest, index) => (
              <div key={index} className="border border-border rounded-lg p-3 animate-slide-in-from-right">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-foreground">
                    Hóspede {index + 1} {index === 0 ? '(Responsável)' : ''}
                  </p>
                  {index > 0 ? (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeGuest(index)} aria-label="Remover hóspede">
                      ✕
                    </Button>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Nome"
                    value={guest.name}
                    onChange={(event) => setGuestField(index, 'name', event.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={guest.email}
                    onChange={(event) => setGuestField(index, 'email', event.target.value)}
                  />
                  <Input
                    label="Telefone"
                    value={guest.phone}
                    onChange={(event) => setGuestField(index, 'phone', event.target.value)}
                  />
                  <Input
                    label="CPF"
                    value={guest.cpf}
                    onChange={(event) => setGuestField(index, 'cpf', event.target.value)}
                  />
                </div>
              </div>
            ))}
            {errors.guests ? <p className="text-sm text-destructive">{errors.guests}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Observações</label>
            <textarea
              rows={3}
              value={values.notes}
              onChange={(event) => setField('notes', event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="border border-border rounded-lg p-4 text-sm text-muted-foreground space-y-1">
            <p>Diárias: {nights} x {formatCurrency(selectedChalet?.dailyRate || 0)} = {formatCurrency(estimatedTotal)}</p>
            <p>Taxas: {formatCurrency(0)}</p>
            <p className="font-semibold text-foreground">Total estimado: {formatCurrency(estimatedTotal)}</p>
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Criar Reserva
          </Button>
        </div>
      </form>
    </div>,
    portalElement
  );
};

export default CreateManualReservationModal;
