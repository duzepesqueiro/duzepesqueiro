import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { getRentalTimeline } from '../../../utils/rentalService';

const RentalTimelineVisualization = ({ lastRefresh }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('today');
  
  const timeframeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  const [rentalTimeline, setRentalTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  // Paginação: 8 itens por página
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchTimeline = async (range) => {
    try {
      setLoading(true);
      const items = await getRentalTimeline(range);
      const mapped = items.map(d => {
        const start = d?.startTime || '';
        const end = d?.endTime || '';
        const startTime = start.includes(' ') ? start.split(' ')[1] : start;
        const endTime = end.includes(' ') ? end.split(' ')[1] : end;
        return {
          id: d?.id,
          equipment: d?.productName || 'Equipamento',
          customer: d?.customer || '',
          startTime,
          endTime,
          duration: d?.rentalHours != null ? `${d?.rentalHours}h` : '',
          status: d?.status || 'active',
          progress: d?.progressPercent || 0,
          location: 'Main Facility',
          revenue: d?.formattedTotal || ''
        };
      });
      setRentalTimeline(mapped);
    } catch (err) {
      console.error('Falha ao carregar timeline de alugueis', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline(selectedTimeframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeframe, lastRefresh]);

  // Calcular paginação para o cronograma
  const totalPages = Math.ceil((rentalTimeline?.length ?? 0) / itemsPerPage);
  const paginatedTimeline = rentalTimeline?.slice(
    (currentPage - 1) * itemsPerPage,
    (currentPage - 1) * itemsPerPage + itemsPerPage
  );
  
  useEffect(() => {
    // Ajusta página atual se o tamanho da lista mudar
    setCurrentPage((p) => Math.min(Math.max(1, totalPages || 1), p));
  }, [rentalTimeline?.length, itemsPerPage, totalPages]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-success';
      case 'overdue':
        return 'bg-error';
      case 'returned':
        return 'bg-muted-foreground';
      default:
        return 'bg-secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return 'Play';
      case 'overdue':
        return 'AlertTriangle';
      case 'returned':
        return 'CheckCircle';
      default:
        return 'Clock';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 h-full max-h-[1000px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">Cronograma</h3>
          <p className="text-sm text-muted-foreground">Rastreamento e Agendamento de Equipamentos em Tempo Real</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {timeframeOptions?.map((option) => (
            <button
              key={option?.value}
              onClick={() => setSelectedTimeframe(option?.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-smooth ${
                selectedTimeframe === option?.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {option?.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4 flex-1 overflow-y-auto pr-2">
        {paginatedTimeline?.map((rental) => (
          <div key={rental?.id} className="border border-border rounded-lg p-4 hover:shadow-soft transition-smooth">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(rental?.status)}`}>
                  <Icon name={getStatusIcon(rental?.status)} size={16} className="text-white" />
                </div>
                <div>
                  <h4 className="font-body font-medium text-foreground">{rental?.equipment}</h4>
                  <p className="text-sm text-muted-foreground">{rental?.customer}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{rental?.revenue}</p>
                <p className="text-xs text-muted-foreground">{rental?.duration}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>{rental?.startTime} - {rental?.endTime}</span>
                <span className="flex items-center space-x-1">
                  <Icon name="MapPin" size={14} />
                  <span>{rental?.location}</span>
                </span>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                rental?.status === 'active' ? 'bg-success/10 text-success' :
                rental?.status === 'overdue'? 'bg-error/10 text-error' : 'bg-muted text-muted-foreground'
              }`}>
                {rental?.status?.charAt(0)?.toUpperCase() + rental?.status?.slice(1)}
              </span>
            </div>

            <div className="relative">
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    rental?.progress > 100 ? 'bg-error' : 'bg-success'
                  }`}
                  style={{ width: `${Math.min(rental?.progress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Inicio</span>
                <span>{rental?.progress}%</span>
                <span>Fim</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-success rounded-full"></div>
            <span className="text-muted-foreground">Ativo</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-error rounded-full"></div>
            <span className="text-muted-foreground">Atrasado</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
            <span className="text-muted-foreground">Devolvido</span>
          </div>
        </div>
        
        <button className="flex items-center space-x-2 text-sm text-secondary hover:text-secondary/80 transition-smooth" onClick={() => fetchTimeline(selectedTimeframe)}>
          <Icon name="RefreshCw" size={16} />
          <span>Atualização Automática: Ativa</span>
        </button>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Página {currentPage} de {Math.max(1, totalPages)}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconName="ChevronLeft"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconName="ChevronRight"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalTimelineVisualization;
