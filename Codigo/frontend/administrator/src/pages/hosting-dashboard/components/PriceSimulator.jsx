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
            <div key={item.id} className="bg-white border border-border rounded-xl p-4 hover:shadow-soft-md transition-smooth">
              <h4 className="text-base font-semibold text-foreground">{item.name}</h4>
              <p className="text-sm text-muted-foreground mb-4">Tipo: {item.type}</p>

              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Original</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(item.basePrice)}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Hoje</p>
                  <p className={`text-2xl font-extrabold ${item.hasChange ? (item.sign === 'decrease' ? 'text-primary' : 'text-success') : 'text-foreground'}`}>
                    {formatCurrency(item.finalPrice)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Variação</p>
                  {item.hasChange ? (
                    <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-semibold ${item.sign === 'decrease' ? 'bg-emerald-100 text-emerald-700' : 'bg-green-100 text-green-700'}`}>
                      {item.sign === 'decrease' ? '-' : '+'}{formatCurrency(Math.abs(item.delta))} /dia ({item.sign === 'decrease' ? '-' : '+'}{item.percent}%)
                    </span>
                  ) : (
                    <span className="inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      Sem alteração
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PriceSimulator;
