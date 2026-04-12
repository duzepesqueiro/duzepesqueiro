import React, { useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { generatePurchaseOrderPDF } from '../../../utils/purchaseOrderPdf';

const ReorderSuggestions = ({ items, loading, error, onRetry }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const reorderSuggestions = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return arr.map((it) => ({
      id: it?.id,
      product: it?.product || 'Item',
      currentStock: Number(it?.currentStock || 0),
      minThreshold: Number(it?.minThreshold || 0),
      suggestedQuantity: Number(it?.suggestedQuantity || 0),
      unitCost: Number(it?.unitCost || 0),
      supplier: it?.supplier || '-',
      leadTime: it?.leadTime || '-',
      priority: String(it?.priority || 'medium').toLowerCase(),
    }));
  }, [items]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-error text-error-foreground';
      case 'high':
        return 'bg-warning text-warning-foreground';
      case 'medium':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev?.includes(itemId) 
        ? prev?.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems?.length === reorderSuggestions?.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(reorderSuggestions?.map(item => item?.id));
    }
  };

  const handleCreatePO = (items) => {
    try {
      const selectedSuggestions = reorderSuggestions?.filter(item => items?.includes(item?.id));
      if (!selectedSuggestions?.length) {
        alert('Nenhum produto selecionado para ordem de compra.');
        return;
      }
      const uniqueSuppliers = Array.from(new Set(selectedSuggestions.map(i => i?.supplier).filter(Boolean)));
      const requesterEmail = typeof window !== 'undefined' ? (localStorage.getItem('auth_email') || '') : '';
      const meta = {
        company: 'DuZe Pesqueiro',
        requester: requesterEmail || 'usuario@duze.local',
        supplier: uniqueSuppliers.length === 1 ? uniqueSuppliers[0] : 'Vários fornecedores',
      };
      generatePurchaseOrderPDF(selectedSuggestions, meta);
    } catch (e) {
      console.error('[ReorderSuggestions] Falha ao gerar PDF:', e);
      alert('Não foi possível gerar o PDF da ordem de compra.');
    }
  };

  const totalSelectedCost = reorderSuggestions
    ?.filter(item => selectedItems?.includes(item?.id))
    ?.reduce((sum, item) => sum + ((item?.suggestedQuantity || 0) * (item?.unitCost || 0)), 0);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg max-h-[1000px] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-semibold text-foreground">Sugestão de compra</h2>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="border border-border rounded-lg p-4">
              <div className="h-4 bg-muted rounded w-24 mb-3"></div>
              <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center space-x-3 text-error">
          <Icon name="AlertOctagon" size={20} />
          <span className="font-medium">{String(error)}</span>
        </div>
        <div className="mt-4">
          <Button variant="outline" size="sm" iconName="RefreshCw" onClick={onRetry}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg max-h-[1000px] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-heading font-semibold text-foreground">
          Sugestão de compra
        </h2>
        <div className="mt-3 flex items-center space-x-2">
          <Button variant="outline" size="sm" iconName="RefreshCw" iconPosition="left" onClick={onRetry}>
            Refresh
          </Button>
        </div>
      </div>
      {/* Suggestions List */}
      <div className="p-6">
        {reorderSuggestions?.length > 0 ? (
          <div className="space-y-4">
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border"
                  onChange={handleSelectAll}
                  checked={reorderSuggestions?.length > 0 && selectedItems?.length === reorderSuggestions?.length}
                />
                <span className="text-sm text-muted-foreground">Selecionar todos</span>
              </div>
              <div className="mt-2">
                <Button
                  size="sm"
                  iconName="FilePlus"
                  variant="default"
                  onClick={() => handleCreatePO(selectedItems)}
                  disabled={!selectedItems?.length}
                >
                  Gerar orçamento de compra
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {reorderSuggestions?.map((item) => (
                <div key={item?.id} className="border border-border rounded-lg p-4 hover:shadow-soft-md transition-smooth">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-body font-medium text-foreground">{item?.product}</h3>
                      <p className="text-xs text-muted-foreground">Fornecedor: {item?.supplier} • Lead time: {item?.leadTime}</p>
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item?.priority)}`}>
                      {item?.priority?.toUpperCase()}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Estoque atual</div>
                      <div className="text-sm font-medium">{item?.currentStock}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Qtd sugerida</div>
                      <div className="text-sm font-medium">{item?.suggestedQuantity}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border"
                        onChange={() => handleSelectItem(item?.id)}
                        checked={selectedItems?.includes(item?.id)}
                      />
                      <span className="text-xs text-muted-foreground">Selecionar</span>
                    </div>
                    <Button className="mt-2" size="sm" variant="outline" iconName="FilePlus" onClick={() => handleCreatePO([item?.id])}>
                      Gerar orçamento de compra
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Icon name="Package" size={48} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma sugestão de reposição disponível.</p>
          </div>
        )}
      </div>
      {/* Legend */}
      <div className="p-6 border-t border-border bg-muted/30">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm font-medium text-muted-foreground block mb-2">Legenda de Status:</span>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-secondary rounded-full" />
                <span className="text-sm text-muted-foreground">Normal</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-warning rounded-full" />
                <span className="text-sm text-muted-foreground">Estoque baixo</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-error rounded-full" />
                <span className="text-sm text-muted-foreground">Crítico</span>
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Mostrando {reorderSuggestions?.length} itens • Atualizado agora
            {totalSelectedCost ? <div className="mt-1 text-xs">Custo total selecionado: R$ {totalSelectedCost?.toFixed(2)}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReorderSuggestions;
