import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/AppIcon';
import ExportControlPanel from '../../components/ui/ExportControlPanel';
import HostingLayout from './components/HostingLayout';
import HostingKPICard from './components/HostingKPICard';
import HostingRevenueChart from './components/HostingRevenueChart';
import OccupationMap from './components/OccupationMap';
import { exportAdminData } from '../../utils/exportService';
import { getHostingDashboardKpis, getHostingDashboardRevenue } from '../../utils/hostingService';

const periodOptions = [
  { label: 'Semana', value: 'semana' },
  { label: 'Mês', value: 'mes' },
  { label: 'Ano', value: 'ano' },
];

const HostingDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [kpiResponse, setKpiResponse] = useState(null);
  const [revenueResponse, setRevenueResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const toErrorMessage = (apiError, fallback) => {
    const message = apiError?.response?.data?.message;
    if (Array.isArray(message) && message.length) {
      return message.join(', ');
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return fallback;
  };

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });

  const handleExport = async (format) => {
    try {
      await exportAdminData('hosting', format);
    } catch (err) {
      console.error('Falha ao exportar hospedagem:', err);
      alert('Falha ao exportar. Verifique o servidor.');
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [kpis, revenue] = await Promise.all([
          getHostingDashboardKpis({ periodo: selectedPeriod }),
          getHostingDashboardRevenue({ periodo: selectedPeriod }),
        ]);
        if (!isMounted) {
          return;
        }
        setKpiResponse(kpis);
        setRevenueResponse(revenue);
      } catch (apiError) {
        if (isMounted) {
          setError(toErrorMessage(apiError, 'Não foi possível carregar os dados da dashboard de hospedagem.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [selectedPeriod]);

  const cards = useMemo(() => {
    const kpis = kpiResponse?.kpis || {};
    const occupancyRate = Number(
      kpiResponse?.taxaOcupacao ?? kpis?.taxaOcupacao ?? 0,
    );
    return [
      {
        title: 'Total de Chalés',
        value: Number(kpis?.totalChales || 0).toLocaleString('pt-BR'),
        icon: 'Home',
        color: 'var(--color-primary)',
      },
      {
        title: 'Ocupados Hoje',
        value: Number(kpis?.chalesOcupados || 0).toLocaleString('pt-BR'),
        icon: 'BedDouble',
        color: 'var(--color-warning)',
      },
      {
        title: 'Taxa de Ocupação',
        value: `${occupancyRate.toFixed(2)}%`,
        icon: 'Percent',
        color: 'var(--color-success)',
      },
      {
        title: 'Reservas Ativas',
        value: Number(kpis?.reservasAtivas || 0).toLocaleString('pt-BR'),
        icon: 'CalendarCheck2',
        color: 'var(--color-accent)',
      },
      {
        title: 'Cancelamentos',
        value: Number(kpis?.reservasCanceladas || 0).toLocaleString('pt-BR'),
        icon: 'CalendarX2',
        color: 'var(--color-error)',
      },
      {
        title: 'Receita Total',
        value: formatCurrency(
          revenueResponse?.receitaTotal ?? kpis?.receitaTotal ?? 0,
        ),
        icon: 'Wallet',
        color: 'var(--color-success)',
      },
    ];
  }, [kpiResponse, revenueResponse]);

  const chartData = useMemo(() => {
    const labels = Array.isArray(revenueResponse?.graficoBarras?.labels)
      ? revenueResponse.graficoBarras.labels
      : [];
    const receitas = Array.isArray(revenueResponse?.graficoBarras?.receitas)
      ? revenueResponse.graficoBarras.receitas
      : [];
    const reservas = Array.isArray(revenueResponse?.graficoBarras?.reservas)
      ? revenueResponse.graficoBarras.reservas
      : [];

    return labels.map((label, index) => ({
      chalet: label,
      revenue: Number(receitas[index] || 0),
      stays: Number(reservas[index] || 0),
    }));
  }, [revenueResponse]);

  const selectedPeriodLabel = useMemo(
    () => periodOptions.find((option) => option.value === selectedPeriod)?.label || '',
    [selectedPeriod],
  );

  return (
    <HostingLayout
      title="Dashboard de Hospedagem"
      subtitle="KPIs, receita por chalé e mapa de ocupação em tempo real"
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedPeriod(option.value)}
                className={`px-3 py-1.5 text-xs rounded-md transition-smooth ${
                  selectedPeriod === option.value
                    ? 'bg-card text-foreground shadow-soft font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <ExportControlPanel
            onExport={handleExport}
            availableFormats={['excel', 'csv', 'json']}
            title="Exportar Dados de Hospedagem"
          />
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.slice(0, 4).map((kpi) => (
          <HostingKPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            trend={kpi.trend}
            color={kpi.color}
            icon={<Icon name={kpi.icon} size={18} />}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.slice(4).map((kpi) => (
          <HostingKPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            trend={kpi.trend}
            color={kpi.color}
            icon={<Icon name={kpi.icon} size={18} />}
          />
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <HostingRevenueChart
        data={chartData}
        periodLabel={selectedPeriodLabel}
        isLoading={isLoading}
        error={error}
      />
      <OccupationMap />
    </HostingLayout>
  );
};

export default HostingDashboard;
