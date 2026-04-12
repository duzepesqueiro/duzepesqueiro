import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const TopProductsList = ({ products, className = '' }) => {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return { icon: 'Trophy', color: 'text-warning' };
      case 2:
        return { icon: 'Medal', color: 'text-muted-foreground' };
      case 3:
        return { icon: 'Award', color: 'text-warning/70' };
      default:
        return { icon: 'Circle', color: 'text-muted-foreground' };
    }
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 h-full ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">Melhores Produtos</h3>
          <p className="text-sm text-muted-foreground">Top 10 produtos por vendas</p>
        </div>
        <button className="text-primary hover:text-primary/80 text-sm font-medium transition-smooth">
          Visualizar Todas
        </button>
      </div>
      <div className="space-y-4">
        {products?.map((product, index) => {
          const rank = index + 1;
          const rankInfo = getRankIcon(rank);
          
          // Fallback image if product.image is null/empty
          const imgSrc = product.image || "https://placehold.co/400?text=No+Image";

          return (
            <div key={index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted transition-smooth">
              <div className="flex items-center space-x-3">
                <div className={`${rankInfo?.color}`}>
                  <Icon name={rankInfo?.icon} size={20} />
                </div>
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={imgSrc}
                    alt={product.productName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-body font-medium text-foreground truncate">{product.productName}</h4>
                <p className="text-sm text-muted-foreground">{product.category || 'Geral'}</p>
              </div>
              <div className="text-right">
                <div className="font-body font-semibold text-foreground">
                  {(product.totalRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="flex items-center justify-end space-x-1 text-sm text-muted-foreground">
                  <Icon name="ShoppingBag" size={14} />
                  <span>{product.quantitySold || 0} un.</span>
                </div>
              </div>
            </div>
          );
        })}
        {(!products || products.length === 0) && (
          <div className="text-center text-muted-foreground py-4">
            Nenhum dado de vendas disponível.
          </div>
        )}
      </div>
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total de Produtos Listados</span>
          <span className="font-medium text-foreground">{products?.length || 0} itens</span>
        </div>
      </div>
    </div>
  );
};

export default TopProductsList;