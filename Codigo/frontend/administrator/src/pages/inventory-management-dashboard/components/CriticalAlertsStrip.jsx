import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { getReorderSuggestions } from '../../../utils/inventoryService';
import { getReadAlertIds, markAlertsAsRead } from '../../../utils/notificationService';

const CriticalAlertsStrip = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const [suggestionsRes, readIds] = await Promise.all([
        getReorderSuggestions(),
        getReadAlertIds()
      ]);

      const suggestions = Array.isArray(suggestionsRes) ? suggestionsRes : (suggestionsRes?.suggestions || []);
      
      const alerts = suggestions.map((item, idx) => ({
        id: `inv-low-${item.id || idx}`, // Consistent with notificationService
        originalId: item.id,
        type: item.quantity === 0 ? "out-of-stock" : "low-stock",
        product: item.name || item.produto || "Produto Desconhecido",
        currentStock: item.quantity ?? item.stock ?? 0,
        minThreshold: item.minStock ?? item.minimo ?? 10,
        supplier: item.supplierName || "Fornecedor Padrão",
        leadTime: "3-5 dias", // Mock or fetch if available
        suggestedOrder: (item.minStock || 10) * 2 - (item.quantity || 0),
        priority: item.quantity === 0 ? "critical" : "high"
      }));

      // Filter out read alerts
      const visibleAlerts = alerts.filter(alert => !readIds.includes(alert.id));
      setCriticalAlerts(visibleAlerts);
    } catch (error) {
      console.error("Error fetching critical alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-error text-error-foreground';
      case 'high':
        return 'bg-warning text-warning-foreground';
      case 'medium':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'out-of-stock':
        return 'XCircle';
      case 'low-stock':
        return 'AlertTriangle';
      case 'supplier-delay':
        return 'Clock';
      default:
        return 'AlertCircle';
    }
  };

  const handleReorder = (alert) => {
    console.log(`Reordering ${alert?.suggestedOrder} units of ${alert?.product}`);
  };

  const handleDismiss = async (alertId) => {
    // Optimistic update
    setCriticalAlerts(prev => prev.filter(alert => alert.id !== alertId));
    // Persist to backend
    await markAlertsAsRead([alertId]);
  };

  if (loading && criticalAlerts.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">Carregando alertas...</div>;
  }

  if (criticalAlerts.length === 0) {
    return null; // Or show "No critical alerts" message
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-error/5 border-b border-border">
        <div className="flex items-center space-x-3">
          <Icon name="AlertTriangle" size={20} className="text-error" />
          <h2 className="font-heading font-semibold text-foreground">
            Alertas Críticos
          </h2>
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-error text-error-foreground text-xs font-medium">
            {criticalAlerts?.length} Ativado
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
            iconPosition="right"
          >
            {isExpanded ? 'Collapse' : 'View All'}
          </Button>
          <Button variant="outline" size="sm" iconName="Settings" iconPosition="left">
            Configurar
          </Button>
        </div>
      </div>
      {/* Alerts Content */}
      <div className={`transition-all duration-300 ${isExpanded ? 'max-h-none' : 'max-h-32 overflow-hidden'}`}>
        <div className="divide-y divide-border">
          {criticalAlerts?.map((alert) => (
            <div key={alert?.id} className="p-4 hover:bg-muted/50 transition-smooth">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <Icon 
                    name={getAlertIcon(alert?.type)} 
                    size={20} 
                    className="text-error flex-shrink-0" 
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-body font-medium text-foreground truncate">
                        {alert?.product}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(alert?.priority)}`}>
                        {alert?.priority?.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Estoque: {alert?.currentStock} / {alert?.minThreshold}</span>
                      <span>•</span>
                      <span>Fornecedor: {alert?.supplier}</span>
                      <span>•</span>
                      <span>Prazo de Entrega: {alert?.leadTime}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <div className="text-right mr-4">
                    <p className="text-sm font-medium text-foreground">
                      Sugestão de Pedido: {alert?.suggestedOrder} Unidades
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Custo Estimado: ${(alert?.suggestedOrder * 25)?.toLocaleString()}
                    </p>
                  </div>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleReorder(alert)}
                    iconName="ShoppingCart"
                    iconPosition="left"
                  >
                    Reordenar
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(alert?.id)}
                    iconName="X"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Quick Actions Footer */}
      <div className="p-4 bg-muted/30 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Last updated: just now</span>
            <span>•</span>
            <span>Auto-refresh: Every 5 minutes</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" iconName="Download" iconPosition="left">
              Exportar Relatório
            </Button>
            <Button variant="outline" size="sm" iconName="Mail" iconPosition="left">
              Alerta de Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriticalAlertsStrip;