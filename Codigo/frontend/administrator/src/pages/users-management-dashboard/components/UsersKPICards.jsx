import React from 'react';
import Icon from '../../../components/AppIcon';

// metrics: { totalUsuarios, usuariosAtivosPeriodo, novosUsuariosMesAtual, novosUsuariosMesAnterior, crescimentoPercentualMes, variacaoAtivosPercentual }
const UsersKPICards = ({ className = '', metrics }) => {
  const formatNumber = (value) => (value ?? 0)?.toLocaleString('pt-BR');
  const formatPercentage = (value) => `${Number(value ?? 0) >= 0 ? '+' : ''}${Number(value ?? 0)?.toFixed(1)}%`;

  const getChangeColor = (change) => (Number(change ?? 0) >= 0 ? 'text-success' : 'text-error');
  const getChangeIcon = (change) => (Number(change ?? 0) >= 0 ? 'TrendingUp' : 'TrendingDown');

  const formatValue = (kpi) => {
    if (kpi?.type === 'percentage') return `${Number(kpi?.value ?? 0)?.toFixed(1)}%`;
    return formatNumber(kpi?.value ?? 0);
  };

  // Fallback seguro quando metrics for null/undefined
  const m = metrics && typeof metrics === 'object' ? metrics : {};

  const kpiData = [
    {
      id: 1,
      label: 'Total de Usuários',
      value: m.totalUsuarios,
      change: m.crescimentoPercentualMes,
      period: 'mês anterior',
      icon: 'Users',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      id: 2,
      label: 'Usuários Ativos',
      value: m.usuariosAtivosPeriodo,
      change: m.variacaoAtivosPercentual,
      period: 'período anterior',
      icon: 'UserCheck',
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      id: 3,
      label: 'Novos no Mês',
      value: m.novosUsuariosMesAtual,
      change: m.crescimentoPercentualMes,
      period: 'mês anterior',
      icon: 'UserPlus',
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
    },
    {
      id: 4,
      label: 'Crescimento (%)',
      value: m.crescimentoPercentualMes,
      type: 'percentage',
      change: m.crescimentoPercentualMes,
      period: 'mês anterior',
      icon: 'TrendingUp',
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {kpiData?.map((kpi) => (
        <div key={kpi?.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-soft-md transition-smooth">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${kpi?.iconBg}`}>
              <Icon name={kpi?.icon} size={24} className={kpi?.iconColor} />
            </div>
            <div className={`flex items-center space-x-1 ${getChangeColor(kpi?.change)}`}>
              <Icon name={getChangeIcon(kpi?.change)} size={16} />
              <span className="text-sm font-medium">{formatPercentage(kpi?.change)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-heading font-bold text-foreground">{formatValue(kpi)}</h3>
            <p className="text-sm text-muted-foreground">{kpi?.label}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>vs. {kpi?.period}</span>
              <span className="font-medium">Atual</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UsersKPICards;