import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { getReadAlertIds, markAlertsAsRead } from '../../../utils/notificationService';
import { getRentalHistory } from '../../../utils/rentalService';

const PriorityAlertsSidebar = () => {
  const [overdueAlerts, setOverdueAlerts] = useState([]);

  const fetchOverdue = async () => {
    try {
      const [items, readIds] = await Promise.all([
        getRentalHistory(),
        getReadAlertIds()
      ]);
      const now = new Date();
      const alerts = items
        .filter(r => r?.status === 'overdue')
        .map(r => {
          const endTimeStr = r?.endTime;
          let overdueBy = '';
          if (endTimeStr) {
            const endDate = new Date(endTimeStr.includes('T') ? endTimeStr : endTimeStr.replace(' ', 'T'));
            const diffMs = now - endDate;
            if (diffMs > 0) {
              const hours = Math.floor(diffMs / 3600000);
              const minutes = Math.floor((diffMs % 3600000) / 60000);
              overdueBy = `${hours}h ${minutes}m`;
            }
          }
          return {
            id: r?.id,
            alertId: `rental-overdue-${r?.id}`, // Consistent with notificationService
            equipment: r?.equipment || r?.productName || 'Equipamento',
            customer: r?.customer || r?.renterName || '',
            phone: r?.phone || r?.customerPhone || '',
            overdueBy: overdueBy || '—',
          };
        });
      
      // Filter read alerts
      setOverdueAlerts(alerts.filter(a => !readIds.includes(a.alertId)));
    } catch (err) {
      console.error('Falha ao carregar alertas de atraso', err);
      setOverdueAlerts([]);
    }
  };

  useEffect(() => {
    fetchOverdue();
  }, []);

  useEffect(() => {
    const onReturned = (e) => {
      const returnedId = e?.detail?.id;
      if (returnedId != null) {
        setOverdueAlerts(prev => prev.filter(a => a.id !== returnedId));
      }
      fetchOverdue();
    };
    window.addEventListener('rental:returned', onReturned);
    return () => window.removeEventListener('rental:returned', onReturned);
  }, []);

  const handleDismiss = async (alertId) => {
    setOverdueAlerts(prev => prev.filter(a => a.alertId !== alertId));
    await markAlertsAsRead([alertId]);
  };

  const openWhatsApp = (phone, equipment) => {
    const digits = (phone || '').replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! Seu aluguel de ${equipment} está atrasado. Poderia nos responder?`);
    const url = `https://wa.me/${digits}?text=${msg}`;
    window.open(url, '_blank');
  };

  const renderOverdueAlerts = () => (
    <div className="space-y-4">
      {(!overdueAlerts || overdueAlerts.length === 0) && (
        <p className="text-sm text-muted-foreground">Nenhum aluguel atrasado</p>
      )}
      {overdueAlerts?.map((alert) => (
        <div key={alert?.alertId} className="border border-border rounded-lg p-4 bg-error/5 relative group">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleDismiss(alert?.alertId)}
            iconName="X"
          />
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-body font-medium text-foreground">{alert?.equipment}</h4>
              <p className="text-sm text-muted-foreground">{alert?.customer}</p>
            </div>
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-error text-error-foreground">
              +{alert?.overdueBy}
            </span>
          </div>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="secondary" 
              className="flex-1"
              onClick={() => openWhatsApp(alert?.phone, alert?.equipment)}
              iconName="MessageCircle"
            >
              Contatar
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              Detalhes
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-lg p-6 h-full max-h-[1000px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-heading font-semibold text-foreground">Alertas de Prioridade</h3>
        <Button variant="ghost" size="icon">
          <Icon name="Settings" size={16} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderOverdueAlerts()}
      </div>
    </div>
  );
};

export default PriorityAlertsSidebar;
