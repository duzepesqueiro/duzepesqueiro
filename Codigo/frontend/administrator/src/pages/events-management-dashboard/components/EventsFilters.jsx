import React, { useState } from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const EventsFilters = ({ onFiltersChange, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'last-30-days',
    salesRep: [],
    productCategory: [],
    customerSegment: [],
    customStartDate: '',
    customEndDate: '',
    minAmount: '',
    maxAmount: '',
  });

  const dateRangeOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'last-7-days', label: 'Últimos 7 dias' },
    { value: 'last-30-days', label: 'Últimos 30 dias' },
    { value: 'last-90-days', label: 'Últimos 90 dias' },
    { value: 'this-month', label: 'Este mês' },
    { value: 'last-month', label: 'Mês passado' },
    { value: 'this-quarter', label: 'Este trimestre' },
    { value: 'this-year', label: 'Este ano' },
    { value: 'custom', label: 'Intervalo personalizado' },
  ];

  const salesRepOptions = [
    { value: 'all', label: 'Todos os vendedores' },
    { value: 'john-smith', label: 'John Smith' },
    { value: 'sarah-johnson', label: 'Sarah Johnson' },
    { value: 'mike-davis', label: 'Mike Davis' },
    { value: 'lisa-wilson', label: 'Lisa Wilson' },
    { value: 'tom-brown', label: 'Tom Brown' },
  ];

  const categoryOptions = [
    { value: 'fishing-rods', label: 'Varas de Pesca' },
    { value: 'reels', label: 'Carretilhas' },
    { value: 'tackle-boxes', label: 'Caixas de Pesca' },
    { value: 'bait-lures', label: 'Iscas e Anzóis' },
    { value: 'fishing-line', label: 'Linha de Pesca' },
    { value: 'accessories', label: 'Acessórios' },
    { value: 'apparel', label: 'Vestuário' },
    { value: 'licenses', label: 'Licenças' },
  ];

  const segmentOptions = [
    { value: 'new-customers', label: 'Novos clientes' },
    { value: 'returning-customers', label: 'Clientes recorrentes' },
    { value: 'vip-customers', label: 'Clientes VIP' },
    { value: 'seasonal-customers', label: 'Clientes sazonais' },
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const handleMultiSelectChange = (key, value, checked) => {
    const currentValues = filters?.[key];
    let newValues;
    
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues?.filter(v => v !== value);
    }
    
    handleFilterChange(key, newValues);
  };

  const resetFilters = () => {
    const defaultFilters = {
      dateRange: 'last-30-days',
      salesRep: [],
      productCategory: [],
      customerSegment: [],
      customStartDate: '',
      customEndDate: '',
      minAmount: '',
      maxAmount: '',
    };
    setFilters(defaultFilters);
    if (onFiltersChange) {
      onFiltersChange(defaultFilters);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters?.dateRange !== 'last-30-days') count++;
    if (filters?.salesRep?.length > 0) count++;
    if (filters?.productCategory?.length > 0) count++;
    if (filters?.customerSegment?.length > 0) count++;
    if (filters?.minAmount || filters?.maxAmount) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      {/* Filter Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icon name="Filter" size={20} className="text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Filtro de Eventos</h3>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-primary rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              iconName="RotateCcw"
              iconPosition="left"
            >
              Limpar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
              iconPosition="right"
            >
              {isExpanded ? 'Recolher' : 'Expandir'}
            </Button>
          </div>
        </div>
      </div>
      {/* Quick Filters (Always Visible) */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Período"
            options={dateRangeOptions}
            value={filters?.dateRange}
            onChange={(value) => handleFilterChange('dateRange', value)}
          />
          
          <Select
            label="Vendedor"
            options={salesRepOptions}
            value={filters?.salesRep?.length > 0 ? filters?.salesRep?.[0] : 'all'}
            onChange={(value) => handleFilterChange('salesRep', value === 'all' ? [] : [value])}
          />

          {filters?.dateRange === 'custom' && (
            <>
              <Input
                label="Data inicial"
                type="date"
                value={filters?.customStartDate}
                onChange={(e) => handleFilterChange('customStartDate', e?.target?.value)}
              />
              <Input
                label="Data final"
                type="date"
                value={filters?.customEndDate}
                onChange={(e) => handleFilterChange('customEndDate', e?.target?.value)}
              />
            </>
          )}
        </div>
      </div>
      {/* Advanced Filters (Expandable) */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Product Categories */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Categoria dos Produtos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {categoryOptions?.map((category) => (
                <Checkbox
                  key={category?.value}
                  label={category?.label}
                  checked={filters?.productCategory?.includes(category?.value)}
                  onChange={(e) => handleMultiSelectChange('productCategory', category?.value, e?.target?.checked)}
                />
              ))}
            </div>
          </div>

          {/* Customer Segments */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Perfil do Cliente</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {segmentOptions?.map((segment) => (
                <Checkbox
                  key={segment?.value}
                  label={segment?.label}
                  checked={filters?.customerSegment?.includes(segment?.value)}
                  onChange={(e) => handleMultiSelectChange('customerSegment', segment?.value, e?.target?.checked)}
                />
              ))}
            </div>
          </div>

          {/* Amount Range */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Valor da Transação</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Valor mínimo"
                type="number"
                placeholder="R$ 0"
                value={filters?.minAmount}
                onChange={(e) => handleFilterChange('minAmount', e?.target?.value)}
              />
              <Input
                label="Valor máximo"
                type="number"
                placeholder="Sem limite"
                value={filters?.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e?.target?.value)}
              />
            </div>
          </div>
        </div>
      )}
      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <div className="p-4 bg-muted">
          <div className="flex flex-wrap gap-2">
            {filters?.dateRange !== 'last-30-days' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm">
                <Icon name="Calendar" size={14} className="mr-1" />
                {dateRangeOptions?.find(opt => opt?.value === filters?.dateRange)?.label}
                <button
                  onClick={() => handleFilterChange('dateRange', 'last-30-days')}
                  className="ml-2 hover:bg-primary-foreground/20 rounded-full p-0.5"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            )}
            
            {filters?.salesRep?.length > 0 && (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
                <Icon name="User" size={14} className="mr-1" />
                {filters?.salesRep?.length} Vendedor(es)
                <button
                  onClick={() => handleFilterChange('salesRep', [])}
                  className="ml-2 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            )}
            
            {filters?.productCategory?.length > 0 && (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm">
                <Icon name="Package" size={14} className="mr-1" />
                {filters?.productCategory?.length} Categorias
                <button
                  onClick={() => handleFilterChange('productCategory', [])}
                  className="ml-2 hover:bg-accent-foreground/20 rounded-full p-0.5"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsFilters;
