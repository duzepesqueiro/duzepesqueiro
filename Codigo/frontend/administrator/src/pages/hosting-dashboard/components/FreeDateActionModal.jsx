import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';

const FreeDateActionModal = ({ isOpen, selection, onClose, onCreateReservation, onBlockDate }) => {
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

  if (!isOpen || !portalElement || !selection) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1320] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Fechar modal" />
      <div className="relative w-full max-w-md bg-card border border-border rounded-lg shadow-soft-lg">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-heading font-semibold text-foreground">Data disponível</h3>
          <p className="text-sm text-muted-foreground mt-1">{selection.dateLabel}</p>
          <p className="text-sm text-muted-foreground">{selection.chaletName}</p>
        </div>
        <div className="p-6 space-y-3">
          <Button type="button" className="w-full" onClick={onCreateReservation}>
            Cadastrar Reserva Manual
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onBlockDate}>
            Bloquear Data
          </Button>
        </div>
        <div className="p-6 border-t border-border flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default FreeDateActionModal;
