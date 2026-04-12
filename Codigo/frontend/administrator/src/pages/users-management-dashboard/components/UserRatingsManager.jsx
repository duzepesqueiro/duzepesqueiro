import React, { useEffect, useState, useMemo } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { listRatings, deleteRating } from '../../../services/ratingsService';

const TARGET_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'PRODUCT', label: 'Produto' },
  { value: 'RENTAL', label: 'Aluguel' },
  { value: 'EVENT', label: 'Evento' },
];

const UserRatingsManager = () => {
  const [filters, setFilters] = useState({ userEmail: '', targetType: '' });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listRatings({ page, size, targetType: filters.targetType || undefined, userEmail: filters.userEmail || undefined });
      const normalized = {
        content: Array.isArray(res?.content) ? res.content : [],
        totalElements: typeof res?.totalElements === 'number' ? res.totalElements : (res?.content?.length || 0),
        totalPages: typeof res?.totalPages === 'number' ? res.totalPages : 1,
      };
      setData(normalized);
    } catch (err) {
      console.error('Falha ao carregar avaliações', err);
      setError(err?.response?.data?.message || 'Erro ao carregar avaliações');
      setData({ content: [], totalElements: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, filters]);

  const onApplyFilters = () => {
    setPage(0);
    fetchData();
  };

  // Edição desativada; componente suporta apenas exclusão.

  const onDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta avaliação?')) return;
    try {
      setLoading(true);
      await deleteRating(id);
      await fetchData();
    } catch (err) {
      console.error('Falha ao excluir avaliação', err);
      alert(err?.response?.data?.message || 'Erro ao excluir avaliação');
    } finally {
      setLoading(false);
    }
  };

  const canPrev = page > 0;
  const canNext = page + 1 < (data?.totalPages || 1);

  function formatDateTime(d) {
    if (!d) return '';
    try {
      const str = typeof d === 'string' ? d : String(d);
      const iso = str.includes('T') ? str : str.replace(' ', 'T');
      const dt = new Date(iso);
      if (isNaN(dt.getTime())) return '';
      return dt.toLocaleString();
    } catch {
      return '';
    }
  }

  return (
    <div className="mt-10 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
          <Icon name="Star" className="w-5 h-5 text-accent" />
          Avaliações de Usuários
        </h2>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-card p-3 rounded-md border border-border">
        <Input
          label="E-mail do usuário"
          placeholder="filtrar por e-mail"
          value={filters.userEmail}
          onChange={(e) => setFilters((f) => ({ ...f, userEmail: e.target.value }))}
        />
        <div>
          <label className="text-sm text-muted-foreground">Tipo</label>
          <select
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
            value={filters.targetType}
            onChange={(e) => setFilters((f) => ({ ...f, targetType: e.target.value }))}
          >
            {TARGET_TYPES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={onApplyFilters} variant="primary" size="sm" disabled={loading}>
            Aplicar filtros
          </Button>
          <Button onClick={() => { setFilters({ userEmail: '', targetType: '' }); setPage(0); }} variant="ghost" size="sm" disabled={loading}>
            Limpar
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card rounded-md border border-border overflow-hidden">
        <div className="grid grid-cols-12 bg-muted/40 text-xs font-medium text-muted-foreground px-3 py-2">
          <div className="col-span-3">Usuário</div>
          <div className="col-span-2">Tipo</div>
          <div className="col-span-1">Alvo</div>
          <div className="col-span-2">Avaliação</div>
          <div className="col-span-3">Comentário</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        {loading && (
          <div className="p-4 text-sm text-muted-foreground">Carregando avaliações...</div>
        )}

        {!loading && data.content.map((r) => (
          <div key={r.id} className="grid grid-cols-12 px-3 py-2 border-t border-border text-sm">
            <div className="col-span-3">
              <div className="font-medium text-foreground">{r.userName || '—'}</div>
              <div className="text-muted-foreground">{r.userEmail || '—'}</div>
              <div className="text-muted-foreground">{formatDateTime(r.createdAt) || '—'}</div>
            </div>
            <div className="col-span-2">{r.targetType || '—'}</div>
            <div className="col-span-1">{r.targetId ?? '—'}</div>
            <div className="col-span-2">
              <span>{r.rating ?? '—'}</span>
            </div>
            <div className="col-span-3">
              <span className="text-muted-foreground">{r.comment || '—'}</span>
            </div>
            <div className="col-span-1 text-right">
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" disabled>Editar</Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(r.id)} disabled={loading}>Excluir</Button>
              </div>
            </div>
          </div>
        ))}

        {!loading && data.content.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">Nenhuma avaliação encontrada.</div>
        )}

        {/* Paginação */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Página {page + 1} de {Math.max(1, data.totalPages || 1)} — {data.totalElements} resultados
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!canPrev}>Anterior</Button>
            <Button size="sm" onClick={() => setPage((p) => (canNext ? p + 1 : p))} disabled={!canNext}>Próxima</Button>
            <select
              className="rounded-md border border-border bg-background p-1 text-sm"
              value={String(size)}
              onChange={(e) => setSize(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
         </div>
       </div>
     </div>
     {error && <div className="text-sm text-destructive">{error}</div>}
   </div>
 );
};

export default UserRatingsManager;
