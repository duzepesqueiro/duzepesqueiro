import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';

const statusStyles = {
  Confirmado: 'bg-blue-100 text-blue-700',
  Pendente: 'bg-yellow-100 text-yellow-700',
  Ocupado: 'bg-orange-100 text-orange-700',
  Finalizada: 'bg-green-100 text-green-700',
  Cancelada: 'bg-red-100 text-red-700',
};

const formatDateTime = (value) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const ReservationDetailsModal = ({ isOpen, reservation, onClose, onCheckOut, onCheckIn }) => {
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

  if (!isOpen || !portalElement || !reservation) {
    return null;
  }

  const showCheckOut = reservation.checkInDone && !reservation.checkOutDone && reservation.status !== 'Cancelada';
  const showCheckIn = !reservation.checkInDone && reservation.status !== 'Cancelada' && reservation.status !== 'Finalizada';

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Fechar modal" />
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-lg shadow-soft-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-xl font-heading font-semibold text-foreground">Detalhes da Reserva {reservation.code}</h3>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            ✕
          </Button>
        </div>

        <div className="p-6 space-y-5">
          <div className="border border-border rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Código: <span className="font-semibold text-foreground">{reservation.code}</span>
            </div>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[reservation.status] || 'bg-muted text-foreground'}`}>
              {reservation.status}
            </span>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Dados da Reserva</h4>
            <p className="text-sm text-muted-foreground">Check-in: <span className="text-foreground">{formatDateTime(reservation.checkInAt)}</span></p>
            <p className="text-sm text-muted-foreground">Check-out: <span className="text-foreground">{formatDateTime(reservation.checkOutAt)}</span></p>
            <p className="text-sm text-muted-foreground">Chalé: <span className="text-foreground">{reservation.chaletName}</span></p>
            <p className="text-sm text-muted-foreground">Total: <span className="text-foreground font-semibold">{formatCurrency(reservation.total)}</span></p>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Responsável</h4>
            <p className="text-sm text-foreground">{reservation.guest.name}</p>
            <p className="text-sm text-muted-foreground">{reservation.guest.email} · {reservation.guest.phone}</p>
            <p className="text-sm text-muted-foreground">CPF: {reservation.guest.cpf}</p>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Hóspedes ({reservation.guests.length})</h4>
            {reservation.guests.map((guest, index) => (
              <div key={`${guest.name}-${index}`} className="text-sm text-muted-foreground">
                <p>• {guest.name}, {guest.age} anos</p>
                <p className="ml-3">Check-in realizado: {guest.checkInAt ? formatDateTime(guest.checkInAt) : 'Pendente'}</p>
              </div>
            ))}
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Observações</h4>
            <p className="text-sm text-muted-foreground">{reservation.notes || '-'}</p>
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {showCheckIn ? (
            <Button type="button" onClick={() => onCheckIn(reservation)}>
              Fazer Check-in
            </Button>
          ) : null}
          {showCheckOut ? (
            <Button type="button" onClick={() => onCheckOut(reservation)}>
              Fazer Check-out
            </Button>
          ) : null}
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default ReservationDetailsModal;
