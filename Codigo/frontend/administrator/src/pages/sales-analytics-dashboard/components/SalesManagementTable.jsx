import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { listAdminSales, confirmAdminSale, cancelAdminSale } from '../../../utils/salesManagementService';
import CreateSaleOrderModal from './CreateSaleOrderModal';
import SaleOrderDetailsModal from './SaleOrderDetailsModal';

const SalesManagementTable = ({ onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [orders, setOrders] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listAdminSales({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      status: statusFilter,
      sortField,
      sortDirection,
    })
      .then((res) => {
        if (!mounted) return;
        const payload = res?.data;
        setOrders(Array.isArray(payload?.items) ? payload.items : []);
        setTotalPages(Number(payload?.totalPages || 1));
        setTotal(Number(payload?.total || 0));
      })
      .catch((err) => {
        console.error('Falha ao carregar ordens de compra:', err);
        if (!mounted) return;
        setError('Não foi possível carregar as ordens de compra.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, sortField, sortDirection]);

  const tableColumns = [
    { key: 'id', label: 'ID da Ordem' },
    { key: 'buyerName', label: 'Cliente' },
    { key: 'productName', label: 'Produto(s)' },
    { key: 'quantity', label: 'Quantidade' },
    { key: 'totalPrice', label: 'Valor Total' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Data do Pedido' },
  ];

  const paginatedData = useMemo(() => orders, [orders]);

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-500/10 text-gray-600';
    switch (status.toLowerCase()) {
      case 'pendente': return 'bg-amber-500/10 text-amber-600';
      case 'efetivada': return 'bg-green-500/10 text-green-600';
      case 'cancelada': return 'bg-red-500/10 text-red-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return 'Circle';
    switch (status.toLowerCase()) {
      case 'pendente': return 'Clock';
      case 'efetivada': return 'CheckCircle';
      case 'cancelada': return 'XCircle';
      default: return 'Circle';
    }
  };

  const refreshOrders = async () => {
    try {
      const res = await listAdminSales({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        status: statusFilter,
        sortField,
        sortDirection,
      });
      const payload = res?.data;
      setOrders(Array.isArray(payload?.items) ? payload.items : []);
      setTotalPages(Number(payload?.totalPages || 1));
      setTotal(Number(payload?.total || 0));
    } catch (err) {
      console.error('Erro ao atualizar ordens:', err);
      setError('Falha ao atualizar ordens.');
    }
  };

  const handleConfirm = async (orderId) => {
    try {
      await confirmAdminSale(orderId);
      await refreshOrders();
      if (onRefresh) onRefresh();
    } catch (err) {
      const msg = err?.response?.data || err?.message;
      alert(`Não foi possível confirmar a compra: ${msg}`);
    }
  };

  const handleCancel = async (orderId) => {
    try {
      await cancelAdminSale(orderId);
      await refreshOrders();
      if (onRefresh) onRefresh();
    } catch (err) {
      const msg = err?.response?.data || err?.message;
      alert(`Não foi possível cancelar a compra: ${msg}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-error">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:gap-4">
            <h2 className="text-xl font-heading font-semibold text-foreground">Gerenciar Vendas</h2>
            <Input
              type="search"
              placeholder="Buscar por cliente, produto ou ID..."
              value={searchTerm}
              onChange={(e) => {
                setCurrentPage(1);
                setSearchTerm(e.target.value);
              }}
              className="w-full md:w-64"
            />
            <Select
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'pendente', label: 'Pendente' },
                { value: 'efetivada', label: 'Efetivada' },
                { value: 'cancelada', label: 'Cancelada' },
              ]}
              placeholder="Filtrar por status"
              value={statusFilter}
              onChange={(v) => {
                setCurrentPage(1);
                setStatusFilter(v);
              }}
              className="w-full md:w-48"
            />
          </div>
          <div className="mt-4 md:mt-0">
            <Button variant="default" iconName="Plus" onClick={() => setIsCreateOpen(true)}>
              Nova venda
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted/50 scrollbar-track-transparent">
        <table className="w-full min-w-[900px]">
          <thead className="bg-muted/50">
            <tr>
              {tableColumns.map(col => (
                <th
                  key={col.key}
                  className="p-4 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap"
                  onClick={() => {
                    if (sortField === col.key) {
                      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setSortField(col.key);
                      setSortDirection('asc');
                    }
                    setCurrentPage(1);
                  }}
                >
                  {col.label}
                </th>
              ))}
              <th className="p-4 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.map(order => (
              <tr key={order.id} className="hover:bg-muted/50 transition-smooth">
                <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setDetailsId(order.id)}
                  >
                    {order.id}
                  </button>
                </td>
                <td className="p-4 font-medium text-foreground whitespace-nowrap">{order.buyerName}</td>
                <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">{order.productName || '-'}</td>
                <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">{order.quantity}</td>
                <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">{order.totalPrice?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="p-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    <Icon name={getStatusIcon(order.status)} size={12} className="mr-1" />
                    {(order.status || '').toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">{order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : '-'}</td>
                <td className="p-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="CheckCircle"
                    onClick={() => handleConfirm(order.id)}
                    disabled={(order.status || '').toLowerCase() === 'efetivada'}
                    className="text-success border-success hover:bg-success/10"
                  >
                    Confirmar Compra
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="XCircle"
                    onClick={() => handleCancel(order.id)}
                    disabled={(order.status || '').toLowerCase() === 'cancelada'}
                    className="text-error border-error hover:bg-error/10"
                  >
                    Cancelar Compra
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="px-6 pb-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Página {currentPage} de {Math.max(1, totalPages)} • {total.toLocaleString('pt-BR')} registros
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconName="ChevronLeft"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconName="ChevronRight"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
          >
            Próximo
          </Button>
        </div>
      </div>

      <CreateSaleOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={async () => {
          await refreshOrders();
          onRefresh?.();
        }}
      />

      <SaleOrderDetailsModal
        isOpen={Boolean(detailsId)}
        saleId={detailsId}
        onClose={() => setDetailsId('')}
        onChanged={async () => {
          await refreshOrders();
          onRefresh?.();
        }}
      />
    </div>
  );
};

export default SalesManagementTable;
