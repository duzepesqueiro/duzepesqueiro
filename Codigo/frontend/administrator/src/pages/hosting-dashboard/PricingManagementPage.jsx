import React, { useMemo, useState } from 'react';
import HostingLayout from './components/HostingLayout';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import PriceSimulator from './components/PriceSimulator';
import PriceRuleFormModal from './components/PriceRuleFormModal';
import PriceRulesList from './components/PriceRulesList';

const chalets = [
  { id: 'chalet-1', name: 'Quarto Jardim', type: 'Standard', basePrice: 150 },
  { id: 'chalet-2', name: 'Quarto Serra', type: 'Deluxe', basePrice: 220 },
  { id: 'chalet-3', name: 'Quarto Montanha', type: 'Suite', basePrice: 320 },
];

const initialRules = [
  {
    id: 'rule-1',
    name: 'Fds Abril',
    type: 'Final de Semana',
    modifierPercent: 10,
    modifierDirection: 'decrease',
    startDate: '2026-04-05',
    endDate: '2026-04-30',
    applyMode: 'all',
    applyAll: true,
    chaletIds: chalets.map((item) => item.id),
    active: true,
  },
  {
    id: 'rule-2',
    name: 'Alta 2026',
    type: 'Temporada',
    modifierPercent: 15,
    modifierDirection: 'decrease',
    startDate: '2026-12-15',
    endDate: '2027-02-15',
    applyMode: 'manual',
    applyAll: false,
    chaletIds: ['chalet-1', 'chalet-2'],
    active: false,
  },
];

const dateInRange = (date, startDate, endDate) => {
  const target = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return target >= start && target <= end;
};

const overlap = (aStart, aEnd, bStart, bEnd) => {
  const aS = new Date(aStart);
  const aE = new Date(aEnd);
  const bS = new Date(bStart);
  const bE = new Date(bEnd);
  return aS <= bE && aE >= bS;
};

const PricingManagementPage = () => {
  const [rules, setRules] = useState(initialRules);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const chaletNameById = useMemo(
    () =>
      chalets.reduce((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {}),
    []
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
      };
    });
  }, [rules]);

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

  const handleSaveRule = (payload) => {
    if (payload.id) {
      setRules((prev) => prev.map((rule) => (rule.id === payload.id ? payload : rule)));
    } else {
      setRules((prev) => [
        ...prev,
        {
          ...payload,
          id: `rule-${Date.now()}`,
        },
      ]);
    }
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDeleteRule = (rule) => {
    const shouldDelete = window.confirm(`Deseja excluir a regra '${rule.name}'?`);
    if (!shouldDelete) {
      return;
    }
    setRules((prev) => prev.filter((item) => item.id !== rule.id));
  };

  const handleToggleRule = (rule) => {
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
        window.alert(`Este chalé já possui a regra aplicada. ${conflict}`);
        return;
      }
    }
    setRules((prev) =>
      prev.map((item) =>
        item.id === rule.id
          ? {
              ...item,
              active: nextActive,
            }
          : item
      )
    );
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
      />
      <PriceRuleFormModal
        isOpen={isModalOpen}
        chalets={chalets}
        editingRule={editingRule}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRule(null);
        }}
        onSave={handleSaveRule}
        validateConflict={validateConflict}
      />
    </HostingLayout>
  );
};

export default PricingManagementPage;
