import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { getRentalHistory, returnRental, updateRentalCondition } from '../../../utils/rentalService';

const RentalHistoryTable = ({ onRefreshTimeline }) => {
  const [sortField, setSortField] = useState('returnTime');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCondition, setPendingCondition] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  useEffect(() => { fetchHistory(); }, []);
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getRentalHistory();
      setHistory(data);
    } catch (err) {
      console.error('Falha ao carregar histórico de alugueis', err);
    } finally {
      setLoading(false);
    }
  };

  const markReturned = async (rentalId, conditionValue) => {
    try {
      const payload = {};
      if (conditionValue && conditionValue !== 'none') payload.condition = conditionValue;
      await returnRental(rentalId, payload);
      fetchHistory();
      if (typeof onRefreshTimeline === 'function') onRefreshTimeline();
      try {
        window.dispatchEvent(new CustomEvent('rental:returned', { detail: { id: rentalId } }));
      } catch (e) {
        console.warn('Falha ao despachar evento rental:returned', e);
      }
    } catch (err) {
      console.error('Erro ao marcar devolução', err);
    }
  };

  const changeCondition = async (rentalId, conditionValue) => {
    try {
      const payload = { condition: conditionValue === 'none' ? null : conditionValue };
      await updateRentalCondition(rentalId, payload);
      fetchHistory();
      if (typeof onRefreshTimeline === 'function') onRefreshTimeline();
    } catch (err) {
      console.error('Erro ao atualizar condição', err);
    }
  };

  const handleConditionSelect = (rentalId, value) => {
    setPendingCondition(prev => ({ ...prev, [rentalId]: value }));
  };

  const statusOptions = [
    { value: 'all', label: 'Todos os Status' },
    { value: 'active', label: 'Ativo' },
    { value: 'returned', label: 'Devolvido' },
    { value: 'overdue', label: 'Atrasado' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'overdue':
        return 'bg-error/10 text-error border-error/20';
      case 'returned':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-secondary/10 text-secondary border-secondary/20';
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'excellent':
        return 'text-success';
      case 'good':
        return 'text-secondary';
      case 'fair':
        return 'text-warning';
      case 'poor':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const getConditionIcon = (condition) => {
    switch (condition) {
      case 'excellent':
        return 'CheckCircle2';
      case 'good':
        return 'CheckCircle';
      case 'fair':
        return 'AlertCircle';
      case 'poor':
        return 'XCircle';
      default:
        return 'HelpCircle';
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredData = history?.filter(rental => 
    filterStatus === 'all' || rental?.status === filterStatus
  );

  // Paginação: 8 itens por página
  const totalPages = Math.ceil((filteredData?.length ?? 0) / itemsPerPage);
  const paginatedData = filteredData?.slice(
    (currentPage - 1) * itemsPerPage,
    (currentPage - 1) * itemsPerPage + itemsPerPage
  );
  
  useEffect(() => {
    // Garante que a página atual esteja dentro dos limites após filtrar
    setCurrentPage((p) => Math.min(Math.max(1, totalPages || 1), p));
  }, [filteredData?.length, itemsPerPage, totalPages]);
  const formatDateTime = (dateTime) => {
    if (!dateTime) return '-';
    const date = new Date(dateTime);
    return date?.toLocaleString('pt-BR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">Histórico de Aluguel</h3>
          <p className="text-sm text-muted-foreground">Rastreamento e Análise do Histórico de Aluguel</p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e?.target?.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {statusOptions?.map((option) => (
              <option key={option?.value} value={option?.value}>
                {option?.label}
              </option>
            ))}
          </select>
          
          <Button variant="outline" iconName="Download" iconPosition="left">
            Exportar
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('equipment')}
                  className="flex items-center space-x-1 hover:text-foreground transition-smooth"
                >
                  <span>Equipamento</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('startTime')}
                  className="flex items-center space-x-1 hover:text-foreground transition-smooth"
                >
                  <span>Horário de Início</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('returnTime')}
                  className="flex items-center space-x-1 hover:text-foreground transition-smooth"
                >
                  <span>Horário de Devolução</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Duração</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Condição</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                <button
                  onClick={() => handleSort('revenue')}
                  className="flex items-center space-x-1 hover:text-foreground transition-smooth"
                >
                  <span>Faturamento</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData?.map((rental) => (
              <tr key={rental?.id} className="border-b border-border hover:bg-muted/50 transition-smooth">
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium text-foreground">{rental?.equipment}</p>
                    <p className="text-sm text-muted-foreground">{rental?.location}</p>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium text-foreground">{rental?.customer}</p>
                    <p className="text-sm text-muted-foreground">{rental?.phone}</p>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm text-foreground">
                  {formatDateTime(rental?.startTime)}
                </td>
                <td className="py-4 px-4 text-sm text-foreground">
                  {formatDateTime(rental?.returnTime)}
                </td>
                <td className="py-4 px-4 text-sm text-foreground">
                  {rental?.duration}
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(rental?.status)}`}>
                    {rental?.status === 'active' ? 'Ativo' : rental?.status === 'returned' ? 'Devolvido' : rental?.status === 'overdue' ? 'Atrasado' : rental?.status}
                  </span>
                </td>
                <td className="py-4 px-4">
                  {rental?.condition ? (
                    <div className="flex items-center space-x-1">
                      <Icon 
                        name={getConditionIcon(rental?.condition)} 
                        size={16} 
                        className={getConditionColor(rental?.condition)} 
                      />
                      <span className={`text-sm ${getConditionColor(rental?.condition)}`}>
                        {rental?.condition === 'excellent' ? 'Excelente' : rental?.condition === 'good' ? 'Bom' : rental?.condition === 'fair' ? 'Justo' : rental?.condition === 'poor' ? 'Ruim' : '-'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium text-foreground">{rental?.revenue}</p>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    {(rental?.status === 'active' || rental?.status === 'overdue') && (
                      <>
                        <Button variant="ghost" size="sm" iconName="Phone">
                          Chamar
                        </Button>
                        <select
                          value={pendingCondition?.[rental?.id] ?? (rental?.condition || 'none')}
                          onChange={(e) => handleConditionSelect(rental?.id, e.target.value)}
                          className="px-2 py-1 text-xs border border-border rounded-md bg-card text-foreground"
                        >
                          <option value="none">Sem condição</option>
                          <option value="excellent">Excelente</option>
                          <option value="good">Bom</option>
                          <option value="fair">Justo</option>
                          <option value="poor">Ruim</option>
                        </select>
                        <Button
                          variant="default"
                          size="sm"
                          iconName="CornerDownLeft"
                          onClick={() => markReturned(rental?.id, pendingCondition?.[rental?.id])}
                        >
                          Devolver
                        </Button>
                      </>
                    )}
                    {rental?.status === 'returned' && (
                      <>
                        <select
                          value={pendingCondition?.[rental?.id] ?? (rental?.condition || 'none')}
                          onChange={(e) => handleConditionSelect(rental?.id, e.target.value)}
                          className="px-2 py-1 text-xs border border-border rounded-md bg-card text-foreground"
                        >
                          <option value="none">Sem condição</option>
                          <option value="excellent">Excelente</option>
                          <option value="good">Bom</option>
                          <option value="fair">Justo</option>
                          <option value="poor">Ruim</option>
                        </select>
                        <Button
                          variant="default"
                          size="sm"
                          iconName="Save"
                          onClick={() => changeCondition(rental?.id, pendingCondition?.[rental?.id])}
                        >
                          Salvar
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Página {currentPage} de {Math.max(1, totalPages)}
        </p>
        <div className="flex items-center space-x-2">
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
  );
};

export default RentalHistoryTable;
