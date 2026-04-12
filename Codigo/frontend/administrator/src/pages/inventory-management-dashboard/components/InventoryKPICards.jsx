import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const InventoryKPICards = ({ items, loading, error, onRetry }) => {
  const kpiData = Array.isArray(items) ? items : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-6 animate-pulse">
            <div className="h-6 w-24 bg-muted rounded mb-4" />
            <div className="h-8 w-32 bg-muted rounded mb-2" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-card border border-border rounded-lg text-error">
        <div className="flex items-center justify-between">
          <span>{String(error)}</span>
          <Button variant="outline" size="sm" iconName="RefreshCw" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }
  const getChangeColor = (type) => {
    switch (type) {
      case 'positive':
        return 'text-success';
      case 'negative':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const getChangeIcon = (type) => {
    switch (type) {
      case 'positive':
        return 'TrendingUp';
      case 'negative':
        return 'TrendingDown';
      default:
        return 'Minus';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {kpiData?.map((kpi) => (
        <div
          key={kpi?.id}
          className="bg-card border border-border rounded-lg p-6 hover:shadow-soft-md transition-smooth"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-secondary/20 rounded-lg">
              <Icon name={kpi?.icon} size={24} className="text-primary" />
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Ao vivo</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-body font-medium text-muted-foreground">
              {kpi?.title}
            </h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-heading font-bold text-foreground">
                {kpi?.value}
              </span>
              <div className={`flex items-center space-x-1 ${getChangeColor(kpi?.changeType)}`}>
                <Icon name={getChangeIcon(kpi?.changeType)} size={14} />
                <span className="text-sm font-medium">{kpi?.change}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{kpi?.description}</p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Atualização {kpi?.lastUpdated}
              </span>
              <button className="text-xs text-primary hover:text-primary/80 transition-smooth">
                Visualizar Detalhes
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InventoryKPICards;
