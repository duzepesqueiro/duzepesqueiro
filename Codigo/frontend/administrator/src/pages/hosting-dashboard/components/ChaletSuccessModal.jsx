import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';

const ChaletSuccessModal = ({ isOpen, mode = 'create', onClose }) => {
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

  if (!isOpen || !portalElement) {
    return null;
  }

  const title = mode === 'edit' ? 'Chalé atualizado com sucesso' : 'Chalé cadastrado com sucesso';
  const description = mode === 'edit'
    ? 'As alterações foram salvas e a listagem já foi atualizada.'
    : 'O novo chalé foi criado e já aparece na listagem.';

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Fechar modal" />
      <div className="relative w-full max-w-md bg-card border border-border rounded-lg shadow-soft-lg">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-heading font-semibold text-foreground">{title}</h3>
        </div>

        <div className="p-6">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="p-6 border-t border-border flex justify-end">
          <Button type="button" onClick={onClose}>
            Ok
          </Button>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default ChaletSuccessModal;
