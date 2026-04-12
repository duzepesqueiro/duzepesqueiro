import React from 'react';
import Icon from '../../../components/AppIcon';

const HostingKPICard = ({ title, value, icon, trend, color = 'var(--color-primary)' }) => {
  const isPositiveTrend = trend?.isPositive ?? false;
  const trendIcon = isPositiveTrend ? 'TrendingUp' : 'TrendingDown';
  const trendColor = isPositiveTrend ? 'text-success' : 'text-error';
  const trendValue = trend ? `${isPositiveTrend ? '+' : '-'}${Math.abs(trend.value)}%` : null;

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-soft-md transition-smooth">
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-lg text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="space-y-2">
          {trendValue ? (
            <div className={`inline-flex items-center gap-1 text-sm font-medium ${trendColor}`}>
              <Icon name={trendIcon} size={16} />
              <span>{trendValue}</span>
            </div>
          ) : (
            <div className="h-6" />
          )}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-foreground">{value}</h3>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
};

export default HostingKPICard;
