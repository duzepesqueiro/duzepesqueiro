import React from 'react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const PriceSimulator = ({ simulation }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-heading font-semibold text-foreground mb-4">Simulação de Preços (Hoje)</h3>
      {!simulation.length ? (
        <div className="text-sm text-muted-foreground">Nenhum chalé cadastrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {simulation.map((item) => (
            <div key={item.id} className="bg-white border border-border rounded-[12px] p-4 hover:shadow-soft-md transition-smooth">
              <h4 className="text-base font-semibold text-foreground">{item.name}</h4>
              <p className="text-sm text-muted-foreground mb-3">Tipo: {item.type}</p>

              {item.hasChange ? (
                <>
                  <p className="text-sm text-muted-foreground line-through">{formatCurrency(item.basePrice)}</p>
                  <p className="text-sm text-muted-foreground mt-1">↓ ({item.sign === 'decrease' ? '-' : '+'}{item.percent}%)</p>
                  <p className="text-xs text-muted-foreground mt-2">Com ajuste:</p>
                  <p className={`text-2xl font-bold ${item.sign === 'decrease' ? 'text-primary' : 'text-success'}`}>
                    {formatCurrency(item.finalPrice)}
                  </p>
                  <span className={`inline-flex mt-3 px-2 py-1 rounded-full text-xs font-semibold ${item.sign === 'decrease' ? 'bg-emerald-100 text-emerald-700' : 'bg-green-100 text-green-700'}`}>
                    {item.sign === 'decrease' ? '-' : '+'}{formatCurrency(Math.abs(item.delta))}
                    /dia
                  </span>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Original: {formatCurrency(item.basePrice)}</p>
                  <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(item.finalPrice)}</p>
                  <span className="inline-flex mt-3 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    Sem alteração
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PriceSimulator;
