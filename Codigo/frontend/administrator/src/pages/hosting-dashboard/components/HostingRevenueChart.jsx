import React, { useMemo, useState } from 'react';
import { Bar, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

const periodOptions = [
  { label: 'Semana', value: 'week' },
  { label: 'Mês', value: 'month' },
  { label: 'Ano', value: 'year' },
];

const chartDataByPeriod = {
  week: [
    { chalet: 'Chalé 1', revenue: 3200, stays: 12 },
    { chalet: 'Chalé 2', revenue: 4100, stays: 15 },
    { chalet: 'Chalé 3', revenue: 2750, stays: 10 },
    { chalet: 'Chalé 4', revenue: 5100, stays: 18 },
    { chalet: 'Chalé 5', revenue: 3600, stays: 13 },
  ],
  month: [
    { chalet: 'Chalé 1', revenue: 12400, stays: 43 },
    { chalet: 'Chalé 2', revenue: 15100, stays: 52 },
    { chalet: 'Chalé 3', revenue: 9800, stays: 35 },
    { chalet: 'Chalé 4', revenue: 17300, stays: 59 },
    { chalet: 'Chalé 5', revenue: 13700, stays: 47 },
  ],
  year: [
    { chalet: 'Chalé 1', revenue: 137000, stays: 475 },
    { chalet: 'Chalé 2', revenue: 159000, stays: 542 },
    { chalet: 'Chalé 3', revenue: 112000, stays: 398 },
    { chalet: 'Chalé 4', revenue: 188000, stays: 608 },
    { chalet: 'Chalé 5', revenue: 145000, stays: 521 },
  ],
};

const HostingRevenueChart = () => {
  const [activePeriod, setActivePeriod] = useState('month');

  const data = useMemo(() => chartDataByPeriod[activePeriod] || [], [activePeriod]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) {
      return null;
    }

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-soft-lg">
        <p className="font-medium text-foreground">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm text-muted-foreground">
            {entry.name}:{' '}
            <span className="text-foreground font-semibold">
              {entry.dataKey === 'revenue'
                ? `R$ ${Number(entry.value).toLocaleString('pt-BR')}`
                : Number(entry.value).toLocaleString('pt-BR')}
            </span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">Receita por Chalé</h3>
          <p className="text-sm text-muted-foreground">Comparativo por período selecionado</p>
        </div>
        <div className="flex bg-muted rounded-lg p-1">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActivePeriod(option.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-smooth ${
                activePeriod === option.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="chalet" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis
              yAxisId="left"
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickFormatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickFormatter={(value) => Number(value).toLocaleString('pt-BR')}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="right"
              dataKey="stays"
              fill="var(--color-primary)"
              name="Diárias"
              radius={[4, 4, 0, 0]}
              animationDuration={300}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-success)"
              strokeWidth={3}
              dot={{ fill: 'var(--color-success)', r: 4 }}
              activeDot={{ r: 6, stroke: 'var(--color-success)', strokeWidth: 2 }}
              name="Receita"
              animationDuration={300}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HostingRevenueChart;
