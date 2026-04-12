import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';

const actions = [
  {
    icon: 'Package',
    title: 'Visualizar Estoque',
    subtitle: 'Revisar Níveis de Estoque',
    to: '/inventory-management-dashboard',
    iconClass: 'text-primary',
  },
  {
    icon: 'TrendingUp',
    title: 'Relatório de Vendas',
    subtitle: 'Gerar Relatório Detalhado',
    to: '/sales-analytics-dashboard',
    iconClass: 'text-success',
  },
  {
    icon: 'Calendar',
    title: 'Cronograma de Aluguel',
    subtitle: 'Visualização de Reservas',
    to: '/rental-operations-dashboard',
    iconClass: 'text-warning',
  },
  {
    icon: 'Users',
    title: 'Usuários',
    subtitle: 'Gerenciar usuários e acessos',
    to: '/users-management-dashboard',
    iconClass: 'text-muted-foreground',
  },
];

const QuickActions = ({ className = '' }) => {
  const navigate = useNavigate();
  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-heading font-semibold text-foreground mb-4">Ações Rápidas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((a) => (
          <button
            key={a.title}
            className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted transition-smooth"
            onClick={() => navigate(a.to)}
          >
            <Icon name={a.icon} size={20} className={a.iconClass} />
            <div className="text-left">
              <div className="font-medium text-foreground">{a.title}</div>
              <div className="text-sm text-muted-foreground">{a.subtitle}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;

