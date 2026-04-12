import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { markAlertsAsRead } from '../../../utils/notificationService';

const AlertsPanel = ({ alerts, className = '' }) => {
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [dismissedIds, setDismissedIds] = useState([]);

  const visibleAlerts = alerts?.filter(a => !dismissedIds.includes(a.id)) || [];

  const handleAcknowledge = async (alertId) => {
    setDismissedIds(prev => [...prev, alertId]);
    await markAlertsAsRead([alertId]);
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical':
        return { icon: 'AlertCircle', color: 'text-error' };
      case 'warning':
        return { icon: 'AlertTriangle', color: 'text-warning' };
      case 'info':
        return { icon: 'Info', color: 'text-secondary' };
      default:
        return { icon: 'Bell', color: 'text-muted-foreground' };
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-error/10 border-error/20';
      case 'medium':
        return 'bg-warning/10 border-warning/20';
      case 'low':
        return 'bg-secondary/10 border-secondary/20';
      default:
        return 'bg-muted border-border';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - alertTime) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const toggleAlert = (alertId) => {
    setExpandedAlert(expandedAlert === alertId ? null : alertId);
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">Alertas Críticos</h3>
          <p className="text-sm text-muted-foreground">Precisa de Atenção Imediata</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-error rounded-full animate-pulse" />
          <span className="text-sm font-medium text-error">{alerts?.filter(a => a?.type === 'critical')?.length} Crítico</span>
        </div>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {visibleAlerts.map((alert) => {
          const alertInfo = getAlertIcon(alert?.type);
          const isExpanded = expandedAlert === alert?.id;

          return (
            <div
              key={alert?.id}
              className={`border rounded-lg p-4 transition-smooth ${getPriorityColor(alert?.priority)}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 ${alertInfo?.color} mt-0.5`}>
                  <Icon name={alertInfo?.icon} size={20} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h4 className="font-body font-medium text-foreground text-sm">{alert?.title}</h4>
                    <button
                      onClick={() => toggleAlert(alert?.id)}
                      className="flex-shrink-0 ml-2 text-muted-foreground hover:text-foreground transition-smooth"
                    >
                      <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={16} />
                    </button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {alert?.message}
                  </p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground font-caption">
                      {formatTimestamp(alert?.timestamp)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        alert?.priority === 'high' ? 'bg-error text-error-foreground' :
                        alert?.priority === 'medium' ? 'bg-warning text-warning-foreground' :
                        'bg-secondary text-secondary-foreground'
                      }`}>
                        {alert?.priority?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-medium text-foreground mb-1">Detalhes:</h5>
                          <p className="text-sm text-muted-foreground">{alert?.details}</p>
                        </div>
                        
                        {alert?.recommendations && (
                          <div>
                            <h5 className="text-sm font-medium text-foreground mb-1">Ações Recomendadas:</h5>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {alert?.recommendations?.map((rec, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <Icon name="ArrowRight" size={14} className="mt-0.5 flex-shrink-0" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex space-x-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleAcknowledge(alert?.id)}
                          >
                            Reconhecer
                          </Button>
                          <Button variant="secondary" size="sm" className="flex-1">
                            Tomar ação
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-4 border-t border-border">
        <Button variant="secondary" className="w-full" iconName="ExternalLink" iconPosition="right">
          Visualizar Todos os Alertas
        </Button>
      </div>
    </div>
  );
};

export default AlertsPanel;