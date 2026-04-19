import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const ruleTypes = ['Temporada', 'Final de Semana', 'Feriado', 'Desconto'];

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const initialState = {
  name: '',
  type: '',
  applyMode: 'all',
  chaletIds: [],
  startDate: '',
  endDate: '',
  modifierPercent: '',
  modifierDirection: 'decrease',
  active: true,
};

const PriceRuleFormModal = ({
  isOpen,
  onClose,
  onSave,
  chalets,
  editingRule,
  validateConflict,
  isSaving = false,
}) => {
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [conflictMessage, setConflictMessage] = useState('');

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
    if (editingRule) {
      setValues({
        name: editingRule.name || '',
        type: editingRule.type || '',
        applyMode: editingRule.applyMode || (editingRule.applyAll ? 'all' : 'manual'),
        chaletIds: editingRule.chaletIds || [],
        startDate: editingRule.startDate || '',
        endDate: editingRule.endDate || '',
        modifierPercent: String(editingRule.modifierPercent || ''),
        modifierDirection: editingRule.modifierDirection || 'decrease',
        active: editingRule.active !== false,
      });
    } else {
      setValues(initialState);
    }
    setErrors({});
    setConflictMessage('');
  }, [isOpen, editingRule]);

  if (!isOpen || !portalElement) {
    return null;
  }

  const selectedChaletIds = values.applyMode === 'all' ? chalets.map((item) => item.id) : values.chaletIds;
  const isDiscountType = values.type === 'Desconto';
  const previewBase = chalets.find((item) => selectedChaletIds.includes(item.id))?.basePrice || 150;
  const previewPercent = Number(values.modifierPercent || 0);
  const multiplier = values.modifierDirection === 'increase' ? 1 + previewPercent / 100 : 1 - previewPercent / 100;
  const previewFinal = previewBase * (Number.isFinite(multiplier) ? multiplier : 1);

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setConflictMessage('');
  };

  const toggleChalet = (chaletId) => {
    setValues((prev) => {
      const exists = prev.chaletIds.includes(chaletId);
      return {
        ...prev,
        chaletIds: exists ? prev.chaletIds.filter((id) => id !== chaletId) : [...prev.chaletIds, chaletId],
      };
    });
    setErrors((prev) => ({ ...prev, chaletIds: undefined }));
    setConflictMessage('');
  };

  const handleSelectAll = () => {
    setField('applyMode', 'all');
    setField('chaletIds', chalets.map((item) => item.id));
  };

  const handleClear = () => {
    setField('applyMode', 'manual');
    setField('chaletIds', []);
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.name || values.name.trim().length < 3) {
      nextErrors.name = 'Nome da regra é obrigatório.';
    }
    if (!values.type) {
      nextErrors.type = 'Selecione um tipo.';
    }
    if (values.applyMode === 'manual' && !values.chaletIds.length) {
      nextErrors.chaletIds = 'Selecione ao menos um chalé.';
    }
    if (!values.startDate) {
      nextErrors.startDate = 'Data de início é obrigatória.';
    }
    if (!values.endDate) {
      nextErrors.endDate = 'Data final é obrigatória.';
    }
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      nextErrors.endDate = 'Data final deve ser maior ou igual à data de início.';
    }
    const percent = Number(values.modifierPercent);
    if (!values.modifierPercent || Number.isNaN(percent) || percent <= 0 || percent > 100) {
      nextErrors.modifierPercent = 'Informe percentual entre 0.01 e 100.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return false;
    }

    const conflict = validateConflict({
      id: editingRule?.id,
      chaletIds: selectedChaletIds,
      startDate: values.startDate,
      endDate: values.endDate,
      active: values.active,
    });

    if (conflict) {
      setConflictMessage(conflict);
      return false;
    }

    return true;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    if (!validate()) {
      return;
    }
    onSave({
      ...editingRule,
      name: values.name.trim(),
      type: values.type,
      applyMode: values.applyMode,
      applyAll: values.applyMode === 'all',
      chaletIds: selectedChaletIds,
      startDate: values.startDate,
      endDate: values.endDate,
      modifierPercent: Number(values.modifierPercent),
      modifierDirection: values.modifierDirection,
      active: values.active,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} disabled={isSaving} aria-label="Fechar modal" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-4xl bg-card border border-border rounded-lg shadow-soft-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h3 className="text-xl font-heading font-semibold text-foreground">
            {editingRule ? `Editar Regra: ${editingRule.name}` : 'Nova Regra de Preço'}
          </h3>
        </div>

        <div className="p-6 space-y-5">
          <Input
            label="Nome da Regra"
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder="Final de Semana de Abril 2026"
            error={errors.name}
            required
          />

          <div className="space-y-2">
            <p className={`text-sm font-medium ${errors.type ? 'text-destructive' : 'text-foreground'}`}>Tipo</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ruleTypes.map((type) => (
                <label key={type} className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="price-rule-type"
                    checked={values.type === type}
                    onChange={() => {
                      setField('type', type);
                      if (type === 'Desconto') {
                        setField('modifierDirection', 'decrease');
                      }
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
            {errors.type ? <p className="text-sm text-destructive">{errors.type}</p> : null}
          </div>

          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Chalés Aplicados</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>Selecionar Todos</Button>
                <Button type="button" variant="outline" size="sm" onClick={handleClear}>Limpar</Button>
              </div>
            </div>

            <div className="space-y-2">
              {chalets.map((chalet) => (
                <label key={chalet.id} className="inline-flex w-full items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedChaletIds.includes(chalet.id)}
                    disabled={values.applyMode === 'all'}
                    onChange={() => toggleChalet(chalet.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>{chalet.name}</span>
                </label>
              ))}
              {!chalets.length ? (
                <p className="text-sm text-muted-foreground">Nenhum chalé cadastrado no sistema.</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">ou selecione:</span>
              <select
                value={values.applyMode === 'all' ? 'all' : 'manual'}
                onChange={(event) => setField('applyMode', event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">Todos os Chalés</option>
                <option value="manual">Selecionar manualmente</option>
              </select>
            </div>
            {errors.chaletIds ? <p className="text-sm text-destructive">{errors.chaletIds}</p> : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Data de Início"
              type="date"
              value={values.startDate}
              onChange={(event) => setField('startDate', event.target.value)}
              error={errors.startDate}
              required
            />
            <Input
              label="Data Final"
              type="date"
              value={values.endDate}
              onChange={(event) => setField('endDate', event.target.value)}
              error={errors.endDate}
              required
            />
          </div>

          <div className="border border-border rounded-lg p-4 space-y-3">
            <Input
              label="Modificador de Preço (%)"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={values.modifierPercent}
              onChange={(event) => setField('modifierPercent', event.target.value)}
              error={errors.modifierPercent}
              required
            />

            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="modifier-direction"
                  checked={values.modifierDirection === 'increase'}
                  disabled={isDiscountType}
                  onChange={() => setField('modifierDirection', 'increase')}
                  className="h-4 w-4 accent-primary"
                />
                <span>Aumentar (+)</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="modifier-direction"
                  checked={values.modifierDirection === 'decrease'}
                  onChange={() => setField('modifierDirection', 'decrease')}
                  className="h-4 w-4 accent-primary"
                />
                <span>Diminuir (−)</span>
              </label>
            </div>

            <p className="text-sm text-muted-foreground">
              Preview: Preço de {formatCurrency(previewBase)} → {formatCurrency(previewFinal)} ({values.modifierDirection === 'decrease' ? '-' : '+'}{Number(values.modifierPercent || 0)}%)
            </p>
          </div>

          {conflictMessage ? (
            <div className="rounded-md border border-yellow-400/40 bg-yellow-100/40 px-3 py-2 text-sm text-yellow-800">
              ⚠️ {conflictMessage}
            </div>
          ) : null}
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSaving} disabled={isSaving}>
            Salvar Regra
          </Button>
        </div>
      </form>
    </div>,
    portalElement
  );
};

export default PriceRuleFormModal;
