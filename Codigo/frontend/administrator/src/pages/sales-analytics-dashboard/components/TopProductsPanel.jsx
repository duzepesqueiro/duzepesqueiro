import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const TopProductsPanel = ({ productsData, className = '' }) => {
  const [viewMode, setViewMode] = useState('revenue');
  const [timeFilter, setTimeFilter] = useState('week');

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })?.format(value);
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

  const sortedProducts = [...productsData]?.sort((a, b) => {
    if (viewMode === 'revenue') return b?.revenue - a?.revenue;
    if (viewMode === 'quantity') return b?.quantity - a?.quantity;
    if (viewMode === 'margin') return b?.profitMargin - a?.profitMargin;
    return 0;
  });

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Melhores Produtos</h3>
            <p className="text-sm text-muted-foreground">Itens com Melhor Desempenho por Categoria</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            iconName="ExternalLink"
            iconPosition="right"
          >
            Visualizar Todos
          </Button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-muted rounded-lg p-1">
          {[
            { key: 'revenue', label: 'Receita', icon: 'DollarSign' },
            { key: 'quantity', label: 'Quantidade', icon: 'Package' },
            { key: 'margin', label: 'Margem', icon: 'TrendingUp' }
          ]?.map((mode) => (
            <button
              key={mode?.key}
              onClick={() => setViewMode(mode?.key)}
              className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-md transition-smooth flex-1 justify-center ${
                viewMode === mode?.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={mode?.icon} size={14} />
              <span>{mode?.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Products List */}
      <div className="p-6">
        <div className="space-y-4">
          {sortedProducts?.slice(0, 8)?.map((product, index) => (
            <div key={product?.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted transition-smooth">
              {/* Rank */}
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                index === 0 ? 'bg-warning text-warning-foreground' :
                index === 1 ? 'bg-muted text-muted-foreground' :
                index === 2 ? 'bg-accent/20 text-accent': 'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>

              {/* Product Image */}
              <div className="flex-shrink-0">
                <Image
                  src={product?.image}
                  alt={product?.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{product?.name}</h4>
                <p className="text-sm text-muted-foreground">{product?.category}</p>
              </div>

              {/* Metrics */}
              <div className="text-right">
                <div className="font-semibold text-foreground">
                  {viewMode === 'revenue' && formatCurrency(product?.revenue)}
                  {viewMode === 'quantity' && `${product?.quantity} vendidos`}
                  {viewMode === 'margin' && `${product?.profitMargin}%`}
                </div>
                <div className={`flex items-center justify-end space-x-1 text-xs ${getChangeColor(product?.change)}`}>
                  <Icon name={getChangeIcon(product?.change)} size={12} />
                  <span>{Math.abs(product?.change)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {formatCurrency(sortedProducts?.reduce((sum, p) => sum + p?.revenue, 0))}
              </div>
              <div className="text-xs text-muted-foreground">Receita Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {sortedProducts?.reduce((sum, p) => sum + p?.quantity, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Unidades Vendidas</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopProductsPanel;