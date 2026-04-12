import React, { useMemo, useState } from 'react';
import Icon from '../../components/AppIcon';
import HostingLayout from './components/HostingLayout';
import HostingKPICard from './components/HostingKPICard';
import HostingRevenueChart from './components/HostingRevenueChart';
import OccupationMap from './components/OccupationMap';

const periodOptions = [
  { label: 'Hoje', value: 'today' },
  { label: '7 dias', value: 'week' },
  { label: '30 dias', value: 'month' },
];

const kpiDataByPeriod = {
  today: [
    { title: 'Total de Chalés', value: 12, icon: 'Home', color: 'var(--color-primary)' },
    { title: 'Ocupados Hoje', value: 8, icon: 'BedDouble', color: 'var(--color-warning)', trend: { value: 6, isPositive: true } },
    { title: 'Taxa de Ocupação Hoje', value: '67%', icon: 'Percent', color: 'var(--color-success)', trend: { value: 4, isPositive: true } },
    { title: 'Reservas Ativas', value: 15, icon: 'CalendarCheck2', color: 'var(--color-accent)', trend: { value: 2, isPositive: true } },
    { title: 'Cancelamentos', value: 3, icon: 'CalendarX2', color: 'var(--color-error)', trend: { value: 1, isPositive: false } },
    { title: 'Receita Total', value: 'R$ 12,5k', icon: 'Wallet', color: 'var(--color-success)', trend: { value: 8, isPositive: true } },
  ],
  week: [
    { title: 'Total de Chalés', value: 12, icon: 'Home', color: 'var(--color-primary)' },
    { title: 'Ocupados Hoje', value: 9, icon: 'BedDouble', color: 'var(--color-warning)', trend: { value: 3, isPositive: true } },
    { title: 'Taxa de Ocupação Hoje', value: '75%', icon: 'Percent', color: 'var(--color-success)', trend: { value: 5, isPositive: true } },
    { title: 'Reservas Ativas', value: 18, icon: 'CalendarCheck2', color: 'var(--color-accent)', trend: { value: 7, isPositive: true } },
    { title: 'Cancelamentos', value: 4, icon: 'CalendarX2', color: 'var(--color-error)', trend: { value: 2, isPositive: false } },
    { title: 'Receita Total', value: 'R$ 21,3k', icon: 'Wallet', color: 'var(--color-success)', trend: { value: 11, isPositive: true } },
  ],
  month: [
    { title: 'Total de Chalés', value: 12, icon: 'Home', color: 'var(--color-primary)' },
    { title: 'Ocupados Hoje', value: 10, icon: 'BedDouble', color: 'var(--color-warning)', trend: { value: 9, isPositive: true } },
    { title: 'Taxa de Ocupação Hoje', value: '82%', icon: 'Percent', color: 'var(--color-success)', trend: { value: 12, isPositive: true } },
    { title: 'Reservas Ativas', value: 24, icon: 'CalendarCheck2', color: 'var(--color-accent)', trend: { value: 14, isPositive: true } },
    { title: 'Cancelamentos', value: 6, icon: 'CalendarX2', color: 'var(--color-error)', trend: { value: 3, isPositive: false } },
    { title: 'Receita Total', value: 'R$ 58,9k', icon: 'Wallet', color: 'var(--color-success)', trend: { value: 18, isPositive: true } },
  ],
};

const HostingDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  const cards = useMemo(() => kpiDataByPeriod[selectedPeriod] || [], [selectedPeriod]);

  return (
    <HostingLayout
      title="Dashboard de Hospedagem"
      subtitle="KPIs, receita por chalé e mapa de ocupação em tempo real"
      actions={
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedPeriod(option.value)}
              className={`px-3 py-1.5 text-xs rounded-md transition-smooth ${
                selectedPeriod === option.value
                  ? 'bg-card text-foreground shadow-soft font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.slice(0, 4).map((kpi) => (
          <HostingKPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            trend={kpi.trend}
            color={kpi.color}
            icon={<Icon name={kpi.icon} size={18} />}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.slice(4).map((kpi) => (
          <HostingKPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            trend={kpi.trend}
            color={kpi.color}
            icon={<Icon name={kpi.icon} size={18} />}
          />
        ))}
      </div>

      <HostingRevenueChart />
      <OccupationMap />
    </HostingLayout>
  );
};

export default HostingDashboard;
