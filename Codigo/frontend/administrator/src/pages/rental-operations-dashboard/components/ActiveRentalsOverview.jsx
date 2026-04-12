import React, { useEffect, useState } from 'react';
import Icon from '../../../components/AppIcon';
import { getRentalKpis } from '../../../utils/rentalService';

const ActiveRentalsOverview = () => {
  const [overviewStats, setOverviewStats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        setLoading(true);
        const kpis = await getRentalKpis();
        setOverviewStats(kpis);
      } catch (err) {
        console.error('Falha ao carregar KPIs de alugueis', err);
        setOverviewStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();

    const handleRefresh = () => fetchKpis();
    window.addEventListener('rental:returned', handleRefresh);

    return () => {
      window.removeEventListener('rental:returned', handleRefresh);
    };
  }, []);

  const getChangeColor = (type) => {
    switch (type) {
      case 'positive':
        return 'text-success';
      case 'negative':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const SkeletonCard = () => (
    <div className="bg-card border border-border rounded-lg p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-muted" />
        <div className="w-16 h-4 bg-muted rounded" />
      </div>
      <div className="space-y-2">
        <div className="w-24 h-6 bg-muted rounded" />
        <div className="w-32 h-4 bg-muted rounded" />
        <div className="w-40 h-3 bg-muted rounded" />
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {loading && [1,2,3,4].map(i => <SkeletonCard key={`s-${i}`} />)}
      {!loading && overviewStats?.map((stat) => (
        <div key={stat?.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-soft-md transition-smooth">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-muted ${stat?.color}`}>
              <Icon name={stat?.icon} size={24} />
            </div>
            <div className={`flex items-center space-x-1 text-sm font-medium ${getChangeColor(stat?.changeType)}`}>
              <Icon 
                name={stat?.changeType === 'positive' ? 'TrendingUp' : stat?.changeType === 'negative' ? 'TrendingDown' : 'Minus'} 
                size={16} 
              />
              <span>{stat?.change}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-heading font-bold text-foreground">{stat?.value}</h3>
            <p className="text-sm font-body font-medium text-foreground">{stat?.title}</p>
            <p className="text-xs text-muted-foreground">{stat?.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActiveRentalsOverview;