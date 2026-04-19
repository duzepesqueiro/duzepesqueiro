import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const typeStyles = {
  Temporada: 'bg-purple-100 text-purple-700',
  'Final de Semana': 'bg-blue-100 text-blue-700',
  Feriado: 'bg-red-100 text-red-700',
  Desconto: 'bg-green-100 text-green-700',
};

const formatDate = (value) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

const chaletsLabel = (rule, chaletNameById) => {
  if (rule.applyAll) {
    return 'Todos';
  }
  const names = (rule.chaletIds || []).map((id) => chaletNameById[id]).filter(Boolean);
  if (names.length <= 3) {
    return names.join(', ');
  }
  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
};

const modifierLabel = (rule) => {
  const signal = rule.modifierDirection === 'decrease' ? '-' : '+';
  return `${signal}${rule.modifierPercent}%`;
};

const PriceRulesList = ({
  rules,
  chaletNameById,
  onToggle,
  onEdit,
  onDelete,
  rowActionByRuleId = {},
}) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-heading font-semibold text-foreground mb-4">Regras de Preço</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Desconto/Aumento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Período</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chalés</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-border last:border-b-0 hover:bg-muted/40 transition-smooth">
                {(() => {
                  const rowAction = rowActionByRuleId?.[rule.id] || null;
                  const isToggling = rowAction === 'toggle';
                  const isDeleting = rowAction === 'delete';
                  const isEditing = rowAction === 'edit';
                  const rowBusy = Boolean(rowAction);
                  return (
                    <>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{rule.name}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${typeStyles[rule.type] || 'bg-muted text-foreground'}`}>
                    {rule.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={rule.modifierDirection === 'decrease' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                    {modifierLabel(rule)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {formatDate(rule.startDate)} - {formatDate(rule.endDate)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{chaletsLabel(rule, chaletNameById)}</td>
                <td className="px-4 py-3 text-sm">
                  <button
                    type="button"
                    onClick={() => onToggle(rule)}
                    disabled={rowBusy}
                    title={rule.active ? 'Desativar regra' : 'Ativar regra'}
                    className={`relative inline-flex w-16 h-8 rounded-full transition-smooth items-center ${rule.active ? 'bg-primary' : 'bg-gray-300'} ${rowBusy ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`absolute inline-flex w-7 h-7 rounded-full bg-white shadow-sm items-center justify-center text-xs transition-transform ${
                        rule.active ? 'translate-x-8 text-primary' : 'translate-x-1 text-gray-500'
                      }`}
                    >
                      {isToggling ? (
                        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" />
                        </svg>
                      ) : (rule.active ? '⚡' : '🌙')}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggle(rule)}
                      aria-label={`Alternar ${rule.name}`}
                      title="Ativar/Desativar"
                      loading={isToggling}
                      disabled={rowBusy}
                    >
                      <Icon name="Power" size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(rule)}
                      aria-label={`Editar ${rule.name}`}
                      title="Editar regra"
                      loading={isEditing}
                      disabled={rowBusy}
                    >
                      <Icon name="Pencil" size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(rule)}
                      aria-label={`Excluir ${rule.name}`}
                      title="Excluir regra"
                      loading={isDeleting}
                      disabled={rowBusy}
                    >
                      <Icon name="Trash2" size={16} />
                    </Button>
                  </div>
                </td>
                    </>
                  );
                })()}
              </tr>
            ))}
            {!rules.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma regra de preço cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PriceRulesList;
