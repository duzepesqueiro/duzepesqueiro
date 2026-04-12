import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import LogsKPICards from './components/LogsKPICards';
import QuickActions from '../../components/ui/QuickActions';
import LogsPieChart from './components/LogsPieChart';
import LogsScatterChart from './components/LogsScatterChart';

// Dados simulados de logs/incident types
const sampleIncidents = [
  { id: 1, component: 'API', severity: 'Alta', type: 'Erro 500', ttf: 180, ttr: 30 },
  { id: 2, component: 'DB', severity: 'Média', type: 'Deadlock', ttf: 240, ttr: 60 },
  { id: 3, component: 'Frontend', severity: 'Baixa', type: 'Timeout', ttf: 90, ttr: 20 },
  { id: 4, component: 'API', severity: 'Alta', type: 'Erro 500', ttf: 360, ttr: 90 },
  { id: 5, component: 'Infra', severity: 'Média', type: 'Rede', ttf: 720, ttr: 45 },
  { id: 6, component: 'DB', severity: 'Alta', type: 'Falha Replica', ttf: 600, ttr: 120 },
];

const LogsDashboard = () => {
  const metrics = useMemo(() => {
    const incidents = sampleIncidents.length;
    const avgTTF = incidents ? sampleIncidents.reduce((s, i) => s + (i.ttf || 0), 0) / incidents : 0;
    const avgTTR = incidents ? sampleIncidents.reduce((s, i) => s + (i.ttr || 0), 0) / incidents : 0;
    // disponibilidade simulada
    const availabilityPct = 99.3;
    return { incidents, availabilityPct, mttfMin: Math.round(avgTTF), mttrMin: Math.round(avgTTR) };
  }, []);

  const pieData = useMemo(() => {
    const byType = new Map();
    sampleIncidents.forEach((i) => {
      const key = `${i.type}`;
      byType.set(key, (byType.get(key) || 0) + 1);
    });
    return Array.from(byType.entries()).map(([name, value]) => ({ name, value }));
  }, []);

  const scatterData = useMemo(() => {
    return sampleIncidents.map((i) => ({ ttf: i.ttf, ttr: i.ttr }));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Logs e Métricas | Administração</title>
        <meta name="description" content="Logs de sistema e métricas de confiabilidade como MTTF e MTTR." />
      </Helmet>

      <Header />

      <div className="pt-16 pb-8">
        <div className="max-w mx-auto px-8">
          {/* Cabeçalho da página */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Logs e Métricas</h1>
              <p className="text-muted-foreground">Acompanhe incidentes, disponibilidade, MTTF e MTTR.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" iconName="RefreshCw">Atualizar</Button>
              <Button variant="outline" iconName="Download">Exportar</Button>
            </div>
          </div>

          {/* KPIs */}
          <LogsKPICards className="mb-6" metrics={metrics} />

          {/* Gráficos */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <LogsPieChart data={pieData} />
            <LogsScatterChart data={scatterData} />
          </div>

          {/* Tabela de logs simples */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Logs recentes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">Componente</th>
                    <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">Tipo</th>
                    <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">Severidade</th>
                    <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">TTF (min)</th>
                    <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">TTR (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleIncidents.map((i) => (
                    <tr key={i.id} className="border-b border-border hover:bg-muted/40">
                      <td className="p-3 text-sm text-foreground">{i.component}</td>
                      <td className="p-3 text-sm text-muted-foreground">{i.type}</td>
                      <td className="p-3 text-sm text-muted-foreground">{i.severity}</td>
                      <td className="p-3 text-sm text-muted-foreground">{i.ttf}</td>
                      <td className="p-3 text-sm text-muted-foreground">{i.ttr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <QuickActions className="mt-6" />
        </div>
      </div>
    </div>
  );
};

export default LogsDashboard;
