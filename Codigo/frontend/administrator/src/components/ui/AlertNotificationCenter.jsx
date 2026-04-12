import React, { useState, useEffect } from 'react';
import Button from './Button';
import Icon from '../AppIcon';
import { markAlertsAsRead as markAlertsAsReadService } from '../../utils/notificationService';

const AlertNotificationCenter = ({ className = '', alerts: externalAlerts = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState(Array.isArray(externalAlerts) && externalAlerts.length > 0 ? externalAlerts : []);

  // Sincroniza quando a prop externa muda
  useEffect(() => {
    if (Array.isArray(externalAlerts)) {
      setAlerts(prev => {
        // Simple comparison to avoid infinite loop if array reference changes but content is same
        if (JSON.stringify(prev) === JSON.stringify(externalAlerts)) {
          return prev;
        }
        return externalAlerts;
      });
    }
  }, [externalAlerts]);

  const unreadCount = alerts?.filter(alert => !alert?.isRead)?.length;

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const markAsRead = async (alertId) => {
    // Optimistic update
    setAlerts(prev => prev?.map(alert => 
      alert?.id === alertId ? { ...alert, isRead: true } : alert
    ));
    // Persist to backend
    await markAlertsAsReadService([alertId]);
  };

  const markAllAsRead = async () => {
    // Identify unread alerts
    const unreadIds = alerts?.filter(a => !a?.isRead).map(a => a?.id) || [];
    
    // Optimistic update
    setAlerts(prev => prev?.map(alert => ({ ...alert, isRead: true })));
    
    // Persist to backend
    if (unreadIds.length > 0) {
      await markAlertsAsReadService(unreadIds);
    }
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev?.filter(alert => alert?.id !== alertId));
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return 'AlertCircle';
      case 'warning':
        return 'AlertTriangle';
      case 'success':
        return 'CheckCircle';
      default:
        return 'Info';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'error':
        return 'text-error';
      case 'warning':
        return 'text-warning';
      case 'success':
        return 'text-success';
      default:
        return 'text-secondary';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}min atrás`;
    } else if (hours < 24) {
      return `${hours}h atrás`;
    } else {
      return `${days}d atrás`;
    }
  };

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event?.target?.closest('.alert-notification-center')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`alert-notification-center relative ${className}`}>
      {/* Notification Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePanel}
        className="relative"
        aria-label={`Notificações ${unreadCount > 0 ? `(${unreadCount} não lidas)` : ''}`}
      >
        <Icon name="Bell" size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-error rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-soft-lg z-[1100] animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-heading font-semibold text-foreground">Notificações</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-secondary hover:text-secondary/80 hover:bg-secondary/10"
                >
                  Marcar todas como lidas
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePanel}
                className="w-6 h-6"
              >
                <Icon name="X" size={16} />
              </Button>
            </div>
          </div>

          {/* Alerts List */}
          <div className="max-h-96 overflow-y-auto">
            {alerts?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icon name="Bell" size={48} className="text-muted-foreground mb-2" />
                <p className="text-muted-foreground font-body">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {alerts?.map((alert) => (
                  <div
                    key={alert?.id}
                    className={`p-4 hover:bg-muted transition-smooth ${
                      !alert?.isRead ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon
                        name={getAlertIcon(alert?.type)}
                        size={20}
                        className={`flex-shrink-0 mt-0.5 ${getAlertColor(alert?.type)}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`font-body font-medium text-sm ${
                            !alert?.isRead ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {alert?.title}
                          </h4>
                          <button
                            onClick={() => dismissAlert(alert?.id)}
                            className="flex-shrink-0 ml-2 text-muted-foreground hover:text-foreground transition-smooth"
                          >
                            <Icon name="X" size={14} />
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {alert?.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground font-caption">
                            {formatTimestamp(alert?.timestamp)}
                          </span>
                          {!alert?.isRead && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => markAsRead(alert?.id)}
                              className="text-xs h-6 px-2"
                            >
                              Marcar como lida
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {alerts?.length > 0 && (
            <div className="p-4 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                iconName="ExternalLink"
                iconPosition="right"
              >
                Ver Todas as Notificações
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertNotificationCenter;
