import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Button from '../../../components/ui/Button';

const CustomerAnalytics = ({ customerData, segmentData, className = '' }) => {
  const COLORS = ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-accent)', 'var(--color-warning)'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })?.format(value);
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
                {typeof entry?.value === 'number' && entry?.value > 1000 ? 
                  formatCurrency(entry?.value) : 
                  entry?.value
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100)?.toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Análise de Clientes</h3>
            <p className="text-sm text-muted-foreground">Padrões de Comportamento</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            iconName="Download"
            iconPosition="left"
          >
            Exportar
          </Button>
        </div>
      </div>
      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="text-sm text-muted-foreground">Clientes ativos</div>
            <div className="text-2xl font-bold text-foreground">{Number(customerData?.activeCustomers || 0).toLocaleString('pt-BR')}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="text-sm text-muted-foreground">Clientes recorrentes</div>
            <div className="text-2xl font-bold text-foreground">{Number(customerData?.returningCustomers || 0).toLocaleString('pt-BR')}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="text-sm text-muted-foreground">Novos clientes</div>
            <div className="text-2xl font-bold text-foreground">{Number(customerData?.newCustomers || 0).toLocaleString('pt-BR')}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="text-sm text-muted-foreground">Frequência de compra</div>
            <div className="text-2xl font-bold text-foreground">{Number(customerData?.purchaseFrequency || 0).toLocaleString('pt-BR')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <h4 className="font-medium text-foreground mb-4">Segmentos de Clientes</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {segmentData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS?.[index % COLORS?.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Segment Details */}
          <div>
            <h4 className="font-medium text-foreground mb-4">Segmentação do Desempenho</h4>
            <div className="space-y-4">
              {segmentData?.map((segment, index) => (
                <div key={segment?.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS?.[index % COLORS?.length] }}
                    />
                    <div>
                      <div className="font-medium text-foreground">{segment?.name}</div>
                      <div className="text-sm text-muted-foreground">{segment?.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">{segment?.value}</div>
                    <div className="text-sm text-muted-foreground">{segment?.revenue}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default CustomerAnalytics;
