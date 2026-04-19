import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const reasons = [
  { label: 'Manutenção', value: 'MAINTENANCE' },
  { label: 'Limpeza', value: 'CLEANING' },
  { label: 'Interdição', value: 'INTERDICTION' },
  { label: 'Administrativo', value: 'ADMIN' },
];

const getTodayString = () => new Date().toISOString().split('T')[0];

const initialFormValues = {
  chaletId: '',
  dataInicio: '',
  dataFim: '',
  reason: '',
  notes: '',
  isActive: true,
};

const BlockDatesModal = ({ isOpen, onClose, chalets, blockedDates, onSave, initialValues }) => {
  const [values, setValues] = useState(initialFormValues);
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
      ...initialFormValues,
      ...initialValues,
    });
    setErrors({});
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, initialValues]);

  if (!isOpen || !portalElement) {
    return null;
  }

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, conflict: undefined }));
  };

  const hasConflict = () => {
    if (!values.chaletId || !values.dataInicio || !values.dataFim) {
      return false;
    }
    const start = new Date(values.dataInicio);
    const end = new Date(values.dataFim);
    return blockedDates.some((block) => {
      if (block.chaletId !== values.chaletId) {
        return false;
      }
      const blockStart = new Date(block.dataInicio);
      const blockEnd = new Date(block.dataFim);
      return start <= blockEnd && end >= blockStart;
    });
  };

  const validate = () => {
    const today = getTodayString();
    const nextErrors = {};
    if (!values.chaletId) {
      nextErrors.chaletId = 'Selecione um chalé.';
    }
    if (!values.dataInicio) {
      nextErrors.dataInicio = 'Data de início é obrigatória.';
    } else if (values.dataInicio < today) {
      nextErrors.dataInicio = 'Data de início não pode ser no passado.';
    }
    if (!values.dataFim) {
      nextErrors.dataFim = 'Data final é obrigatória.';
    } else if (values.dataInicio && values.dataFim < values.dataInicio) {
      nextErrors.dataFim = 'Data final deve ser maior ou igual à data de início.';
    }
    if (!values.reason) {
      nextErrors.reason = 'Selecione um motivo.';
    }
    if (Object.keys(nextErrors).length === 0 && hasConflict()) {
      nextErrors.conflict = 'Já existe bloqueio para esse chalé no período selecionado.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    onSave({
      id: `block-${Date.now()}`,
      chaletId: values.chaletId,
      dataInicio: values.dataInicio,
      dataFim: values.dataFim,
      reason: values.reason,
      notes: values.notes.trim(),
      isActive: values.isActive,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Fechar modal" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl bg-card border border-border rounded-lg shadow-soft-lg">
        <div className="p-6 border-b border-border">
          <h3 className="text-xl font-heading font-semibold text-foreground">🔒 Bloquear Datas</h3>
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
                  {chalet.name}
                </option>
              ))}
            </select>
            {errors.chaletId ? <p className="text-sm text-destructive">{errors.chaletId}</p> : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Data de Início"
              type="date"
              value={values.dataInicio}
              min={getTodayString()}
              onChange={(event) => setField('dataInicio', event.target.value)}
              error={errors.dataInicio}
              required
            />
            <Input
              label="Data Final"
              type="date"
              value={values.dataFim}
              min={values.dataInicio || getTodayString()}
              onChange={(event) => setField('dataFim', event.target.value)}
              error={errors.dataFim}
              required
            />
          </div>

          <div className="space-y-2">
            <p className={`text-sm font-medium ${errors.reason ? 'text-destructive' : 'text-foreground'}`}>
              Motivo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {reasons.map((reason) => (
                <label key={reason.value} className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="reason"
                    checked={values.reason === reason.value}
                    onChange={() => setField('reason', reason.value)}
                    className={`h-4 w-4 ${errors.reason ? 'accent-red-600' : 'accent-primary'}`}
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>
            {errors.reason ? <p className="text-sm text-destructive">{errors.reason}</p> : null}
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

          {errors.conflict ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.conflict}
            </div>
          ) : null}
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Bloquear Datas
          </Button>
        </div>
      </form>
    </div>,
    portalElement
  );
};

export default BlockDatesModal;
