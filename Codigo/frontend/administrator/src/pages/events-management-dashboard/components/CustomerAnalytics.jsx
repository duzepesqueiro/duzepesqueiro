import React, { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CustomerAnalytics = ({ customerData, segmentData, className = '' }) => {
  const [activeTab, setActiveTab] = useState('segments');

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Análise do Cliente</h3>
            <p className="text-sm text-muted-foreground">Padrões de comportamento e percepções de segmentação</p>
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

        {/* Tab Navigation */}
        <div className="flex bg-muted rounded-lg p-1">
          {[
            { key: 'segments', label: 'Segmentos', icon: 'Users' },
            { key: 'behavior', label: 'Comportamento', icon: 'Activity' },
            { key: 'retention', label: 'Retenção', icon: 'Repeat' }
          ]?.map((tab) => (
            <button
              key={tab?.key}
              onClick={() => setActiveTab(tab?.key)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-smooth flex-1 justify-center ${
                activeTab === tab?.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name={tab?.icon} size={16} />
              <span>{tab?.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Content */}
      <div className="p-6">
        {activeTab === 'segments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              <h4 className="font-medium text-foreground mb-4">Perfil do Cliente</h4>
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
              <h4 className="font-medium text-foreground mb-4">Desempenho do Segmento</h4>
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
        )}

        {activeTab === 'behavior' && (
          <div>
            <h4 className="font-medium text-foreground mb-4">Padrões de compra</h4>
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis 
                    dataKey="timeSlot" 
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="purchases" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Behavior Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Icon name="Clock" size={24} className="text-primary mx-auto mb-2" />
                <div className="font-semibold text-foreground">Horário de maior fluxo</div>
                <div className="text-sm text-muted-foreground">10 AM - 2 PM</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Icon name="ShoppingCart" size={24} className="text-secondary mx-auto mb-2" />
                <div className="font-semibold text-foreground">Cesta média</div>
                <div className="text-sm text-muted-foreground">$45.60</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Icon name="Repeat" size={24} className="text-accent mx-auto mb-2" />
                <div className="font-semibold text-foreground">Taxa de devolução </div>
                <div className="text-sm text-muted-foreground">68%</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'retention' && (
          <div>
            <h4 className="font-medium text-foreground mb-4">Análise de Retenção dos Clientes</h4>
            
            {/* Retention Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'New Customers', value: '156', change: '+12%', icon: 'UserPlus' },
                { label: 'Returning Customers', value: '342', change: '+8%', icon: 'Users' },
                { label: 'Retention Rate', value: '68.5%', change: '+3.2%', icon: 'Repeat' },
                { label: 'Churn Rate', value: '31.5%', change: '-2.1%', icon: 'UserMinus' }
              ]?.map((metric) => (
                <div key={metric?.label} className="text-center p-4 bg-muted rounded-lg">
                  <Icon name={metric?.icon} size={24} className="text-primary mx-auto mb-2" />
                  <div className="font-semibold text-foreground">{metric?.value}</div>
                  <div className="text-sm text-muted-foreground">{metric?.label}</div>
                  <div className="text-xs text-success mt-1">{metric?.change}</div>
                </div>
              ))}
            </div>

            {/* Retention Cohort */}
            <div className="bg-muted rounded-lg p-4">
              <h5 className="font-medium text-foreground mb-3">Coorte de Retenção (M5)</h5>
              <div className="grid grid-cols-7 gap-2 text-xs">
                <div className="font-medium text-muted-foreground">Mês</div>
                <div className="font-medium text-muted-foreground">M0</div>
                <div className="font-medium text-muted-foreground">M1</div>
                <div className="font-medium text-muted-foreground">M2</div>
                <div className="font-medium text-muted-foreground">M3</div>
                <div className="font-medium text-muted-foreground">M4</div>
                <div className="font-medium text-muted-foreground">M5</div>
                
                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']?.map((month, index) => (
                  <React.Fragment key={month}>
                    <div className="font-medium text-foreground">{month}</div>
                    {[100, 75, 65, 58, 52, 48]?.slice(0, 6 - index)?.map((rate, i) => (
                      <div 
                        key={i}
                        className={`text-center py-1 rounded ${
                          rate >= 70 ? 'bg-success text-success-foreground' :
                          rate >= 50 ? 'bg-warning text-warning-foreground': 'bg-error text-error-foreground'
                        }`}
                      >
                        {rate}%
                      </div>
                    ))}
                    {Array(index)?.fill(null)?.map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerAnalytics;