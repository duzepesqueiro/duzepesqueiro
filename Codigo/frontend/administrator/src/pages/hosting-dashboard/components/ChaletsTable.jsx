import React, { useMemo, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const typeStyle = {
  STANDARD: 'bg-gray-100 text-gray-700',
  DELUXE: 'bg-amber-100 text-amber-700',
  SUITE: 'bg-purple-100 text-purple-700',
};

const statusStyle = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  OCCUPIED: 'bg-yellow-100 text-yellow-700',
  RESERVED: 'bg-sky-100 text-sky-700',
  MAINTENANCE: 'bg-gray-100 text-gray-700',
  CLEANING: 'bg-gray-100 text-gray-700',
  ADMIN: 'bg-gray-100 text-gray-700',
  INTERDICTED: 'bg-gray-100 text-gray-700',
};

const statusIcon = {
  AVAILABLE: '🟩',
  OCCUPIED: '🟨',
  RESERVED: '🟦',
  MAINTENANCE: '⬜',
  CLEANING: '⬜',
  ADMIN: '⬜',
  INTERDICTED: '⬜',
};

const sortValue = (chalet, key) => {
  if (key === 'maxGuests') {
    return Number(chalet.maxGuests) || 0;
  }
  if (key === 'basePrice') {
    return Number(chalet.basePrice) || 0;
  }
  return String(chalet[key] || '').toLowerCase();
};

const formatDailyRate = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

const truncate = (text, max = 50) => {
  if (!text) {
    return '-';
  }
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const headers = [
  { key: 'code', label: 'Código' },
  { key: 'name', label: 'Nome' },
  { key: 'unitType', label: 'Tipo' },
  { key: 'maxGuests', label: 'Capacidade' },
  { key: 'basePrice', label: 'Diária' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Observações' },
];

const unitTypeLabel = {
  STANDARD: 'Standard',
  DELUXE: 'Deluxe',
  SUITE: 'Suite',
};

const statusLabel = {
  AVAILABLE: 'Livre',
  OCCUPIED: 'Ocupado',
  RESERVED: 'Reservado',
  MAINTENANCE: 'Manutenção',
  CLEANING: 'Limpeza',
  ADMIN: 'Administrativo',
  INTERDICTED: 'Interditado',
};

const ChaletsTable = ({ chalets, onEdit, onDelete }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const sortedChalets = useMemo(() => {
    const list = [...chalets];
    list.sort((a, b) => {
      const aValue = sortValue(a, sortConfig.key);
      const bValue = sortValue(b, sortConfig.key);
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return list;
  }, [chalets, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {headers.map((header) => (
                <th key={header.key} className="px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => handleSort(header.key)}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-smooth"
                  >
                    {header.label}
                    {sortConfig.key === header.key ? (
                      <Icon name={sortConfig.direction === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={14} />
                    ) : (
                      <Icon name="ArrowUpDown" size={14} />
                    )}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedChalets.map((chalet) => (
              <tr key={chalet.id} className="border-b border-border last:border-b-0 hover:bg-muted/40 transition-smooth">
                <td className="px-4 py-3 text-sm text-muted-foreground">{chalet.code || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{chalet.name}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${typeStyle[chalet.unitType] || 'bg-muted text-foreground'}`}>
                    {unitTypeLabel[chalet.unitType] || chalet.unitType}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{chalet.maxGuests} pessoas</td>
                <td className="px-4 py-3 text-sm text-foreground">{formatDailyRate(chalet.basePrice)}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusStyle[chalet.status] || 'bg-muted text-foreground'}`}>
                    <span>{statusIcon[chalet.status] || '⬜'}</span>
                    <span>{statusLabel[chalet.status] || chalet.status}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground max-w-[300px]" title={chalet.notes || '-'}>
                  {truncate(chalet.notes)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(chalet)} aria-label={`Editar ${chalet.name}`}>
                      <Icon name="Pencil" size={16} />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(chalet)} aria-label={`Excluir ${chalet.name}`}>
                      <Icon name="Trash2" size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!sortedChalets.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum chalé cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChaletsTable;
