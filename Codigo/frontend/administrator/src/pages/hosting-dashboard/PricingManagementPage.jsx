import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HostingLayout from './components/HostingLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import PriceSimulator from './components/PriceSimulator';
import PriceRuleFormModal from './components/PriceRuleFormModal';
import PriceRulesList from './components/PriceRulesList';
import ConfirmPriceRuleActionModal from './components/ConfirmPriceRuleActionModal';
import {
  createPricingRule,
  deletePricingRule,
  listChalets,
  listPricingRules,
  togglePricingRule,
  updatePricingRule,
} from '../../utils/hostingService';

const ruleTypeToUiLabel = {
  SEASON: 'Temporada',
  WEEKEND: 'Final de Semana',
  HOLIDAY: 'Feriado',
  DISCOUNT: 'Desconto',
};

const uiLabelToRuleTypeIncrease = {
  Temporada: 'SEASON',
  'Final de Semana': 'WEEKEND',
  Feriado: 'HOLIDAY',
};

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const normalizeChalet = (chalet) => ({
  ...chalet,
  basePrice: Number(chalet?.basePrice || 0),
});

const normalizeRuleFromApi = (rule) => {
  const isDiscount = rule?.ruleType === 'DISCOUNT';
  return {
    id: rule?.id,
    name: rule?.name || '',
    type: ruleTypeToUiLabel[rule?.ruleType] || 'Temporada',
    modifierPercent: Number(rule?.percentage || 0),
    modifierDirection: isDiscount ? 'decrease' : 'increase',
    startDate: toDateInputValue(rule?.startDate),
    endDate: toDateInputValue(rule?.endDate),
    applyMode: rule?.appliesToAll ? 'all' : 'manual',
    applyAll: Boolean(rule?.appliesToAll),
    chaletIds: Array.isArray(rule?.chaletIds) ? rule.chaletIds : [],
    active: rule?.isActive !== false,
    createdAt: rule?.createdAt,
    updatedAt: rule?.updatedAt,
  };
};

const toBackendRulePayload = (rule) => {
  const direction = rule?.modifierDirection;
  const uiType = rule?.type;
  const appliesToAll = Boolean(rule?.applyAll);
  const fallbackType = 'SEASON';
  const ruleType =
    direction === 'decrease'
      ? 'DISCOUNT'
      : (uiLabelToRuleTypeIncrease[uiType] || fallbackType);

  return {
    name: String(rule?.name || '').trim(),
    ruleType,
    percentage: Number(rule?.modifierPercent || 0),
    startDate: rule?.startDate,
    endDate: rule?.endDate,
    appliesToAll,
    chaletIds: appliesToAll ? [] : (Array.isArray(rule?.chaletIds) ? rule.chaletIds : []),
    isActive: rule?.active !== false,
  };
};

const toErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message) && message.length) {
    return message.join(', ');
  }
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  return fallback;
};

const toLocalDateOnly = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const dateInRange = (date, startDate, endDate) => {
  const target = toLocalDateOnly(date);
  const start = toLocalDateOnly(startDate);
  const end = toLocalDateOnly(endDate);
  return target >= start && target <= end;
};

const overlap = (aStart, aEnd, bStart, bEnd) => {
  const aS = toLocalDateOnly(aStart);
  const aE = toLocalDateOnly(aEnd);
  const bS = toLocalDateOnly(bStart);
  const bE = toLocalDateOnly(bEnd);
  return aS <= bE && aE >= bS;
};

