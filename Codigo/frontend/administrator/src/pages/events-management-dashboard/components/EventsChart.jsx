import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const EventsChart = ({
  chartData,
  className = '',
  view = 'weekly',
  onFiltersChange,
}) => {
  const formatNumber = (value) => value?.toLocaleString('pt-BR') ?? '0';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-soft-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>{entry.name}</span>
              <span>
                {formatNumber(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  const totalParticipants = chartData.reduce((sum, e) => sum + (e.participants ?? 0), 0);
  const totalEvents = chartData.reduce((sum, e) => sum + (e.events ?? 0), 0);

  const handleTimeframeClick = (next) => {
    if (next === view) return;
    onFiltersChange && onFiltersChange({ view: next });
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Estatística dos Eventos</h3>
          <p className="text-sm text-muted-foreground">
            Participantes e quantidade de eventos por período
          </p>
        </div>
        {/* Filtros integrados do gráfico, idênticos em estilo ao de vendas */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4 lg:mt-0">
          <div className="flex bg-muted rounded-lg p-1">
            {[
              { value: 'weekly', label: 'semana' },
              { value: 'monthly', label: 'mês' },
              { value: 'yearly', label: 'ano' },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => handleTimeframeClick(period.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-smooth capitalize ${
                  view === period.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="period" stroke="var(--color-muted-foreground)" />
            <YAxis
              yAxisId="left"
              tickFormatter={formatNumber}
              stroke="var(--color-muted-foreground)"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatNumber}
              stroke="var(--color-muted-foreground)"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="right"
              dataKey="events"
              fill="var(--color-primary)"
              name="Eventos"
              radius={[4, 4, 0, 0]}
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="participants"
              stroke="var(--color-accent)"
              strokeWidth={3}
              dot={{ fill: 'var(--color-accent)', r: 4 }}
              name="Participantes"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-bold">{formatNumber(totalParticipants)}</div>
          <div className="text-sm text-muted-foreground">Participantes Totais</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{formatNumber(totalEvents)}</div>
          <div className="text-sm text-muted-foreground">Eventos Totais</div>
        </div>
      </div>
    </div>
  );
};

export default EventsChart;
