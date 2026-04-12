import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/ui/Header';
import AlertNotificationCenter from '../../components/ui/AlertNotificationCenter';
import { getSalesAlerts } from '../../utils/notificationService';
import ExportControlPanel from '../../components/ui/ExportControlPanel';
import SalesKPICards from './components/SalesKPICards';
import SalesChart from './components/SalesChart';
import SalesFilters from './components/SalesFilters';
import SalesManagementTable from './components/SalesManagementTable';
import CustomerAnalytics from './components/CustomerAnalytics';

import Button from '../../components/ui/Button';
import QuickActions from '../../components/ui/QuickActions';

import {
  getSalesKpis,
  getSalesPerformance,
  getCustomerAnalytics
} from '../../services/salesAnalyticsService';
import { exportAdminData } from '../../utils/exportService';

const SalesAnalyticsDashboard = () => {
  const [salesFilters, setSalesFilters] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [pageAlerts, setPageAlerts] = useState([]);

  const [kpiData, setKpiData] = useState([]);
  const [salesChartData, setSalesChartData] = useState([]);
  const [customerBehaviorData, setCustomerBehaviorData] = useState([]);
  const [customerSegmentData, setCustomerSegmentData] = useState([]);

  const handleSalesFiltersChange = useCallback((filters) => {
    setSalesFilters(filters);
  }, []);

  const handleExport = useCallback(async (format) => {
    try {
      await exportAdminData('sales', format);
    } catch (err) {
      console.error('Falha ao exportar vendas:', err);
      alert('Falha ao exportar. Verifique o servidor.');
    }
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [kpiRes, perfRes, custRes] = await Promise.all([
        getSalesKpis(),
        getSalesPerformance(),
        getCustomerAnalytics()
      ]);

      setKpiData(kpiRes.data);
      setSalesChartData(perfRes.data);

      setCustomerBehaviorData(custRes.data.customerData || []);
      setCustomerSegmentData(custRes.data.segmentData || []);
    } catch (error) {
      console.error("Erro ao buscar dados de analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Notificações de vendas: confirmadas e canceladas
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const alerts = await getSalesAlerts();
        if (mounted) setPageAlerts(alerts);
      } catch (err) {
        if (mounted) setPageAlerts([{ id: 'sales-alert-error', type: 'error', title: 'Erro ao carregar alertas', message: 'Falha ao consultar vendas.', category: 'sales', timestamp: new Date(), isRead: false }]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16">
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Carregando análise de vendas...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Global Filter Bar Removed */}
      <div className="pt-16 pb-8">
        <div className="max-w mx-auto px-8">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Painel de Análise de Vendas</h1>
              <p className="text-muted-foreground">
              Rastreamento Abrangente de Desempenho e Insights sobre Comportamento do Cliente
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <AlertNotificationCenter alerts={pageAlerts} />
              <ExportControlPanel 
                onExport={handleExport}
                availableFormats={['pdf', 'excel', 'csv', 'png']}
                title="Exportar Relatório de Vendas"
              />
              <Button
                variant="default"
                iconName="RefreshCw"
                iconPosition="left"
                onClick={() => window.location?.reload()}
              >
                Atualizar Dados
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <SalesKPICards kpiData={kpiData} className="mb-8" />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">
            {/* Sales Perfomance */}
            <div className="xl:col-span-12 flex flex-col gap-8">
              <div>
                <SalesChart chartData={salesChartData} />
              </div>
              <CustomerAnalytics 
                customerData={customerBehaviorData} 
                segmentData={customerSegmentData} 
              />
            </div>
          </div>

          {/* Sales Management Table */}
          <div className="mb-8">
            <SalesManagementTable onRefresh={fetchAnalyticsData} />
          </div>

          {/* Quick Actions */}
          <QuickActions className="mt-4" />
        </div>
      </div>
    </div>
  );
};

export default SalesAnalyticsDashboard;
