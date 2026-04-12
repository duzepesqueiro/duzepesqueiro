import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';

const HostingReservationModal = ({ isOpen, onClose, reservation }) => {
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !portalElement) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center px-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Fechar modal" />
      <div className="relative w-full max-w-md bg-card border border-border rounded-lg p-6 shadow-soft-lg animate-fade-in">
        <h3 className="text-lg font-heading font-semibold text-foreground mb-1">Detalhes da Reserva</h3>
        <p className="text-sm text-muted-foreground mb-6">{reservation?.dateLabel}</p>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Chalé</span>
            <span className="font-medium text-foreground">{reservation?.chaletName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium text-foreground">{reservation?.statusLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Hóspede</span>
            <span className="font-medium text-foreground">{reservation?.guest || 'Sem hóspede'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Observação</span>
            <span className="font-medium text-foreground text-right">{reservation?.details}</span>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default HostingReservationModal;
