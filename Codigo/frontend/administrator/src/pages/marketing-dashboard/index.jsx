import React, { useEffect, useMemo, useState } from 'react';
import Header from '../../components/ui/Header';
import AlertNotificationCenter from '../../components/ui/AlertNotificationCenter';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import QuickActions from '../../components/ui/QuickActions';
import { listMarketingRecipients, sendMarketingCampaign } from '../../services/marketingService';
import RichTextEditor from './components/RichTextEditor';

const placeholderHelp = [
  { key: 'username', example: '{{username}}' },
  { key: 'email', example: '{{email}}' },
  { key: 'firstName', example: '{{firstName}}' },
];

const MarketingDashboard = () => {
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('<p>Olá {{username}},</p><p><br/></p><p>Temos novidades para você.</p>');
  const [mode, setMode] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [recipients, setRecipients] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedCount = selectedIds.size;

  useEffect(() => {
    if (mode !== 'selected') return;
    let mounted = true;
    setLoadingRecipients(true);
    listMarketingRecipients({ page, pageSize, search: search?.trim() || undefined })
      .then((res) => {
        if (!mounted) return;
        const data = res?.data?.data;
        setRecipients(Array.isArray(data?.items) ? data.items : []);
        setTotalPages(Number(data?.totalPages || 1));
      })
      .catch(() => {
        if (!mounted) return;
        setRecipients([]);
        setTotalPages(1);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingRecipients(false);
      });
    return () => {
      mounted = false;
    };
  }, [mode, page, pageSize, search]);

  useEffect(() => {
    setPage(1);
  }, [mode]);

  const toggleSelected = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const send = async () => {
    if (!subject.trim()) {
      alert('Informe o assunto.');
      return;
    }
    if (!html.trim()) {
      alert('Informe o conteúdo.');
      return;
    }
    if (mode === 'selected' && selectedIds.size === 0) {
      alert('Selecione ao menos 1 usuário.');
      return;
    }
    setSending(true);
    try {
      const payload = {
        subject: subject.trim(),
        html,
        mode,
        userIds: mode === 'selected' ? Array.from(selectedIds) : undefined,
      };
      const res = await sendMarketingCampaign(payload);
      const data = res?.data?.data;
      alert(`Envio finalizado. Solicitados: ${data?.requested ?? 0} • Enviados: ${data?.sent ?? 0} • Falhas: ${data?.failed ?? 0}`);
      if (mode === 'selected') {
        setSelectedIds(new Set());
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || err?.message;
      alert(`Falha ao enviar campanha: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  const recipientRows = useMemo(() => {
    return (recipients || []).map((u) => ({
      id: u?.id,
      nome: u?.nome || u?.username || '-',
      email: u?.email || '-',
      username: u?.username || '-',
    }));
  }, [recipients]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16 pb-8">
        <div className="max-w mx-auto px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Marketing</h1>
              <p className="text-muted-foreground">Criação e envio de campanhas de e-mail</p>
            </div>

            <div className="flex items-center space-x-4">
              <AlertNotificationCenter />
              <Button variant="default" iconName="Send" iconPosition="left" onClick={send} disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar campanha'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-heading font-semibold text-foreground mb-4">Editor de e-mail</h2>
                <div className="space-y-4">
                  <Input
                    label="Assunto"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Novidades do DuZé"
                  />

                  <div>
                    <div className="text-sm font-medium text-foreground mb-2">Conteúdo</div>
                    <RichTextEditor value={html} onChange={setHtml} />
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="mr-2">Interpolação:</span>
                      {placeholderHelp.map((p) => (
                        <span key={p.key} className="px-2 py-1 rounded-md bg-muted">
                          {p.example}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-4 space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-heading font-semibold text-foreground mb-4">Destinatários</h2>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="recipientMode"
                      checked={mode === 'all'}
                      onChange={() => setMode('all')}
                    />
                    Todos os usuários
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="recipientMode"
                      checked={mode === 'selected'}
                      onChange={() => setMode('selected')}
                    />
                    Usuários selecionados
                  </label>

                  {mode === 'selected' ? (
                    <div className="pt-3 space-y-3">
                      <Input
                        type="search"
                        placeholder="Buscar por username, nome ou e-mail..."
                        value={search}
                        onChange={(e) => {
                          setPage(1);
                          setSearch(e.target.value);
                        }}
                      />

                      <div className="text-xs text-muted-foreground">
                        Selecionados: {selectedCount.toLocaleString('pt-BR')}
                      </div>

                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="max-h-80 overflow-auto divide-y divide-border">
                          {loadingRecipients ? (
                            <div className="p-4 text-sm text-muted-foreground">Carregando usuários...</div>
                          ) : recipientRows.length ? (
                            recipientRows.map((row) => (
                              <div key={row.id} className="p-3">
                                <Checkbox
                                  label={
                                    <div className="flex flex-col">
                                      <span className="text-sm text-foreground">{row.nome}</span>
                                      <span className="text-xs text-muted-foreground">{row.email}</span>
                                      <span className="text-xs text-muted-foreground">{row.username}</span>
                                    </div>
                                  }
                                  checked={selectedIds.has(row.id)}
                                  onChange={(e) => toggleSelected(row.id, e?.target?.checked)}
                                />
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          iconName="ChevronLeft"
                          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                          disabled={page <= 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Página {page} de {Math.max(1, totalPages)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          iconName="ChevronRight"
                          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={page >= totalPages}
                        >
                          Próximo
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <QuickActions className="mt-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingDashboard;