const PricingManagementPage = () => {
  const [rules, setRules] = useState([]);
  const [chalets, setChalets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [rowActionByRuleId, setRowActionByRuleId] = useState({});
  const [rulePendingDelete, setRulePendingDelete] = useState(null);
  const [rulePendingEdit, setRulePendingEdit] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [chaletsResponse, rulesResponse] = await Promise.all([
        listChalets(),
        listPricingRules(true),
      ]);
      setChalets(chaletsResponse.map(normalizeChalet));
      setRules(rulesResponse.map(normalizeRuleFromApi));
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível carregar os dados da gestão de preços.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chaletNameById = useMemo(
    () =>
      chalets.reduce((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {}),
    [chalets]
  );

  const simulation = useMemo(() => {
    const today = new Date();
    return chalets.map((chalet) => {
      const activeRule = rules.find((rule) => {
        if (!rule.active) {
          return false;
        }
        const applies = rule.applyAll || rule.chaletIds.includes(chalet.id);
        if (!applies) {
          return false;
        }
        return dateInRange(today, rule.startDate, rule.endDate);
      });

      if (!activeRule) {
        return {
          ...chalet,
          finalPrice: chalet.basePrice,
          hasChange: false,
          percent: 0,
          delta: 0,
          sign: 'none',
          ruleName: '',
        };
      }

      const multiplier =
        activeRule.modifierDirection === 'increase'
          ? 1 + activeRule.modifierPercent / 100
          : 1 - activeRule.modifierPercent / 100;
      const finalPrice = Number((chalet.basePrice * multiplier).toFixed(2));
      const delta = finalPrice - chalet.basePrice;

      return {
        ...chalet,
        finalPrice,
        hasChange: true,
        percent: activeRule.modifierPercent,
        delta,
        sign: activeRule.modifierDirection,
        ruleName: activeRule.name,
      };
    });
  }, [rules, chalets]);

  const validateConflict = ({ id, chaletIds, startDate, endDate, active }) => {
    if (!active) {
      return '';
    }
    for (const chaletId of chaletIds) {
      const conflict = rules.find((rule) => {
        if (id && rule.id === id) {
          return false;
        }
        if (!rule.active) {
          return false;
        }
        const applies = rule.applyAll || rule.chaletIds.includes(chaletId);
        if (!applies) {
          return false;
        }
        return overlap(startDate, endDate, rule.startDate, rule.endDate);
      });
      if (conflict) {
        const chaletName = chaletNameById[chaletId];
        return `${chaletName} já possui regra '${conflict.name}' ativa.`;
      }
    }
    return '';
  };

  const handleSaveRule = async (payload) => {
    if (isSavingRule) {
      return;
    }
    const backendPayload = toBackendRulePayload(payload);
    setIsSavingRule(true);
    try {
      if (payload.id) {
        const updated = await updatePricingRule(payload.id, backendPayload);
        setRules((prev) =>
          prev.map((rule) => (rule.id === payload.id ? normalizeRuleFromApi(updated) : rule))
        );
      } else {
        const created = await createPricingRule(backendPayload);
        setRules((prev) => [normalizeRuleFromApi(created), ...prev]);
      }
      setIsModalOpen(false);
      setEditingRule(null);
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível salvar a regra de preço.'));
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleEditRule = (rule) => {
    if (rowActionByRuleId[rule.id]) {
      return;
    }
    setRulePendingEdit(rule);
  };

  const handleConfirmEditRule = () => {
    if (!rulePendingEdit) {
      return;
    }
    const rule = rulePendingEdit;
    setRulePendingEdit(null);
    setRowActionByRuleId((prev) => ({ ...prev, [rule.id]: 'edit' }));
    setEditingRule(rule);
    setIsModalOpen(true);
    setTimeout(() => {
      setRowActionByRuleId((prev) => ({ ...prev, [rule.id]: null }));
    }, 0);
  };

  const handleDeleteRule = async (rule) => {
    setRulePendingDelete(rule);
  };

  const handleConfirmDeleteRule = async () => {
    const rule = rulePendingDelete;
    if (!rule) {
      return;
    }
    if (rowActionByRuleId[rule.id]) {
      return;
    }
    setRowActionByRuleId((prev) => ({ ...prev, [rule.id]: 'delete' }));
    try {
      await deletePricingRule(rule.id);
      setRules((prev) => prev.filter((item) => item.id !== rule.id));
      setRulePendingDelete(null);
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível excluir a regra.'));
    } finally {
      setRowActionByRuleId((prev) => ({ ...prev, [rule.id]: null }));
    }
  };

  const handleToggleRule = async (rule) => {
    if (rowActionByRuleId[rule.id]) {
      return;
    }
    const nextActive = !rule.active;
    if (nextActive) {
      const conflict = validateConflict({
        id: rule.id,
        chaletIds: rule.applyAll ? chalets.map((item) => item.id) : rule.chaletIds,
        startDate: rule.startDate,
        endDate: rule.endDate,
        active: true,
      });
      if (conflict) {
        alert(`Este chalé já possui a regra aplicada. ${conflict}`);
        return;
      }
    }
    setRowActionByRuleId((prev) => ({ ...prev, [rule.id]: 'toggle' }));
    try {
      const updated = await togglePricingRule(rule.id, nextActive);
      setRules((prev) =>
        prev.map((item) => (item.id === rule.id ? normalizeRuleFromApi(updated) : item))
      );
    } catch (error) {
      alert(toErrorMessage(error, 'Não foi possível alterar o status da regra.'));
    } finally {
      setRowActionByRuleId((prev) => ({ ...prev, [rule.id]: null }));
    }
  };

  return (
    <HostingLayout
      title="Gestão de Preços"
      subtitle="Regras sazonais, simulação diária e controle de ativação por chalé"
      actions={
        <Button type="button" onClick={() => { setEditingRule(null); setIsModalOpen(true); }}>
          <Icon name="Plus" size={16} className="mr-2" />
          Nova Regra de Preço
        </Button>
      }
    >
      <PriceSimulator simulation={simulation} />
      <PriceRulesList
        rules={rules}
        chaletNameById={chaletNameById}
        onToggle={handleToggleRule}
        onEdit={handleEditRule}
        onDelete={handleDeleteRule}
        rowActionByRuleId={rowActionByRuleId}
      />
      <PriceRuleFormModal
        isOpen={isModalOpen}
        chalets={chalets}
        editingRule={editingRule}
        isSaving={isSavingRule}
        onClose={() => {
          if (isSavingRule) return;
          setIsModalOpen(false);
          setEditingRule(null);
        }}
        onSave={handleSaveRule}
        validateConflict={validateConflict}
      />
      <ConfirmPriceRuleActionModal
        isOpen={Boolean(rulePendingDelete)}
        title="Excluir Regra de Preço"
        description={
          rulePendingDelete
            ? `Tem certeza que deseja excluir a regra '${rulePendingDelete.name}'? Esta ação remove a regra do sistema.`
            : ''
        }
        confirmLabel="Confirmar Exclusão"
        confirmVariant="destructive"
        isLoading={Boolean(rulePendingDelete && rowActionByRuleId[rulePendingDelete.id] === 'delete')}
        onConfirm={handleConfirmDeleteRule}
        onClose={() => setRulePendingDelete(null)}
      />
      <ConfirmPriceRuleActionModal
        isOpen={Boolean(rulePendingEdit)}
        title="Editar Regra de Preço"
        description={
          rulePendingEdit
            ? `Deseja editar a regra '${rulePendingEdit.name}'?`
            : ''
        }
        confirmLabel="Continuar Edição"
        isLoading={false}
        onConfirm={handleConfirmEditRule}
        onClose={() => setRulePendingEdit(null)}
      />
      {loading ? (
        <div className="mt-4 text-sm text-muted-foreground">Carregando regras e chalés...</div>
      ) : null}
    </HostingLayout>
  );
};

export default PricingManagementPage;
