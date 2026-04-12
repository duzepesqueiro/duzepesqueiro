import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const GPSTrackingPanel = () => {
  const [selectedEquipment, setSelectedEquipment] = useState('all');
  const [mapView, setMapView] = useState('satellite');

  const trackedEquipment = [
    {
      id: 1,
      name: "Premium Boat #B01",
      customer: "John Smith",
      status: "active",
      location: { lat: 40.7128, lng: -74.0060, name: "North Pond - Section A" },
      lastUpdate: "2 min ago",
      battery: 85,
      speed: "2.3 mph",
      geofenceStatus: "inside",
      estimatedReturn: "4:30 PM"
    },
    {
      id: 2,
      name: "Kayak #K07",
      customer: "Sarah Johnson",
      status: "active",
      location: { lat: 40.7589, lng: -73.9851, name: "South Lake - Central" },
      lastUpdate: "1 min ago",
      battery: 92,
      speed: "1.8 mph",
      geofenceStatus: "inside",
      estimatedReturn: "3:15 PM"
    },
    {
      id: 3,
      name: "Boat #B03",
      customer: "Mike Davis",
      status: "alert",
      location: { lat: 40.7831, lng: -73.9712, name: "East Creek - Boundary" },
      lastUpdate: "5 min ago",
      battery: 45,
      speed: "0.0 mph",
      geofenceStatus: "boundary",
      estimatedReturn: "6:00 PM"
    },
    {
      id: 4,
      name: "Family Kayak Set #K12",
      customer: "Lisa Wilson",
      status: "overdue",
      location: { lat: 40.7505, lng: -73.9934, name: "West Reservoir - Deep End" },
      lastUpdate: "15 min ago",
      battery: 23,
      speed: "0.5 mph",
      geofenceStatus: "outside",
      estimatedReturn: "Overdue by 2h"
    }
  ];

  const equipmentOptions = [
    { value: 'all', label: 'Todos os equipamentos' },
    { value: 'boats', label: 'Apenas barcos' },
    { value: 'kayaks', label: 'Apenas caiaques' },
    { value: 'active', label: 'Apenas ativos' },
    { value: 'alerts', label: 'Apenas alertas' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-success';
      case 'alert':
        return 'text-warning';
      case 'overdue':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return 'CheckCircle';
      case 'alert':
        return 'AlertTriangle';
      case 'overdue':
        return 'XCircle';
      default:
        return 'Circle';
    }
  };

  const getGeofenceColor = (status) => {
    switch (status) {
      case 'inside':
        return 'text-success';
      case 'boundary':
        return 'text-warning';
      case 'outside':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBatteryColor = (level) => {
    if (level > 50) return 'text-success';
    if (level > 20) return 'text-warning';
    return 'text-error';
  };

  const filteredEquipment = trackedEquipment?.filter(equipment => {
    if (selectedEquipment === 'all') return true;
    if (selectedEquipment === 'boats') return equipment?.name?.toLowerCase()?.includes('boat');
    if (selectedEquipment === 'kayaks') return equipment?.name?.toLowerCase()?.includes('kayak');
    if (selectedEquipment === 'active') return equipment?.status === 'active';
    if (selectedEquipment === 'alerts') return equipment?.status === 'alert' || equipment?.status === 'overdue';
    return true;
  });

  // Paginação: 8 itens por página
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredEquipment?.length / itemsPerPage);
  const paginatedEquipment = filteredEquipment?.slice(
    (currentPage - 1) * itemsPerPage,
    (currentPage - 1) * itemsPerPage + itemsPerPage
  );

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">Rastreamento de Equipamentos por GPS</h3>
          <p className="text-sm text-muted-foreground">Monitoramento de localização em tempo real e geofencing</p>

        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e?.target?.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {equipmentOptions?.map((option) => (
              <option key={option?.value} value={option?.value}>
                {option?.label}
              </option>
            ))}
          </select>
          
          <Button variant="outline" iconName="RefreshCw" iconPosition="left">
            Atualizar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map View */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-body font-medium text-foreground">Visualizar Mapa Atual</h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setMapView('satellite')}
                className={`px-2 py-1 text-xs rounded ${
                  mapView === 'satellite' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                Satélite
              </button>
              <button
                onClick={() => setMapView('terrain')}
                className={`px-2 py-1 text-xs rounded ${
                  mapView === 'terrain' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                Terreno
              </button>
            </div>
          </div>
          
          <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              loading="lazy"
              title="Equipment GPS Tracking Map"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=40.7128,-74.0060&z=14&output=embed"
              className="border-0"
            />
            
            {/* Map Overlay Controls */}
            <div className="absolute top-4 right-4 space-y-2">
              <Button variant="outline" size="sm" iconName="ZoomIn" />
              <Button variant="outline" size="sm" iconName="ZoomOut" />
              <Button variant="outline" size="sm" iconName="Maximize2" />
            </div>
            
            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3">
              <div className="space-y-1 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span>Ativo</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-warning rounded-full"></div>
                  <span>Alerta</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-error rounded-full"></div>
                  <span>Atrasado</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment List */}
        <div className="space-y-4">
          <h4 className="font-body font-medium text-foreground">Equipamento Rastreado({filteredEquipment?.length})</h4>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {paginatedEquipment?.map((equipment) => (
              <div key={equipment?.id} className="border border-border rounded-lg p-4 hover:shadow-soft transition-smooth">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      equipment?.status === 'active' ? 'bg-success' :
                      equipment?.status === 'alert' ? 'bg-warning' : 'bg-error'
                    }`}>
                      <Icon name={getStatusIcon(equipment?.status)} size={16} className="text-white" />
                    </div>
                    <div>
                      <h5 className="font-body font-medium text-foreground">{equipment?.name}</h5>
                      <p className="text-sm text-muted-foreground">{equipment?.customer}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-xs font-medium ${getStatusColor(equipment?.status)}`}>
                      {equipment?.status?.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">{equipment?.lastUpdate}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Localização</p>
                    <p className="text-sm font-medium text-foreground">{equipment?.location?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Velocidade</p>
                    <p className="text-sm font-medium text-foreground">{equipment?.speed}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Icon name="Battery" size={14} className={getBatteryColor(equipment?.battery)} />
                    <span className={`text-sm ${getBatteryColor(equipment?.battery)}`}>
                      {equipment?.battery}%
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Icon name="Shield" size={14} className={getGeofenceColor(equipment?.geofenceStatus)} />
                    <span className={`text-sm ${getGeofenceColor(equipment?.geofenceStatus)}`}>
                      {equipment?.geofenceStatus}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Devolução: {equipment?.estimatedReturn}
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" iconName="MapPin">
                      Local
                    </Button>
                    <Button variant="ghost" size="sm" iconName="Phone">
                      Chamar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Página {currentPage} de {Math.max(1, totalPages)}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                iconName="ChevronLeft"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="ChevronRight"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Próximo
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
        <div className="text-center">
          <p className="text-2xl font-heading font-bold text-success">
            {trackedEquipment?.filter(e => e?.status === 'active')?.length}
          </p>
          <p className="text-sm text-muted-foreground">Ativo</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-heading font-bold text-warning">
            {trackedEquipment?.filter(e => e?.status === 'alert')?.length}
          </p>
          <p className="text-sm text-muted-foreground">Alertas</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-heading font-bold text-error">
            {trackedEquipment?.filter(e => e?.status === 'overdue')?.length}
          </p>
          <p className="text-sm text-muted-foreground">Em atraso</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-heading font-bold text-secondary">
            {trackedEquipment?.filter(e => e?.geofenceStatus === 'inside')?.length}
          </p>
          <p className="text-sm text-muted-foreground">Em estoque</p>
        </div>
      </div>
    </div>
  );
};

export default GPSTrackingPanel;