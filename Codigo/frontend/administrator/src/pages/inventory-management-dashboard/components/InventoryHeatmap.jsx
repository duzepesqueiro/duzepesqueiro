import React, { useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const InventoryHeatmap = ({ items, loading, error, onRetry }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const deriveStatus = (stockLevel) => {
    const stock = Number(stockLevel || 0);
    if (!stock || stock <= 0) return 'critical';
    if (stock < 10) return 'low';
    return 'good';
  };

  const heatmapData = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return arr.map((it) => ({
      sku: it?.sku || '-',
      product: it?.product || it?.name || 'Produto sem nome',
      category: it?.category || 'Sem categoria',
      stock: Number(it?.stockLevel || 0),
      inventoryValue: Number(it?.inventoryValue || 0),
      status: deriveStatus(it?.stockLevel),
    }));
  }, [items]);

  const categories = ['all', ...new Set(heatmapData.map((item) => item.category))];

  const filteredData = heatmapData?.filter(item => {
      const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
    return categoryMatch;
  });

  const totalPages = Math.max(1, Math.ceil((filteredData?.length || 0) / itemsPerPage));
  const pageStart = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(pageStart, pageStart + itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, filteredData.length]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'bg-success text-success-foreground';
      case 'low':
        return 'bg-warning text-warning-foreground';
      case 'critical':
        return 'bg-error text-error-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
        return 'CheckCircle';
      case 'low':
        return 'AlertTriangle';
      case 'critical':
        return 'XCircle';
      default:
        return 'Circle';
    }
  };

  const getIntensity = (stock) => {
    const maxStock = Math.max(...filteredData.map((item) => item.stock), 1);
    return Math.min((stock / maxStock) * 100, 100);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-semibold text-foreground">Mapa de Calor do Estoque</h2>
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
    <div className="bg-card border border-border rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold text-foreground">
            Inventário de Equipamentos
          </h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" iconName="RefreshCw" iconPosition="left" onClick={onRetry}>
              Recarregar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-muted-foreground">Categoria:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e?.target?.value)}
              className="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {categories?.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'Todas as categorias' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Heatmap Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedData?.map((item, index) => (
            <div
              key={`${item.sku}-${index}`}
              className="border border-border rounded-lg p-4 hover:shadow-soft-md transition-smooth cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item?.status)}`}>
                  <Icon name={getStatusIcon(item?.status)} size={12} className="mr-1" />
                  {item?.status?.toUpperCase()}
                </div>
                <Icon name="MoreVertical" size={16} className="text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <h3 className="font-body font-medium text-foreground">{item.product}</h3>
                <p className="text-sm text-muted-foreground">{item.sku}</p>
                <p className="text-xs text-muted-foreground">{item.category}</p>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nível do Estoque</span>
                    <span className="font-medium text-foreground">{item.stock}</span>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        item?.status === 'good' ? 'bg-success' :
                        item?.status === 'low' ? 'bg-warning' : 'bg-error'
                      }`}
                      style={{ width: `${getIntensity(item.stock)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span>Valor em estoque</span>
                  <span className="text-foreground">R$ {item.inventoryValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredData?.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Package" size={48} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum item do estoque corresponde aos filtros selecionados.</p>
          </div>
        )}
      </div>
      {/* Legend */}
      <div className="p-6 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span className="text-sm font-medium text-muted-foreground">Legenda de Status:</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success rounded-full" />
                <span className="text-sm text-muted-foreground">Estoque Adequado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-warning rounded-full" />
                <span className="text-sm text-muted-foreground">Estoque Baixo</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-error rounded-full" />
                <span className="text-sm text-muted-foreground">Crítico/Fora de Estoque</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Mostrando {paginatedData.length} de {filteredData.length} itens
            </div>
            <Button
              variant="outline"
              size="sm"
              iconName="ChevronLeft"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              iconName="ChevronRight"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryHeatmap;
