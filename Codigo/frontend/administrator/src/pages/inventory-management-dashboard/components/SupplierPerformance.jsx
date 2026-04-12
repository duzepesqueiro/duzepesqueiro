import React, { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';

const SupplierPerformance = ({ items, loading, error, onRetry }) => {
  const suppliers = Array.isArray(items) ? items : [];
  // Pagination: 3 itens por página
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 3;

  useEffect(() => {
    setCurrentPage(1);
  }, [suppliers]);

  // Derivados de paginação
  const totalPages = Math.max(1, Math.ceil((suppliers?.length || 0) / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const visibleSuppliers = suppliers?.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-semibold text-foreground">Desempenho dos Fornecedores</h2>
          <Button variant="outline" size="sm" iconName="RefreshCw" iconPosition="left" onClick={onRetry} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 text-sm text-destructive">{String(error)}</div>
        )}
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando desempenho dos fornecedores...</div>
        ) : suppliers?.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum fornecedor encontrado.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {visibleSuppliers?.map((supplier) => (
                <div key={supplier?.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-body font-medium text-foreground">{supplier?.name}</h3>
                    <span className="text-sm text-muted-foreground">Rating: {supplier?.rating}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">On-time Delivery:</span>
                      <span className="ml-2 font-medium text-foreground">{supplier?.onTimeDelivery}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quality Score:</span>
                      <span className="ml-2 font-medium text-foreground">{supplier?.qualityScore}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Orders:</span>
                      <span className="ml-2 font-medium text-foreground">{supplier?.totalOrders}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Lead Time:</span>
                      <span className="ml-2 font-medium text-foreground">{supplier?.avgLeadTime}</span>
                    </div>
                  </div>
                  {/* Extra metrics if available */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    {supplier?.totalProducts != null && (
                      <div>
                        <span>Total de Produtos:</span>
                        <span className="ml-2 text-foreground">{supplier?.totalProducts}</span>
                      </div>
                    )}
                    {supplier?.stockoutCount != null && (
                      <div>
                        <span>Sem estoque:</span>
                        <span className="ml-2 text-foreground">{supplier?.stockoutCount}</span>
                      </div>
                    )}
                    {supplier?.lowStockCount != null && (
                      <div>
                        <span>Baixo estoque:</span>
                        <span className="ml-2 text-foreground">{supplier?.lowStockCount}</span>
                      </div>
                    )}
                    {supplier?.availabilityRate != null && (
                      <div>
                        <span>Disponibilidade:</span>
                        <span className="ml-2 text-foreground">{supplier?.availabilityRate}%</span>
                      </div>
                    )}
                    {supplier?.avgMarginPercent != null && (
                      <div>
                        <span>Avg Margin:</span>
                        <span className="ml-2 text-foreground">{supplier?.avgMarginPercent?.toFixed?.(1)}%</span>
                      </div>
                    )}
                    {supplier?.avgDaysSinceRestock != null && (
                      <div>
                        <span>Days Since Restock:</span>
                        <span className="ml-2 text-foreground">{supplier?.avgDaysSinceRestock}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Próxima
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SupplierPerformance;
