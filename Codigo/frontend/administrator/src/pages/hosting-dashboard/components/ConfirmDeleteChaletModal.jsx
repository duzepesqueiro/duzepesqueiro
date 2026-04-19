import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';

const ConfirmDeleteChaletModal = ({ isOpen, chalet, isDeleting = false, onConfirm, onClose }) => {
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

  if (!isOpen || !portalElement || !chalet) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={() => { if (!isDeleting) onClose(); }}
        aria-label="Fechar modal"
      />
      <div className="relative w-full max-w-md bg-card border border-border rounded-lg shadow-soft-lg">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-heading font-semibold text-foreground">Confirmar Exclusão</h3>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o chalé <span className="font-semibold text-foreground">{chalet.name}</span>?
          </p>
          <p className="text-xs text-muted-foreground">
            Esta ação não pode ser desfeita.
          </p>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default ConfirmDeleteChaletModal;
