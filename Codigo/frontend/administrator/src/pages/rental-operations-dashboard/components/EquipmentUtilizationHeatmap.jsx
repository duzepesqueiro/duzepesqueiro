import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';

const EquipmentUtilizationHeatmap = () => {
  const [selectedView, setSelectedView] = useState('hourly');
  const [selectedEquipment, setSelectedEquipment] = useState('all');

  const viewOptions = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }
  ];

  const equipmentOptions = [
    { value: 'all', label: 'All Equipment' },
    { value: 'boats', label: 'Boats' },
    { value: 'kayaks', label: 'Kayaks' },
    { value: 'fishing-gear', label: 'Fishing Gear' },
    { value: 'accessories', label: 'Accessories' }
  ];

  // Mock hourly utilization data (0-100%)
  const hourlyData = [
    { hour: '6 AM', mon: 15, tue: 20, wed: 18, thu: 25, fri: 35, sat: 85, sun: 75 },
    { hour: '7 AM', mon: 25, tue: 30, wed: 28, thu: 35, fri: 45, sat: 90, sun: 80 },
    { hour: '8 AM', mon: 45, tue: 50, wed: 48, thu: 55, fri: 65, sat: 95, sun: 85 },
    { hour: '9 AM', mon: 65, tue: 70, wed: 68, thu: 75, fri: 80, sat: 98, sun: 90 },
    { hour: '10 AM', mon: 80, tue: 85, wed: 82, thu: 88, fri: 90, sat: 100, sun: 95 },
    { hour: '11 AM', mon: 85, tue: 90, wed: 88, thu: 92, fri: 95, sat: 100, sun: 98 },
    { hour: '12 PM', mon: 90, tue: 95, wed: 92, thu: 96, fri: 98, sat: 100, sun: 100 },
    { hour: '1 PM', mon: 88, tue: 92, wed: 90, thu: 94, fri: 96, sat: 100, sun: 98 },
    { hour: '2 PM', mon: 85, tue: 88, wed: 86, thu: 90, fri: 92, sat: 98, sun: 95 },
    { hour: '3 PM', mon: 80, tue: 82, wed: 80, thu: 85, fri: 88, sat: 95, sun: 90 },
    { hour: '4 PM', mon: 70, tue: 75, wed: 72, thu: 78, fri: 82, sat: 90, sun: 85 },
    { hour: '5 PM', mon: 55, tue: 60, wed: 58, thu: 65, fri: 70, sat: 85, sun: 75 },
    { hour: '6 PM', mon: 35, tue: 40, wed: 38, thu: 45, fri: 55, sat: 75, sun: 65 },
    { hour: '7 PM', mon: 20, tue: 25, wed: 22, thu: 30, fri: 40, sat: 60, sun: 50 }
  ];

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getUtilizationColor = (value) => {
    if (value >= 90) return 'bg-error';
    if (value >= 75) return 'bg-warning';
    if (value >= 50) return 'bg-success';
    if (value >= 25) return 'bg-secondary';
    return 'bg-muted';
  };

  const getUtilizationIntensity = (value) => {
    if (value >= 90) return 'opacity-100';
    if (value >= 75) return 'opacity-80';
    if (value >= 50) return 'opacity-60';
    if (value >= 25) return 'opacity-40';
    return 'opacity-20';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">Mapa de Utilização de Equipamentos</h3>
          <p className="text-sm text-muted-foreground">Padrões de uso e previsão de disponibilidade</p>

        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-foreground">Visualizar:</label>
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e?.target?.value)}
              className="px-3 py-1.5 text-sm border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {viewOptions?.map((option) => (
                <option key={option?.value} value={option?.value}>
                  {option?.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-foreground">Equipamento:</label>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e?.target?.value)}
              className="px-3 py-1.5 text-sm border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {equipmentOptions?.map((option) => (
                <option key={option?.value} value={option?.value}>
                  {option?.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-xs font-medium text-muted-foreground p-2"></div>
            {dayLabels?.map((day) => (
              <div key={day} className="text-xs font-medium text-center text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap Grid */}
          <div className="space-y-1">
            {hourlyData?.map((row) => (
              <div key={row?.hour} className="grid grid-cols-8 gap-1">
                <div className="text-xs font-medium text-muted-foreground p-2 text-right">
                  {row?.hour}
                </div>
                {days?.map((day) => (
                  <div
                    key={day}
                    className={`relative h-8 rounded cursor-pointer transition-all duration-200 hover:scale-105 ${getUtilizationColor(row?.[day])} ${getUtilizationIntensity(row?.[day])}`}
                    title={`${row?.hour} ${dayLabels?.[days?.indexOf(day)]}: ${row?.[day]}% utilization`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {row?.[day]}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 pt-6 border-t border-border space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-foreground">Utilização:</span>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-muted opacity-20 rounded"></div>
            <span className="text-xs text-muted-foreground">0-25%</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-secondary opacity-40 rounded"></div>
            <span className="text-xs text-muted-foreground">25-50%</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-success opacity-60 rounded"></div>
            <span className="text-xs text-muted-foreground">50-75%</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-warning opacity-80 rounded"></div>
            <span className="text-xs text-muted-foreground">75-90%</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-error opacity-100 rounded"></div>
            <span className="text-xs text-muted-foreground">90-100%</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <Icon name="TrendingUp" size={16} className="text-success" />
            <span className="text-muted-foreground">Pico Alto: 12-2 PM</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Icon name="TrendingDown" size={16} className="text-secondary" />
            <span className="text-muted-foreground">Pico Baixo: 6-8 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentUtilizationHeatmap;