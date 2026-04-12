import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const LogsScatterChart = ({ className = '', data = [] }) => {
  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">TTF x TTR</h3>
          <p className="text-sm text-muted-foreground">Tempo até falha (TTF) vs tempo de reparo (TTR)</p>
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            <p><span className="font-medium">TTF</span>: Tempo até a falha (minutos) — quanto tempo o sistema opera até ocorrer um incidente.</p>
            <p><span className="font-medium">TTR</span>: Tempo até o reparo (minutos) — quanto tempo é necessário para restaurar o serviço após a falha.</p>
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis type="number" dataKey="ttf" name="TTF (min)" unit=" min" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis type="number" dataKey="ttr" name="TTR (min)" unit=" min" stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Incidentes" data={data} fill="var(--color-primary)" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LogsScatterChart;