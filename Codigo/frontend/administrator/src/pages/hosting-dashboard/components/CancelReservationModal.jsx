import React, { useMemo } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';

const formatDate = (value) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const getPenaltyRate = (daysBeforeCheckIn) => {
  if (daysBeforeCheckIn > 14) {
    return 0;
  }
  if (daysBeforeCheckIn >= 7) {
    return 0.2;
  }
  return 0.5;
};

const CancelReservationModal = ({ isOpen, reservation, onClose, onConfirm }) => {
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

  const now = new Date();
  const checkInDate = new Date(reservation.checkInAt);
  const daysBeforeCheckIn = Math.max(differenceInCalendarDays(checkInDate, now), 0);
  const penaltyRate = getPenaltyRate(daysBeforeCheckIn);
  const penaltyValue = reservation.total * penaltyRate;
  const refundValue = reservation.total - penaltyValue;

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Fechar modal" />
      <div className="relative w-full max-w-3xl bg-card border border-border rounded-lg shadow-soft-lg">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-xl font-heading font-semibold text-foreground">Cancelar Reserva {reservation.code}?</h3>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">✕</Button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-foreground">⚠️ Esta ação aplica as regras de cancelamento da Lei do Turismo.</p>

          <div className="border border-border rounded-lg p-4 text-sm text-muted-foreground">
            {penaltyRate === 0 && <p>✓ Sem multa aplicada — mais de 14 dias de antecedência.</p>}
            {penaltyRate === 0.2 && <p>✓ Multa de 20% — entre 7 e 14 dias.</p>}
            {penaltyRate === 0.5 && <p>✓ Multa de 50% — menos de 7 dias.</p>}
            <p>Data do check-in: {formatDate(reservation.checkInAt)}</p>
            <p>Hoje: {formatDate(now)} ({daysBeforeCheckIn} dias de antecedência)</p>
          </div>

          <div className="border border-border rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Política de Cancelamento</p>
            <p>Cancelamento gratuito com +14 dias de antecedência</p>
            <p>Multa de 20% entre 7-14 dias</p>
            <p>Multa de 50% com menos de 7 dias</p>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>Valor original: <span className="text-foreground">{formatCurrency(reservation.total)}</span></p>
            <p>Multa aplicada: <span className="text-foreground">{formatCurrency(penaltyValue)}</span></p>
            <p>Valor a reembolsar: <span className="text-foreground font-semibold">{formatCurrency(refundValue)}</span></p>
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
          <Button type="button" variant="danger" onClick={() => onConfirm(reservation, { penaltyRate, penaltyValue, refundValue })}>
            Confirmar Cancelamento
          </Button>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default CancelReservationModal;
