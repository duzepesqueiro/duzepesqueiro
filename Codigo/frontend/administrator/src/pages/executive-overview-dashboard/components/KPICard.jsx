import React from 'react';
import Icon from '../../../components/AppIcon';

const KPICard = ({ title, value, change, changeType, trend, icon, color = 'primary' }) => {
  const getChangeColor = () => {
    if (changeType === 'positive') return 'text-success';
    if (changeType === 'negative') return 'text-error';
    return 'text-muted-foreground';
  };

  const getChangeIcon = () => {
    if (changeType === 'positive') return 'TrendingUp';
    if (changeType === 'negative') return 'TrendingDown';
    return 'Minus';
  };

  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'bg-success/10 text-success border-success/20';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'error':
        return 'bg-error/10 text-error border-error/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-soft-md transition-smooth">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg border ${getColorClasses()}`}>
          <Icon name={icon} size={24} />
        </div>
        <div className="text-right">
          <div className={`flex items-center space-x-1 text-sm ${getChangeColor()}`}>
            <Icon name={getChangeIcon()} size={16} />
            <span className="font-medium">{change}</span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-heading font-bold text-foreground">{value}</h3>
        <p className="text-sm text-muted-foreground font-body">{title}</p>
      </div>
      {trend && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tendência de 7 Dias</span>
            <div className="flex space-x-1">
              {trend?.map((point, index) => (
                <div
                  key={index}
                  className={`w-1 rounded-full ${
                    point > 50 ? 'bg-success h-3' : point > 25 ? 'bg-warning h-2' : 'bg-error h-1'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPICard;
