import React from 'react';
import Icon from '../../../components/AppIcon';

const SalesKPICards = ({ kpiData, className = '' }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })?.format(value);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value?.toFixed(1)}%`;
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-error';
    return 'text-muted-foreground';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return 'TrendingUp';
    if (change < 0) return 'TrendingDown';
    return 'Minus';
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {kpiData.map((kpi) => (
        <div key={kpi?.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-soft-md transition-smooth">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${kpi?.iconBg}`}>
              <Icon name={kpi?.icon} size={24} className={kpi?.iconColor} />
            </div>
            <div className={`flex items-center space-x-1 ${getChangeColor(kpi?.change)}`}>
              <Icon name={getChangeIcon(kpi?.change)} size={16} />
              <span className="text-sm font-medium">
                {formatPercentage(kpi?.change)}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-foreground">
              {kpi?.type === 'currency' ? formatCurrency(kpi?.value) : kpi?.value?.toLocaleString()}
            </h3>
            <p className="text-sm text-muted-foreground">{kpi?.label}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>vs. {kpi?.period}</span>
              {kpi?.target ? <span className="font-medium">{kpi?.target}</span> : null}
            </div>
          </div>

          {/* Progress Bar */}
          {typeof kpi?.progress === 'number' ? (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progresso</span>
                <span>{kpi?.progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    kpi?.progress >= 100 ? 'bg-success' : 
                    kpi?.progress >= 75 ? 'bg-accent' : 
                    kpi?.progress >= 50 ? 'bg-warning' : 'bg-secondary'
                  }`}
                  style={{ width: `${Math.min(kpi?.progress, 100)}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default SalesKPICards;
