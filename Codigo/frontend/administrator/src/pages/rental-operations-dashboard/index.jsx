import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import AlertNotificationCenter from '../../components/ui/AlertNotificationCenter';
import { getRentalAlerts } from '../../utils/notificationService';
import ExportControlPanel from '../../components/ui/ExportControlPanel';
import ActiveRentalsOverview from './components/ActiveRentalsOverview';
import RentalTimelineVisualization from './components/RentalTimelineVisualization';
import PriorityAlertsSidebar from './components/PriorityAlertsSidebar';
import EquipmentUtilizationHeatmap from './components/EquipmentUtilizationHeatmap';
import RentalHistoryTable from './components/RentalHistoryTable';
import GPSTrackingPanel from './components/GPSTrackingPanel';
import { exportAdminData } from '../../utils/exportService';
import QuickActions from '../../components/ui/QuickActions';

const RentalOperationsDashboard = () => {
  const [refreshInterval, setRefreshInterval] = useState(15000); // 15 seconds
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [pageAlerts, setPageAlerts] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const handleExport = async (format) => {
    try {
      await exportAdminData('rentals', format);
    } catch (err) {
      console.error('Falha ao exportar alugueis:', err);
      alert('Falha ao exportar. Verifique o servidor.');
    }
  };

  // Notificações de alugueis: novos e atrasados
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const alerts = await getRentalAlerts();
        if (mounted) setPageAlerts(alerts);
      } catch (err) {
        if (mounted)
          setPageAlerts([
            {
              id: 'rental-alert-error',
              type: 'error',
              title: 'Erro ao carregar alertas',
              message: 'Falha ao consultar alugueis.',
              category: 'rental',
              timestamp: new Date(),
              isRead: false,
            },
          ]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lastRefresh]);

  return (
    <>
      <Helmet>
        <title>Painel de Operações de Aluguel - Análise Pesgue e Pague</title>
        <meta name="description" content="Rastreamento abrangente de equipamentos e análise de utilização para operações de aluguel do parque de pesca, com monitoramento em tempo real e rastreamento por GPS." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-16 pb-8">
          <div className="px-8">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-3xl font-heading font-bold text-foreground">Painel de Operações de Aluguel</h1>
                <p className="text-muted-foreground mt-2">
                 Rastreamento Abrangente de Equipamentos e Análise de Utilização para Excelência Operacional
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                  <span>Última Atualização: {lastRefresh?.toLocaleTimeString()}</span>
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span>Dados em Tempo real</span>
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <AlertNotificationCenter alerts={pageAlerts} />
                <ExportControlPanel 
                  onExport={handleExport}
                  availableFormats={['pdf', 'excel', 'csv']}
                  title="Exportar Dados de Aluguéis"
                />
              </div>
            </div>

            {/* Active Rentals Overview */}
            <ActiveRentalsOverview />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 mb-8">
              {/* Rental Timeline - 3 columns */}
              <div className="xl:col-span-3 h-full">
                <RentalTimelineVisualization lastRefresh={lastRefresh} />
              </div>
              
              {/* Priority Alerts Sidebar - 1 column */}
              <div className="xl:col-span-1 h-full">
                <PriorityAlertsSidebar />
              </div>
            </div>

            {/* Equipment Utilization Heatmap */}
            {/* <EquipmentUtilizationHeatmap /> */}

            {/* GPS Tracking Panel */}
            {/* <div className="mb-8">
              <GPSTrackingPanel />
            </div> */}

            {/* Rental History Table */}
            <RentalHistoryTable onRefreshTimeline={() => setLastRefresh(new Date())} />

            {/* Quick Actions */}
            <QuickActions className="mt-6" />
          </div>
        </main>
      </div>
    </>
  );
};

export default RentalOperationsDashboard;
