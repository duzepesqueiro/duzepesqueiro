import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Icon from '../../../components/AppIcon';

const CategoryPerformance = ({ categories, className = '' }) => {
  const COLORS = [
    'var(--color-primary)',
    'var(--color-secondary)', 
    'var(--color-accent)',
    'var(--color-warning)',
    'var(--color-success)',
    'var(--color-error)'
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload?.length) {
      const data = payload?.[0]?.payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-soft-lg">
          <p className="font-body font-medium text-foreground">{data?.name}</p>
          <div className="flex items-center space-x-2 mt-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data?.fill }}
            />
            <span className="text-sm text-muted-foreground">Quantidade:</span>
            <span className="text-sm font-medium text-foreground">{data?.value?.toLocaleString()}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {data?.percentage}% do Total de Vendas
          </div>
        </div>
      );
    }
    return null;
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      'Fishing Equipment': 'Fish',
      'Boat Rentals': 'Anchor',
      'Bait & Tackle': 'Zap',
      'Licenses & Permits': 'FileText',
      'Food & Beverages': 'Coffee',
      'Accessories': 'Package',
      // Portuguese mappings
      'Equipamentos de Pesca': 'Fish',
      'Iscas e Anzóis': 'Zap',
      'Acessórios': 'Package',
      'Equipamentos para Aluguel': 'Anchor',
      'Equipamentos para venda': 'Fish'
    };
    return iconMap?.[category] || 'Circle';
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
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">Desempenho das Categorias</h3>
          <p className="text-sm text-muted-foreground">Distribuição da Receita por Categoria de Produto</p>
        </div>
        <div className="flex items-center space-x-2">
          <Icon name="PieChart" size={20} className="text-muted-foreground" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {categories?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS?.[index % COLORS?.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend & Details */}
        <div className="space-y-3">
          {categories?.map((category, index) => {
            const changeInfo = getChangeColor(category?.change);
            const changeIconName = getChangeIcon(category?.change);
            
            return (
              <div key={category?.name} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-smooth">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS?.[index % COLORS?.length] }}
                  />
                  <Icon 
                    name={getCategoryIcon(category?.name)} 
                    size={18} 
                    className="text-muted-foreground" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-body font-medium text-foreground text-sm truncate">
                    {category?.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {category?.percentage}% do Total
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-body font-semibold text-foreground text-sm">
                    {category?.value?.toLocaleString()}
                  </div>
                  <div className={`flex items-center space-x-1 text-xs ${changeInfo}`}>
                    <Icon name={changeIconName} size={12} />
                    <span>{Math.abs(category?.change)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Melhor Desempenho:</span>
            <span className="font-medium text-success">
              {categories?.length
                ? categories.reduce((best, cat) => (cat?.change > best?.change ? cat : best), categories[0])?.name
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Categorias Totais:</span>
            <span className="font-medium text-foreground">{categories?.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPerformance;
