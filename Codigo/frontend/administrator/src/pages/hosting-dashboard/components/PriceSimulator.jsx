import React from 'react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const getPriceStyles = (sign) => {
  if (sign === 'decrease') {
    return {
      valueText: 'text-red-300',
      badge: 'bg-red-100 text-red-700',
      ruleBadge: 'bg-red-100 text-red-700',
    };
  }
  if (sign === 'increase') {
    return {
      valueText: 'text-green-300',
      badge: 'bg-green-100 text-green-700',
      ruleBadge: 'bg-green-100 text-green-700',
    };
  }
  return {
    valueText: 'text-white',
    badge: 'bg-slate-700 text-slate-200',
    ruleBadge: 'bg-slate-700 text-slate-200',
  };
};

const PriceSimulator = ({ simulation }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-heading font-semibold text-foreground mb-4">Simulação de Preços (Hoje)</h3>
      {!simulation.length ? (
        <div className="text-sm text-muted-foreground">Nenhum chalé cadastrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {simulation.map((item) => {
            const styles = getPriceStyles(item.sign);
            return (
              <div key={item.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 hover:shadow-soft-md transition-smooth">
                <h4 className="text-base font-semibold text-white">{item.name}</h4>
                <p className="text-sm text-slate-300 mb-4">Tipo: {item.type}</p>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">Original</p>
                    <p className="text-xl font-bold text-slate-100">{formatCurrency(item.basePrice)}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">Hoje</p>
                    <p className={`text-2xl font-extrabold ${item.hasChange ? styles.valueText : 'text-white'}`}>
                      {formatCurrency(item.finalPrice)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">Variação</p>
                    {item.hasChange ? (
                      <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-semibold ${styles.badge}`}>
                        {item.sign === 'decrease' ? '-' : '+'}{formatCurrency(Math.abs(item.delta))} /dia ({item.sign === 'decrease' ? '-' : '+'}{item.percent}%)
                      </span>
                    ) : (
                      <span className="inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-200">
                        Sem alteração
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">Regra Vigente</p>
                    {item.ruleName ? (
                      <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-semibold ${styles.ruleBadge}`}>
                        {item.ruleName}
                      </span>
                    ) : (
                      <span className="inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-200">
                        Sem regra ativa
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PriceSimulator;
