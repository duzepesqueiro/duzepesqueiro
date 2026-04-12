import React from 'react';

const fmt = (n) => {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('pt-BR');
};

const fmtTime = (mins) => {
  if (mins == null || isNaN(mins)) return '—';
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
};

const LogsKPICards = ({ className = '', metrics = {} }) => {
  const { incidents = 0, availabilityPct = 99.5, mttfMin = 240, mttrMin = 45 } = metrics || {};

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">Incidentes no período</p>
        <div className="mt-1 text-2xl font-bold text-foreground">{fmt(incidents)}</div>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">Disponibilidade</p>
        <div className="mt-1 text-2xl font-bold text-success">{fmt(availabilityPct)}%</div>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">MTTF (médio)</p>
        <div className="mt-1 text-2xl font-bold text-foreground">{fmtTime(mttfMin)}</div>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">MTTR (médio)</p>
        <div className="mt-1 text-2xl font-bold text-foreground">{fmtTime(mttrMin)}</div>
      </div>
    </div>
  );
};

export default LogsKPICards;