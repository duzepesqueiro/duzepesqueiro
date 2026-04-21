import React from 'react';
import { Bar, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

const HostingRevenueChart = ({ data = [], periodLabel = '', isLoading = false, error = '' }) => {

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
          <p className="text-sm text-muted-foreground">
            {periodLabel ? `Comparativo do período: ${periodLabel}` : 'Comparativo por período selecionado'}
          </p>
        </div>
      </div>

      <div className="h-80">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Carregando receita e diárias...
          </div>
        ) : null}
        {!isLoading && error ? (
          <div className="h-full flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : null}
        {!isLoading && !error && data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Sem dados de receita para o período selecionado.
          </div>
        ) : null}
        {!isLoading && !error && data.length > 0 ? (
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
        ) : null}
      </div>
    </div>
  );
};

export default HostingRevenueChart;
