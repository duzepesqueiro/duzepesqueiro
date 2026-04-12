import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#4f46e5', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#e11d48'];

const LogsPieChart = ({ className = '', data = [] }) => {
  const total = data?.reduce((s, d) => s + (d?.value || 0), 0) || 0;
  const withPct = (Array.isArray(data) ? data : []).map((d) => ({
    ...d,
    pct: total > 0 ? Math.round(((d?.value || 0) / total) * 1000) / 10 : 0,
  }));
  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Distribuição de Incidentes</h3>
          <p className="text-sm text-muted-foreground">Por tipo/severidade</p>
          <div className="mt-2 text-xs text-muted-foreground">Cada cor representa um tipo de incidente. A legenda mostra o total e a porcentagem por tipo.</div>
        </div>
        <div className="text-sm text-muted-foreground">Total: {total}</div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={withPct} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
              {withPct.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(val, name) => [val, name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legenda customizada com valores e porcentagens */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {withPct.map((item, idx) => (
          <div key={`legend-${idx}`} className="flex items-center text-sm text-muted-foreground">
            <span
              className="inline-block w-3 h-3 rounded-sm mr-2"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="mr-1 font-medium text-foreground">{item.name}:</span>
            <span className="mr-1">{item.value}</span>
            <span>({item.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogsPieChart;