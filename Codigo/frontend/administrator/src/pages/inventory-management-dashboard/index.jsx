import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import AlertNotificationCenter from '../../components/ui/AlertNotificationCenter';
import { connectInventorySocket, disconnectInventorySocket, onInventoryEvent } from '../../utils/inventorySocketService';
import ExportControlPanel from '../../components/ui/ExportControlPanel';
import InventoryKPICards from './components/InventoryKPICards';
import InventoryHeatmap from './components/InventoryHeatmap';
import ReorderSuggestions from './components/ReorderSuggestions';
import InventoryDataTable from './components/InventoryDataTable';
import Icon from '../../components/AppIcon';
import QuickActions from '../../components/ui/QuickActions';
import { exportAdminData } from '../../utils/exportService';
import {
  getInventoryHeatmap,
  getInventoryItems,
  getInventoryKpis,
  getReorderSuggestions,
  getSupplierPerformance,
} from '../../utils/inventoryService';

import SupplierPerformance from './components/SupplierPerformance';

const InventoryManagementDashboard = () => {
  // VARIAVEL AMBIENTE DE REFRESH INTERVAL
  const WEBSOCKET_REFRESH_INTERVAL_MINUTES = 5;
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [loading, setLoading] = useState({
    kpis: true,
    heatmap: true,
    suggestions: true,
    suppliers: true,
    items: true,
  });
  const [errors, setErrors] = useState({
    kpis: null,
    heatmap: null,
    suggestions: null,
    suppliers: null,
    items: null,
  });
  const [dashboardData, setDashboardData] = useState({
    kpis: [],
    heatmap: [],
    suggestions: [],
    suppliers: [],
    items: [],
  });
  const debounceTimerRef = useRef(null);
  const pendingRealtimeRef = useRef(new Set());

  const pageAlerts = useMemo(() => {
    const alerts = [];
    const now = new Date();
    (dashboardData?.suggestions || []).forEach((item, idx) => {
      const stock = Number(item?.currentStock || 0);
      const min = Number(item?.minThreshold || 0);
      const isCritical = stock <= 0;
      if (isCritical || stock < min) {
        alerts.push({
          id: `inv-sugg-${item?.id || idx}`,
          type: isCritical ? 'error' : 'warning',
          title: isCritical ? 'Produto esgotado' : 'Estoque abaixo do mínimo',
          message: `${item?.product || 'Produto'} com ${stock} unidade(s). Mínimo esperado: ${min}.`,
          timestamp: now,
          isRead: false,
          category: 'inventory',
        });
      }
    });
    return alerts.slice(0, 20);
  }, [dashboardData?.suggestions]);

  const refreshSection = useCallback(async (section, fn, ...args) => {
    setLoading((prev) => ({ ...prev, [section]: true }));
    setErrors((prev) => ({ ...prev, [section]: null }));
    try {
      const data = await fn(...args);
      setDashboardData((prev) => ({ ...prev, [section]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao carregar dados.';
      setErrors((prev) => ({ ...prev, [section]: msg }));
    } finally {
      setLoading((prev) => ({ ...prev, [section]: false }));
    }
  }, []);

  const refreshInventoryItems = useCallback(
    async (search = '') => {
      await refreshSection('items', getInventoryItems, { search });
    },
    [refreshSection],
  );

  const refreshSections = useCallback(async (sections) => {
    const tasks = [];
    if (sections.includes('kpis')) tasks.push(refreshSection('kpis', getInventoryKpis));
    if (sections.includes('heatmap')) tasks.push(refreshSection('heatmap', getInventoryHeatmap));
    if (sections.includes('suggestions')) tasks.push(refreshSection('suggestions', getReorderSuggestions));
    if (sections.includes('suppliers')) tasks.push(refreshSection('suppliers', getSupplierPerformance));
    if (sections.includes('items')) tasks.push(refreshInventoryItems(searchTerm));
    await Promise.all(tasks);
    setLastUpdated(new Date());
  }, [refreshInventoryItems, refreshSection, searchTerm]);

  const refreshAll = useCallback(async () => {
    await refreshSections(['kpis', 'heatmap', 'suggestions', 'suppliers', 'items']);
  }, [refreshSections]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      refreshInventoryItems(searchTerm);
    }, 350);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, refreshInventoryItems]);

  useEffect(() => {
    connectInventorySocket();
    const markSectionsForRefresh = (sections) => {
      sections.forEach((section) => pendingRealtimeRef.current.add(section));
    };
    const unsubscribers = [
      onInventoryEvent('dashboard_updated', () =>
        markSectionsForRefresh(['kpis', 'heatmap', 'suggestions', 'suppliers']),
      ),
      onInventoryEvent('product_updated', () =>
        markSectionsForRefresh(['items', 'kpis', 'heatmap']),
      ),
      onInventoryEvent('low_stock_alert', () =>
        markSectionsForRefresh(['suggestions', 'kpis']),
      ),
      onInventoryEvent('purchase_order_status', () =>
        markSectionsForRefresh(['suggestions', 'suppliers']),
      ),
    ];
    const interval = setInterval(() => {
      const sections = Array.from(pendingRealtimeRef.current);
      if (!sections.length) {
        return;
      }
      pendingRealtimeRef.current.clear();
      void refreshSections(sections);
    }, WEBSOCKET_REFRESH_INTERVAL_MINUTES * 60 * 1000);

    return () => {
      clearInterval(interval);
      pendingRealtimeRef.current.clear();
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      disconnectInventorySocket();
    };
  }, [refreshSections]);

  const handleExport = async (format) => {
    try {
      await exportAdminData('inventory', format);
    } catch (err) {
      console.error('Falha ao exportar estoque:', err);
      alert('Falha ao exportar. Verifique o servidor.');
    }
  };

  const handleRefresh = async () => {
    await refreshAll();
  };

  return (
    <>
      <Helmet>
        <title>Painel de Gestão de Estoque - FishPark Analytics</title>
        <meta name="description" content="Monitoramento de estoque em tempo real e análise preditiva para operações do parque de pesca. Acompanhe níveis de estoque, gerencie reposições e otimize o desempenho do inventário." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        
        {/* Main Content */}
        <main className="px-8 pt-20 pb-8 space-y-8">
          {/* Dashboard Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">
                Painel de Gestão de Estoque
              </h1>
              <p className="text-muted-foreground mt-2">
                Monitoramento de estoque em tempo real e análise preditiva para eficiência operacional
              </p>
            </div>

            <div className="flex items-center space-x-4">

              {/* Manual Refresh */}
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-2 px-3 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-smooth"
              >
                <Icon name="RefreshCw" size={16} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Atualizar</span>
              </button>



              {/* Notifications */}
              <AlertNotificationCenter alerts={pageAlerts} />

              {/* Export Controls */}
              <ExportControlPanel
                onExport={handleExport}
                availableFormats={['pdf', 'excel', 'csv']}
                title="Exportar Relatório de Estoque"
              />
            </div>
          </div>

          {/* Last Updated Indicator */}
          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Ultima Atualização: {lastUpdated?.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Sincronização de Dados em Tempo Real Ativa</span>
              <span>•</span>
              <span>Atualização websocket: {WEBSOCKET_REFRESH_INTERVAL_MINUTES} min</span>
            </div>
          </div>

          {/* KPI Cards */}
          <InventoryKPICards
            items={dashboardData.kpis}
            loading={loading.kpis}
            error={errors.kpis}
            onRetry={() => refreshSection('kpis', getInventoryKpis)}
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
            {/* Inventory Heatmap + Supplier Performance - 3 columns */}
            <div className="xl:col-span-3 flex flex-col gap-8">
              <InventoryHeatmap
                items={dashboardData.heatmap}
                loading={loading.heatmap}
                error={errors.heatmap}
                onRetry={() => refreshSection('heatmap', getInventoryHeatmap)}
              />
              <SupplierPerformance
                items={dashboardData.suppliers}
                loading={loading.suppliers}
                error={errors.suppliers}
                onRetry={() => refreshSection('suppliers', getSupplierPerformance)}
              />
            </div>

            {/* Reorder Suggestions - 1 column */}
            <div className="xl:col-span-1">
              <ReorderSuggestions
                items={dashboardData.suggestions}
                loading={loading.suggestions}
                error={errors.suggestions}
                onRetry={() => refreshSection('suggestions', getReorderSuggestions)}
              />
            </div>
          </div>

          {/* Inventory Data Table */}
          <InventoryDataTable
            items={dashboardData.items}
            loading={loading.items}
            error={errors.items}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onRefresh={() => refreshInventoryItems(searchTerm)}
          />

          {/* Dashboard Footer */}
          <div className="flex items-center justify-between p-6 bg-card border border-border rounded-lg">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Versão do Painel 2.1.0</span>
              <span>•</span>
              <span>Fonte de Dados: Sistema de Estoque em Tempo Real</span>
              <span>•</span>
              <span>Disponibilidade: online</span>

            </div>
            <div className="flex items-center space-x-2">
              <Icon name="Shield" size={16} className="text-success" />
              <span className="text-sm text-success">Conexão Segura</span>
            </div>
          </div>

          {/* Quick Actions */}
          <QuickActions className="mt-6" />
        </main>
      </div>
    </>
  );
};

export default InventoryManagementDashboard;
