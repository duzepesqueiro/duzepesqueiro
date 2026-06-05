import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/ui/Header';
import AlertNotificationCenter from '../../components/ui/AlertNotificationCenter';
import ExportControlPanel from '../../components/ui/ExportControlPanel';
import EventsKPICards from './components/EventsKPICards';
import EventsChart from './components/EventsChart';
import Button from '../../components/ui/Button';
import QuickActions from '../../components/ui/QuickActions';
import EventsDataTable from './components/EventsDataTable';
import { getAllEvents, getEventKpis, getMonthlyEventsChart, getWeeklyEventsChart, getYearlyEventsChart } from "../../utils/eventService";
import { exportAdminData } from '../../utils/exportService';

const EventsManagementDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [kpiError, setKpiError] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [chartError, setChartError] = useState(null);
  const [chartView, setChartView] = useState('weekly');

  const handleChartFiltersChange = useCallback(({ view }) => {
    if (typeof view !== 'undefined') setChartView(view || 'weekly');
  }, []);

  const getCurrentPeriod = () => {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  };

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      await getAllEvents({ page: 1, limit: 1 });
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar eventos:", err);
      setError("Falha ao carregar eventos (backend pode estar offline).");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchKpis = useCallback(async () => {
    try {
      setKpiLoading(true);
      const { month, year } = getCurrentPeriod();
      const data = await getEventKpis({ month, year });
      const mapped = [
        {
          id: 1,
          label: "Eventos Ativos",
          value: Number(data?.activeEvents?.value ?? 0),
          type: "number",
          change: Number(data?.activeEvents?.percentageChange ?? 0),
          period: "último mês",
          target: data?.activeEvents?.goal != null ? `Meta: ${data.activeEvents.goal}` : "Meta não definida",
          progress: data?.activeEvents?.goalPercentage != null ? Number(data.activeEvents.goalPercentage) : 0,
          icon: "CalendarDays",
          iconBg: "bg-primary/10",
          iconColor: "text-primary",
        },
        {
          id: 2,
          label: "Participantes Inscritos",
          value: Number(data?.registeredParticipants?.value ?? 0),
          type: "number",
          change: Number(data?.registeredParticipants?.percentageChange ?? 0),
          period: "último mês",
          target: data?.registeredParticipants?.goal != null ? `Meta: ${data.registeredParticipants.goal}` : "Meta não definida",
          progress: data?.registeredParticipants?.goalPercentage != null ? Number(data.registeredParticipants.goalPercentage) : 0,
          icon: "Users",
          iconBg: "bg-success/10",
          iconColor: "text-success",
        },
        {
          id: 3,
          label: "Percentual de Inscritos",
          value: Number(data?.registrationPercentage?.value ?? 0),
          type: "percentage",
          change: Number(data?.registrationPercentage?.percentageChange ?? 0),
          period: "último mês",
          target: data?.registrationPercentage?.goal != null ? `Meta: ${data.registrationPercentage.goal}%` : "Meta não definida",
          progress: data?.registrationPercentage?.goalPercentage != null ? Number(data.registrationPercentage.goalPercentage) : 0,
          icon: "CheckCircle",
          iconBg: "bg-secondary/10",
          iconColor: "text-secondary",
        },
        {
          id: 4,
          label: "Eventos Lotados",
          value: Number(data?.soldOutEvents?.value ?? 0),
          type: "number",
          change: Number(data?.soldOutEvents?.percentageChange ?? 0),
          period: "último mês",
          target: data?.soldOutEvents?.goal != null ? `Meta: ${data.soldOutEvents.goal}` : "Meta não definida",
          progress: data?.soldOutEvents?.goalPercentage != null ? Number(data.soldOutEvents.goalPercentage) : 0,
          icon: "AlertTriangle",
          iconBg: "bg-accent/10",
          iconColor: "text-accent",
        },
      ];
      setKpis(mapped);
      setKpiError(null);
    } catch (err) {
      console.error('Erro ao carregar KPIs de eventos:', err);
      if (err?.response?.status === 401) {
        setKpiError('Sessão expirada ou token ausente para KPI. Faça login novamente.');
      } else if (err?.response?.status === 403) {
        setKpiError('Sem permissão para acessar KPIs de eventos.');
      } else if (err?.response?.status === 400) {
        setKpiError('Parâmetros inválidos ao consultar KPI de eventos.');
      } else {
        setKpiError('Falha ao carregar KPIs (backend pode estar offline).');
      }
      setKpis([]);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  const handleExport = useCallback(async (format) => {
    try {
      await exportAdminData('events', format);
    } catch (err) {
      console.error('Falha ao exportar eventos:', err);
      alert('Falha ao exportar. Verifique o servidor.');
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const now = new Date();
        const currentYear = now.getFullYear();
        let mapped = [];
        if (chartView === "weekly") {
          const weeklyData = await getWeeklyEventsChart();
          const labels = Array.isArray(weeklyData?.days) ? weeklyData.days : [];
          const events = Array.isArray(weeklyData?.events) ? weeklyData.events : [];
          const participants = Array.isArray(weeklyData?.participants) ? weeklyData.participants : [];
          mapped = labels.map((label, index) => ({
            period: label,
            events: Number(events[index] ?? 0),
            participants: Number(participants[index] ?? 0),
          }));
        } else if (chartView === "yearly") {
          const yearlyData = await getYearlyEventsChart({
            startYear: currentYear - 4,
            endYear: currentYear,
          });
          const years = Array.isArray(yearlyData?.years) ? yearlyData.years : [];
          const events = Array.isArray(yearlyData?.events) ? yearlyData.events : [];
          const participants = Array.isArray(yearlyData?.participants) ? yearlyData.participants : [];
          mapped = years.map((year, index) => ({
            period: String(year),
            events: Number(events[index] ?? 0),
            participants: Number(participants[index] ?? 0),
          }));
        } else {
          const monthlyData = await getMonthlyEventsChart({ year: currentYear });
          const months = Array.isArray(monthlyData?.months) ? monthlyData.months : [];
          const events = Array.isArray(monthlyData?.events) ? monthlyData.events : [];
          const participants = Array.isArray(monthlyData?.participants) ? monthlyData.participants : [];
          mapped = months.map((month, index) => ({
            period: month,
            events: Number(events[index] ?? 0),
            participants: Number(participants[index] ?? 0),
          }));
        }
        if (mounted) {
          setChartData(mapped);
          setChartError(null);
        }
      } catch (err) {
        if (mounted) {
          console.error('Erro ao carregar gráfico de eventos:', err);
          setChartError('Falha ao carregar gráfico (backend pode estar offline).');
          setChartData([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, [chartView]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex justify-center items-center h-96">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Carregando informações dos eventos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16 pb-8 max-w mx-auto px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Painel de Gerenciamento de Eventos</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Acompanhe estatísticas de participantes e eventos com filtros por semana, mês e ano.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AlertNotificationCenter />
            <ExportControlPanel
              onExport={handleExport}
              availableFormats={['excel', 'csv']}
              title="Exportar Relatório de Eventos"
            />
            <Button
              variant="default"
              iconName="RefreshCw"
              iconPosition="left"
              onClick={fetchEvents}
            >
              Atualizar Dados
            </Button>
          </div>
        </div>
        {error ? (
          <div className="mb-8 rounded-lg border border-error/40 bg-error/10 p-4 text-sm text-error">
            {error}
          </div>
        ) : null}
        {kpiError ? (
          <div className="mb-8 rounded-lg border border-error/40 bg-error/10 p-4 text-sm text-error">
            {kpiError}
          </div>
        ) : null}
        {kpiLoading ? (
          <div className="mb-8 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Carregando KPIs...
          </div>
        ) : (
          <EventsKPICards kpiData={kpis} className="mb-8" />
        )}
        <div className="grid grid-cols-1 gap-8 mb-8 w-full">
          <div className="flex flex-col gap-8 w-full">
            {chartError ? (
              <div className="rounded-lg border border-error/40 bg-error/10 p-4 text-sm text-error">
                {chartError}
              </div>
            ) : null}
            <EventsChart
              chartData={chartData}
              className="w-full"
              view={chartView}
              onFiltersChange={handleChartFiltersChange}
            />
            <EventsDataTable
              onDataChanged={async () => {
                await fetchEvents();
                await fetchKpis();
              }}
            />
          </div>
        </div>
        <QuickActions />
      </div>
    </div>
  );
};

export default EventsManagementDashboard;
