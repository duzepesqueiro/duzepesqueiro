import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';

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

const NoShowModal = ({ isOpen, reservation, onClose, onConfirm }) => {
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

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Fechar modal" />
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-lg shadow-soft-lg">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-xl font-heading font-semibold text-foreground">Registrar No-Show para {reservation.code}?</h3>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">✕</Button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-foreground">⚠️ O hóspede não compareceu na data de check-in.</p>

          <div className="border border-border rounded-lg p-4 text-sm text-muted-foreground">
            <p>Cliente: <span className="text-foreground">{reservation.guest.name}</span></p>
            <p>Check-in esperado: <span className="text-foreground">{formatDateTime(reservation.checkInAt)}</span></p>
            <p>Status atual: <span className="text-foreground">No-show</span></p>
          </div>

          <div className="border border-border rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">📋 Consequência</p>
            <p>Cobrança integral do valor da reserva</p>
            <p>Valor: <span className="text-foreground">{formatCurrency(reservation.total)}</span></p>
            <p>Conforme política de não comparecimento</p>
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="danger" onClick={() => onConfirm(reservation)}>
            Confirmar No-Show
          </Button>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default NoShowModal;
