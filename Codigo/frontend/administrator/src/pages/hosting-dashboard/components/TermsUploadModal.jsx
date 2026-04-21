import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const TermsUploadModal = ({ isOpen, onClose, onSave, isSaving = false }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

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
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedFile(null);
    setError('');
    setIsDragOver(false);
  }, [isOpen]);

  if (!isOpen || !portalElement) {
    return null;
  }

  const validatePdf = (file) => {
    if (!file) {
      return 'Selecione um arquivo.';
    }
    const extension = String(file.name || '').split('.').pop()?.toLowerCase();
    const isPdfMime = file.type === 'application/pdf';
    if (!isPdfMime || extension !== 'pdf') {
      return 'Selecione apenas um arquivo PDF (.pdf).';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'O arquivo deve ter no máximo 10MB.';
    }
    return '';
  };

  const applySelectedFile = (incomingFiles) => {
    const files = Array.from(incomingFiles || []);
    if (!files.length || isSaving) {
      return;
    }
    if (files.length > 1) {
      setError('Selecione somente 1 arquivo PDF.');
      return;
    }
    const nextFile = files[0];
    const validationError = validatePdf(nextFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSelectedFile(nextFile);
    setError('');
  };

  const openFilePicker = () => {
    if (isSaving) return;
    fileInputRef.current?.click();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    applySelectedFile(event?.dataTransfer?.files);
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    const validationError = validatePdf(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    await onSave(selectedFile);
  };

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!isSaving) onClose();
        }}
        aria-label="Fechar modal"
      />
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-lg shadow-soft-lg">
        <div className="p-6 border-b border-border">
          <h3 className="text-xl font-heading font-semibold text-foreground">Upload de Termos (PDF)</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie 1 arquivo PDF de até 10MB para ser usado como termo oficial da reserva.
          </p>
        </div>

        <div className="p-6">
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
            <div
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openFilePicker();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`rounded-lg border-2 border-dashed p-6 transition-all ${
                isDragOver ? 'border-primary bg-primary/5' : 'border-border bg-background'
              } cursor-pointer`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => applySelectedFile(event?.target?.files)}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="FileText" size={22} />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Arraste um PDF aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Apenas .pdf • tamanho máximo 10MB • apenas 1 arquivo
                </p>
                <Button type="button" variant="outline" size="sm" iconName="Upload" className="mt-2">
                  Selecionar PDF
                </Button>
              </div>
            </div>
          </div>

          {selectedFile ? (
            <div className="mt-4 rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  iconName="Trash2"
                  onClick={() => {
                    if (!isSaving) setSelectedFile(null);
                  }}
                >
                  Remover
                </Button>
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Termos'}
          </Button>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default TermsUploadModal;
