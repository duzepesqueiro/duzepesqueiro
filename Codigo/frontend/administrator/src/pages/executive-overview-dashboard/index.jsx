import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import AlertNotificationCenter from '../../components/ui/AlertNotificationCenter';
import ExportControlPanel from '../../components/ui/ExportControlPanel';
import KPICard from './components/KPICard';
import RevenueChart from './components/RevenueChart';
import TopChalesList from './components/TopChalesList';
import AlertsPanel from './components/AlertsPanel';
import CategoryPerformance from './components/CategoryPerformance';
import QuickActions from '../../components/ui/QuickActions';
import Icon from '../../components/AppIcon';
import { exportAdminData } from '../../utils/exportService';

const ExecutiveOverviewDashboard = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeframe, setTimeframe] = useState('weekly');
  const isLoading = false;
  const kpiData = [];
  const revenueData = [];
  const topChales = [];
  const categoryData = [];
  const dashboardAlerts = [];

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
