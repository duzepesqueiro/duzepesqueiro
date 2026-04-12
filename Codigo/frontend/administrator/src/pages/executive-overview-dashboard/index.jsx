import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import AlertNotificationCenter from '../../components/ui/AlertNotificationCenter';
import ExportControlPanel from '../../components/ui/ExportControlPanel';
import KPICard from './components/KPICard';
import RevenueChart from './components/RevenueChart';
import TopProductsList from './components/TopProductsList';
import AlertsPanel from './components/AlertsPanel';
import CategoryPerformance from './components/CategoryPerformance';
import QuickActions from '../../components/ui/QuickActions';
import Icon from '../../components/AppIcon';
import { exportAdminData } from '../../utils/exportService';
import api from '../../utils/api';
import { syncAlertsWithReadStatus } from '../../utils/notificationService';

const ExecutiveOverviewDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [kpiData, setKpiData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [timeframe, setTimeframe] = useState('weekly');
  const [dashboardAlerts, setDashboardAlerts] = useState([]);

  // Generate dynamic alerts based on dashboard data
  const generateDashboardAlerts = (kpis, categories) => {
    const alerts = [];

    // 1. Active Rentals Alert
    const rentalKpi = kpis.find(k => k.title.toLowerCase().includes('aluguéis') || k.title.toLowerCase().includes('ativos'));
    if (rentalKpi) {
      alerts.push({
        id: 'dashboard-rentals-active',
        type: "info",
        priority: "medium",
        title: "Status de Aluguéis",
        message: `${rentalKpi.value} Aluguéis ativos no momento`,
        details: `O número de aluguéis ativos é ${rentalKpi.value}. Acompanhe o painel de operações para mais detalhes.`,
        timestamp: new Date()
      });
    }

    // 2. Revenue Alert
    const revenueKpi = kpis.find(k => k.title.toLowerCase().includes('receita') || k.title.toLowerCase().includes('faturamento'));
    if (revenueKpi) {
      const isIncrease = revenueKpi.changeType === 'positive' || revenueKpi.changeType === 'increase';
      alerts.push({
        id: 'dashboard-revenue-status',
        type: isIncrease ? "success" : "warning",
        priority: "high",
        title: "Atualização de Receita",
        message: `Receita Total ${isIncrease ? 'aumentou' : 'diminuiu'} ${revenueKpi.change}`,
        details: `A receita total registrada é de ${revenueKpi.value}, representando uma ${isIncrease ? 'alta' : 'baixa'} de ${revenueKpi.change} em relação ao período anterior.`,
        timestamp: new Date()
      });
    }

    // 3. Category Performance Alerts
    if (categories && categories.length > 0) {
      // Find category with highest change (positive or negative)
      // Since change is currently 0, we'll just check if there's any non-zero change
      // Or we can just pick the top category as a "performance" highlight if no change data
      
      const topCategory = categories.reduce((prev, current) => (prev.value > current.value) ? prev : current, categories[0]);
      
      if (topCategory) {
         alerts.push({
          id: 'dashboard-cat-top',
          type: "info",
          priority: "low",
          title: "Desempenho de Categoria",
          message: `Categoria destaque: ${topCategory.name}`,
          details: `${topCategory.name} representa ${topCategory.percentage}% das vendas totais com ${topCategory.value} unidades vendidas.`,
          timestamp: new Date()
        });
      }

      // If we had change data, we would add specific alerts for increase/decrease
      categories.forEach(cat => {
        if (cat.change && Math.abs(cat.change) > 10) { // Threshold for alert
           const isIncrease = cat.change > 0;
           alerts.push({
            id: `dashboard-cat-change-${cat.name}`,
            type: isIncrease ? "success" : "warning",
            priority: "medium",
            title: `Desempenho: ${cat.name}`,
            message: `Vendas de ${cat.name} ${isIncrease ? 'aumentaram' : 'diminuíram'} ${Math.abs(cat.change)}%`,
            details: `A categoria ${cat.name} apresentou uma variação significativa de ${cat.change}% no período.`,
            timestamp: new Date()
          });
        }
      });
    }

    return alerts;
  };

  // Fetch KPI and Revenue data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, revenueRes, topProductsRes, categoryRes] = await Promise.all([
          api.get('/api/admin/dashboard/kpis'),
          api.get(`/api/admin/dashboard/performance?period=${timeframe}`),
          api.get('/api/admin/dashboard/top-products?limit=10'),
          api.get('/api/admin/dashboard/category-performance')
        ]);

        let currentKpiData = [];
        let currentCategoryData = [];

        if (kpiRes.data) {
          currentKpiData = kpiRes.data.map(kpi => {
            let color = 'primary';
            const title = (kpi.title || '').toLowerCase();
            if (title.includes('receita') || title.includes('lucro')) color = 'success';
            else if (title.includes('inventário')) color = 'warning';
            else if (title.includes('aluguéis')) color = 'primary';
            
            return {
              ...kpi,
              color,
              trend: [0, 0, 0, 0, 0, 0, 0] // Placeholder trend
            };
          });
          setKpiData(currentKpiData);
        }

        if (revenueRes.data) {
          setRevenueData(revenueRes.data.map(item => ({
            period: item.period,
            revenue: item.revenue,
            userCount: item.userCount
          })));
        }

        if (topProductsRes.data) {
          setTopProducts(topProductsRes.data);
        }

        if (categoryRes.data) {
          const total = categoryRes.data.reduce((acc, item) => acc + (item.quantitySold || 0), 0);
          currentCategoryData = categoryRes.data.map(item => ({
            name: item.category,
            value: item.quantitySold || 0,
            percentage: total > 0 ? parseFloat(((item.quantitySold || 0) / total * 100).toFixed(1)) : 0,
            change: item.change || 0 // Use backend change if available
          }));
          setCategoryData(currentCategoryData);
        }

        // Generate alerts based on fetched data
        const generatedAlerts = generateDashboardAlerts(currentKpiData, currentCategoryData);
        // Sync with backend read status
        const syncedAlerts = await syncAlertsWithReadStatus(generatedAlerts);
        setDashboardAlerts(syncedAlerts);

      } catch (error) {
        console.error("Error fetching dashboard data", error);
        // Fallback to empty or mock if needed
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [timeframe]);

  useEffect(() => {
    // Auto-refresh data every 30 minutes
    const refreshInterval = setInterval(() => {
      setLastUpdated(new Date());
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
              <p className="text-muted-foreground">Carregano dados ...</p>
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
              <AlertNotificationCenter alerts={dashboardAlerts} />
              <ExportControlPanel 
                onExport={handleExport}
                title="Exportar Painel"
                availableFormats={['pdf', 'excel', 'png']}
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

            {/*Top Products List*/}
            <div className="xl:col-span-1 h-full">
              <TopProductsList products={topProducts} className="h-full" />
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