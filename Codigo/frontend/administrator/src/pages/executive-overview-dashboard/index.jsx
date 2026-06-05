import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import AlertNotificationCenter from '../../components/ui/AlertNotificationCenter';
import ExportControlPanel from '../../components/ui/ExportControlPanel';
import KPICard from './components/KPICard';
import RevenueChart from './components/RevenueChart';
import TopChalesList from './components/TopChalesList';
import CategoryPerformance from './components/CategoryPerformance';
import QuickActions from '../../components/ui/QuickActions';
import Icon from '../../components/AppIcon';
import { exportAdminData } from '../../utils/exportService';
import api from '../../utils/api';

const ExecutiveOverviewDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [kpiData, setKpiData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [topChales, setTopChales] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [timeframe, setTimeframe] = useState('weekly');
  const [reloadTick, setReloadTick] = useState(0);

  const getBackendPeriodo = () => {
    if (timeframe === 'monthly') return 'mes';
    if (timeframe === 'yearly') return 'ano';
    return 'semana';
  };

  const formatChaletType = (type) => {
    const map = {
      LUXURY: 'Luxo',
      STANDARD: 'Standard',
      FAMILY: 'Família',
      MASTER: 'Master',
      ECONOMIC: 'Econômico',
    };
    return map[type] || String(type || 'Outros');
  };

  const buildKpiCards = (kpis) => {
    const occupancy = Number(kpis?.taxaOcupacao || 0);
    const revenue = Number(kpis?.receitaTotal || 0);
    const activeReservations = Number(kpis?.reservasAtivas || 0);
    const occupiedChalets = Number(kpis?.chalesOcupados || 0);

    return [
      {
        title: 'Taxa de Ocupação',
        value: `${occupancy.toFixed(2)}%`,
        change: `${occupancy.toFixed(1)}%`,
        changeType: occupancy >= 70 ? 'positive' : 'negative',
        icon: 'Percent',
        color: occupancy >= 70 ? 'success' : 'warning',
        trend: [25, 35, 50, 60, 70, 75, Math.min(100, Math.round(occupancy))],
      },
      {
        title: 'Receita Total',
        value: revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        change: '+0,0%',
        changeType: 'positive',
        icon: 'DollarSign',
        color: 'success',
        trend: [20, 30, 40, 50, 60, 70, 80],
      },
      {
        title: 'Reservas Ativas',
        value: activeReservations,
        change: `${activeReservations}`,
        changeType: activeReservations > 0 ? 'positive' : 'neutral',
        icon: 'CalendarCheck',
        color: 'primary',
        trend: [10, 25, 30, 45, 40, 55, 60],
      },
      {
        title: 'Chalés Ocupados',
        value: occupiedChalets,
        change: `${occupiedChalets}`,
        changeType: occupiedChalets > 0 ? 'positive' : 'neutral',
        icon: 'Home',
        color: 'warning',
        trend: [15, 25, 20, 30, 35, 40, 45],
      },
    ];
  };

  const buildCategoryData = (receitaPorChale) => {
    const byType = (receitaPorChale || []).reduce((acc, item) => {
      const key = formatChaletType(item?.chaletTipo);
      acc[key] = (acc[key] || 0) + Number(item?.totalReservas || 0);
      return acc;
    }, {});

    const total = Object.values(byType).reduce((sum, value) => sum + Number(value || 0), 0);
    return Object.entries(byType).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0,
      change: 0,
    }));
  };

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const periodo = getBackendPeriodo();
        const [kpiRes, receitaRes, reservasRes] = await Promise.all([
          api.get('/api/dashboard/hospedagem/kpis', { params: { periodo } }),
          api.get('/api/dashboard/hospedagem/receita', { params: { periodo } }),
          api.get('/api/dashboard/hospedagem/reservas', { params: { periodo } }),
        ]);

        if (cancelled) return;

        const kpisPayload = kpiRes?.data?.kpis || {};
        const receitaPayload = receitaRes?.data || {};
        const receitaPorChale = Array.isArray(receitaPayload?.receitaPorChale)
          ? receitaPayload.receitaPorChale
          : [];
        const grafico = receitaPayload?.graficoBarras || {};
        const labels = Array.isArray(grafico?.labels) ? grafico.labels : [];
        const receitas = Array.isArray(grafico?.receitas) ? grafico.receitas : [];
        const reservas = Array.isArray(grafico?.reservas) ? grafico.reservas : [];

        const mappedChartData = labels.map((label, index) => ({
          period: label,
          revenue: Number(receitas[index] || 0),
          userCount: Number(reservas[index] || 0),
        }));

        const mappedTopChales = receitaPorChale
          .map((item) => ({
            chaletId: item?.chaletId,
            chaleName: item?.chaletNome,
            category: formatChaletType(item?.chaletTipo),
            totalRevenue: Number(item?.receitaTotal || 0),
            reservationsCount: Number(item?.totalReservas || 0),
            image: '',
          }))
          .sort((a, b) => b.reservationsCount - a.reservationsCount)
          .slice(0, 10);

        const mappedCategories = buildCategoryData(receitaPorChale);
        if (cancelled) return;
        setKpiData(buildKpiCards(kpisPayload));
        setRevenueData(mappedChartData);
        setTopChales(mappedTopChales);
        setCategoryData(mappedCategories);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Erro ao carregar dados da visão geral:', error);
        if (cancelled) return;
        setKpiData([]);
        setRevenueData([]);
        setTopChales([]);
        setCategoryData([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      cancelled = true;
    };
  }, [timeframe, reloadTick]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setLastUpdated(new Date());
      setReloadTick((prev) => prev + 1);
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const handleExport = async (format) => {
    try {
      // Use overview dataset for executive overview export
      await exportAdminData('overview', format);
    } catch (err) {
      console.error('Falha ao exportar visão executiva:', err);
      alert('Falha ao exportar. Verifique o servidor.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        
        <main className="px-8 py-6 space-y-6">
          {/* Dashboard Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Visão Geral Executiva</h1>
              <p className="text-muted-foreground mt-1">
                Inteligência de Negócios Abrangente e Indicadores-Chave de Desempenho
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Icon name="Clock" size={16} />
                <span>Última Atualização: {lastUpdated?.toLocaleTimeString()}</span>
              </div>
              <AlertNotificationCenter />
              <ExportControlPanel 
                onExport={handleExport}
                title="Exportar Painel"
                availableFormats={['excel', 'csv']}
              />
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {kpiData?.map((kpi, index) => (
              <KPICard
                key={index}
                title={kpi?.title}
                value={kpi?.value}
                change={kpi?.change}
                changeType={kpi?.changeType}
                icon={kpi?.icon}
                color={kpi?.color}
                trend={kpi?.trend}
              />
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* RevenueChart*/}
            <div className="xl:col-span-2 flex flex-col gap-6">
              <div>
                <RevenueChart 
                  data={revenueData} 
                  timeframe={timeframe} 
                  onTimeframeChange={setTimeframe} 
                />
              </div>

              <div>
                {/* CategoryPerformance */}
                <CategoryPerformance categories={categoryData} />
              </div>
            </div>

            {/* Top Chales List */}
            <div className="xl:col-span-1 h-full">
              <TopChalesList chales={topChales} className="h-full" />
            </div>
          </div>


          {/* Quick Actions */}
          <QuickActions />
        </main>
      </div>
    </div>
  );
};

export default ExecutiveOverviewDashboard;
