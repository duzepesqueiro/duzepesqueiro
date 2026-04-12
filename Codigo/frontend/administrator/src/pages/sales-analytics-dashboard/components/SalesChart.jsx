import React, { useState, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import Button from '../../../components/ui/Button';

const SalesChart = ({ chartData, className = '' }) => {
  const [chartType, setChartType] = useState('combined');
  const [timeframe, setTimeframe] = useState('daily');

  // Agrupa os dados conforme granularidade selecionada
  const groupedData = useMemo(() => {
    const data = Array.isArray(chartData) ? chartData : [];
    if (timeframe === 'daily') {
      // Garantir ordenação por data
      return [...data].sort((a, b) => String(a?.period).localeCompare(String(b?.period)));
    }

    const toDate = (str) => {
      const d = str ? new Date(str) : null;
      return d && !isNaN(d.getTime()) ? d : null;
    };

    const map = new Map();

    for (const row of data) {
      const d = toDate(row?.period);
      if (!d) continue;
      let key;
      if (timeframe === 'weekly') {
        // calcular início da semana (segunda-feira)
        const day = d.getDay(); // 0=domingo
        const diff = (day + 6) % 7; // transforma para offset desde segunda
        const start = new Date(d);
        start.setDate(d.getDate() - diff);
        const yyyy = start.getFullYear();
        const mm = String(start.getMonth() + 1).padStart(2, '0');
        const dd = String(start.getDate()).padStart(2, '0');
        key = `Semana de ${yyyy}-${mm}-${dd}`;
      } else {
        // monthly
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        key = `${yyyy}-${mm}`;
      }

      const prev = map.get(key) || { revenue: 0, profitMarginSum: 0, count: 0 };
      prev.revenue += (row?.revenue || 0);
      prev.profitMarginSum += (row?.profitMargin || 0);
      prev.count += 1;
      map.set(key, prev);
    }

    const agg = Array.from(map.entries()).map(([period, agg]) => ({
      period,
      revenue: Math.round(agg.revenue),
      profitMargin: Number((agg.profitMarginSum / (agg.count || 1)).toFixed(1)),
    }));

    // Ordenar por período (lexicográfico funciona para nossos formatos)
    return agg.sort((a, b) => String(a.period).localeCompare(String(b.period)));
  }, [chartData, timeframe]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })?.format(value);
  };

  const formatPercentage = (value) => {
    return `${value}%`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-soft-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload?.map((entry, index) => (
            <div key={index} className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry?.color }}
                />
                <span className="text-sm text-muted-foreground">{entry?.dataKey}</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {entry?.dataKey === 'profitMargin' ? 
                  formatPercentage(entry?.value) : 
                  formatCurrency(entry?.value)
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      {/* Chart Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Desempenho das Vendas</h3>
          <p className="text-sm text-muted-foreground">Tendências de Receita com Análise de Margem de Lucro</p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          {/* Timeframe Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            {['daily', 'weekly', 'monthly']?.map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-smooth capitalize ${
                  timeframe === period
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Chart Type Toggle */}
          <div className="flex space-x-1">
            <Button
              variant={chartType === 'combined' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('combined')}
              iconName="BarChart3"
              iconPosition="left"
            >
              Combinado
            </Button>
            <Button
              variant={chartType === 'revenue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('revenue')}
              iconName="TrendingUp"
              iconPosition="left"
            >
              Faturamento
            </Button>
          </div>
        </div>
      </div>
      {/* Chart Container */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={groupedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis 
              dataKey="period" 
              stroke="var(--color-muted-foreground)"
              fontSize={12}
            />
            <YAxis 
              yAxisId="left"
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickFormatter={formatPercentage}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {(chartType === 'combined' || chartType === 'revenue') && (
              <Bar 
                yAxisId="left"
                dataKey="revenue" 
                fill="var(--color-primary)"
                name="Revenue"
                radius={[4, 4, 0, 0]}
              />
            )}
            
            {chartType === 'combined' && (
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="profitMargin" 
                stroke="var(--color-accent)"
                strokeWidth={3}
                dot={{ fill: 'var(--color-accent)', strokeWidth: 2, r: 4 }}
                name="Profit Margin (%)"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {/* Chart Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(groupedData?.reduce((sum, item) => sum + item?.revenue, 0))}
          </div>
          <div className="text-sm text-muted-foreground">Total Faturamento</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">
            {(groupedData?.reduce((sum, item) => sum + item?.profitMargin, 0) / (groupedData?.length || 1))?.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">Margem de Lucro Média</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-success">
            +12.5%
          </div>
          <div className="text-sm text-muted-foreground">Taxa de Crescimento</div>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;