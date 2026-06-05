import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import ExportControlPanel from '../../components/ui/ExportControlPanel';
import { exportAdminData } from '../../utils/exportService';
import Icon from '../../components/AppIcon';
import QuickActions from '../../components/ui/QuickActions';
import UsersKPICards from './components/UsersKPICards';
import UsersNewUsersChart from './components/UsersNewUsersChart';
import UserRatingsManager from './components/UserRatingsManager';
import { listUsers, createUser, createAdminUser, createAdminUserWithPassword, updateUser, deleteUser, getUsersKpis, resetAdminPassword } from '../../services/usersService';

const UsersManagementDashboard = () => {
  // Removido CustomerAnalytics e dados associados

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showNewAdminModal, setShowNewAdminModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [userToView, setUserToView] = useState(null);
  const [isSavingNewUser, setIsSavingNewUser] = useState(false);
  const [isSavingNewAdmin, setIsSavingNewAdmin] = useState(false);
  // Ordenação e filtros na tabela
  const [sortField, setSortField] = useState(null); // 'nome' | 'email' | 'papel' | 'status'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  // Indicador de atualização
  const [lastUpdated, setLastUpdated] = useState(null);
  // Filtros aplicados
  const [filterStatus, setFilterStatus] = useState(null); // 'ativo' | 'inativo' | null
  const [filterRole, setFilterRole] = useState(null); // 'admin' | 'usuario' | null
  const [filterQuery, setFilterQuery] = useState(''); // nome ou email
  // Entradas dos controles (aplicadas somente ao clicar em Aplicar)
  const [statusInput, setStatusInput] = useState(''); // 'Ativo' | 'Inativo' | ''
  const [roleInput, setRoleInput] = useState(''); // 'Administrador' | 'Usuário' | ''
  const [queryInput, setQueryInput] = useState('');
  const [newUserForm, setNewUserForm] = useState({
    nome: '',
    email: '',
    senha: '',
    telefone: '',
    dataNascimento: '',
    ativo: true,
    emailConfirmado: false,
  });
  const [newAdminForm, setNewAdminForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    ativo: true,
    emailConfirmado: false,
    isAdmin: true,
    senha: '',
  });

  // KPIs de usuários (dinâmicos do backend)
  const [usersKpi, setUsersKpi] = useState(null);
  const [kpiPeriodDays, setKpiPeriodDays] = useState(30);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const displayUsers = useMemo(() => {
    let data = Array.isArray(users) ? [...users] : [];

    // Aplicar filtros (somente os estados "aplicados")
    if (filterStatus) {
      data = data.filter(u => (filterStatus === 'ativo') ? !!u?.ativo : !u?.ativo);
    }
    if (filterRole) {
      data = data.filter(u => {
        const isAdmin = (u?.isAdmin || u?.admin) ? true : false;
        return filterRole === 'admin' ? isAdmin : !isAdmin;
      });
    }
    if (filterQuery && filterQuery.trim() !== '') {
      const q = filterQuery.trim().toLowerCase();
      data = data.filter(u => {
        const nome = (u?.nome || '').toString().toLowerCase();
        const email = (u?.email || '').toString().toLowerCase();
        return nome.includes(q) || email.includes(q);
      });
    }

    // Ordenação por nome, email, papel, status
    if (sortField) {
      data.sort((a, b) => {
        let av = '';
        let bv = '';
        switch (sortField) {
          case 'nome':
            av = (a?.nome || '').toString().toLowerCase();
            bv = (b?.nome || '').toString().toLowerCase();
            break;
          case 'email':
            av = (a?.email || '').toString().toLowerCase();
            bv = (b?.email || '').toString().toLowerCase();
            break;
          case 'papel': {
            const aIsAdmin = (a?.isAdmin ?? a?.admin) ? true : false;
            const bIsAdmin = (b?.isAdmin ?? b?.admin) ? true : false;
            av = aIsAdmin ? 'administrador' : 'usuario';
            bv = bIsAdmin ? 'administrador' : 'usuario';
            break;
          }
          case 'status':
            av = !!a?.ativo ? 'ativo' : 'inativo';
            bv = !!b?.ativo ? 'ativo' : 'inativo';
            break;
          default:
            av = '';
            bv = '';
        }
        const cmp = av.localeCompare(bv);
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return data;
  }, [users, sortField, sortDirection, filterStatus, filterRole, filterQuery]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return displayUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [displayUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(displayUsers.length / itemsPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterRole, filterQuery]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Falha ao listar usuários', err);
      setError('Não foi possível carregar usuários');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsersKpis = async () => {
    try {
      const metrics = await getUsersKpis({ periodoDias: kpiPeriodDays });
      setUsersKpi(metrics);
    } catch (err) {
      console.error('Falha ao carregar KPIs de usuários', err);
      // Mantém KPIs anteriores se houver; sem alertas intrusivos
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUsersKpis();
  }, []);

  const handleExport = async (format) => {
    try {
      await exportAdminData('users', format);
    } catch (err) {
      console.error('Falha ao exportar usuários:', err);
      alert('Falha ao exportar. Verifique o servidor.');
    }
  };

  const handleSaveNewUser = async () => {
    if (isSavingNewUser) return;
    try {
      setIsSavingNewUser(true);
      if (!newUserForm.senha || newUserForm.senha.trim() === '') {
        alert('Informe a senha do novo usuário.');
        return;
      }
      await createUser({ ...newUserForm });
      setShowNewUserModal(false);
      setNewUserForm({ nome: '', email: '', senha: '', telefone: '', dataNascimento: '', ativo: true, emailConfirmado: false });
      fetchUsers();
    } catch (err) {
      console.error('Erro ao criar usuário', err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || '';
      if (status === 409 || /email/i.test(msg)) {
        alert('E-mail já cadastrado. Por favor, use outro e-mail.');
      } else {
        alert('Erro ao criar usuário');
      }
    } finally {
      setIsSavingNewUser(false);
    }
  };

  const handleSaveNewAdmin = async () => {
    if (isSavingNewAdmin) return;
    try {
      setIsSavingNewAdmin(true);
      if (!newAdminForm.senha || newAdminForm.senha.trim() === '') {
        alert('Informe a senha do novo administrador.');
        return;
      }
      await createAdminUserWithPassword({ ...newAdminForm });
      setShowNewAdminModal(false);
      setNewAdminForm({ nome: '', email: '', telefone: '', dataNascimento: '', ativo: true, emailConfirmado: false, isAdmin: true, senha: '' });
      fetchUsers();
    } catch (err) {
      console.error('Erro ao criar admin', err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || '';
      if (status === 409 || /email/i.test(msg)) {
        alert('E-mail já cadastrado. Por favor, use outro e-mail.');
      } else {
        alert('Erro ao criar admin');
      }
    } finally {
      setIsSavingNewAdmin(false);
    }
  };

  const handleRefreshPage = () => {
    // Recarrega a página inteira para reinicializar estados e dados
    window.location.reload();
  };

  const handleEditClick = (u) => {
    setUserToEdit({
      id: u?.id,
      nome: u?.nome || '',
      email: u?.email || '',
      ativo: !!u?.ativo,
      isAdmin: !!(u?.isAdmin || u?.admin),
      admin: !!(u?.isAdmin || u?.admin),
    });
    setShowEditModal(true);
  };

  const handleToggleActive = async (u, nextActive) => {
    try {
      const updated = { ...u, ativo: !!nextActive };
      await updateUser(u.id, updated);
      fetchUsers();
    } catch (err) {
      console.error('Erro ao atualizar status do usuário', err);
      alert('Não foi possível atualizar o status. Tente novamente.');
    }
  };

  const handleViewClick = (u) => {
    setUserToView(u);
    setShowViewModal(true);
  };

  const handleDeleteClick = async (u) => {
    if (!window.confirm(`Excluir usuário ${u?.nome} (${u?.email})?`)) return;
    try {
      await deleteUser(u.id);
      fetchUsers();
    } catch (err) {
      console.error('Erro ao excluir usuário', err);
      alert('Erro ao excluir usuário');
    }
  };

  const handleResetAdminPassword = async (u) => {
    const isAdmin = !!(u?.isAdmin || u?.admin);
    if (!isAdmin) return;
    const email = (u?.email || '').trim().toLowerCase();
    if (!email) {
      alert('Usuário sem e-mail válido.');
      return;
    }
    const ok = window.confirm(`Redefinir a senha do administrador ${u?.nome || ''} (${email})?\nUma nova senha será gerada e enviada por e-mail.`);
    if (!ok) return;
    try {
      await resetAdminPassword(email);
      alert('Nova senha gerada e enviada por e-mail.');
    } catch (err) {
      console.error('Falha ao redefinir senha do admin', err);
      const msg = err?.response?.data || err?.message || 'Erro ao redefinir senha';
      alert(String(msg));
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateUser(userToEdit.id, userToEdit);
      setShowEditModal(false);
      setUserToEdit(null);
      fetchUsers();
    } catch (err) {
      console.error('Erro ao atualizar usuário', err);
      alert('Erro ao atualizar usuário');
    }
  };

  const applyFilters = () => {
    // Converter entradas visuais em estados aplicados
    const status = statusInput === 'Ativo' ? 'ativo' : (statusInput === 'Inativo' ? 'inativo' : null);
    const role = roleInput === 'Administrador' ? 'admin' : (roleInput === 'Usuário' ? 'usuario' : null);
    const query = (queryInput || '').trim().toLowerCase();
    setFilterStatus(status);
    setFilterRole(role);
    setFilterQuery(query);
  };

  const clearFilters = () => {
    setStatusInput('');
    setRoleInput('');
    setQueryInput('');
    setFilterStatus(null);
    setFilterRole(null);
    setFilterQuery('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Painel de Usuários | Administração</title>
        <meta
          name="description"
          content="Gerenciamento de usuários, papéis e permissões na administração."
        />
      </Helmet>

      {/* Top Navigation */}
      <Header />

      {/* Page Content */}
      <div className="pt-16 pb-8">
        <div className="max-w mx-auto px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Usuários</h1>
            <p className="text-muted-foreground">Gerencie contas, papéis e permissões dos usuários.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" iconName="RefreshCw" onClick={handleRefreshPage}>Atualizar Lista</Button>
            <Button variant="outline" iconName="Database">Backup</Button>
            <ExportControlPanel
              onExport={handleExport}
              availableFormats={['excel','csv']}
              title="Exportar Relatório de Usuários"
            />
          </div>
        </div>

        {/* KPI Cards */}
        <UsersKPICards className="mb-6" metrics={usersKpi || {}} />

        {/* New Users Chart */}
        <UsersNewUsersChart className="mb-6" users={users} />

        {/* Customer Analytics removido desta tela */}

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column: Tabela principal */}
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Tabela de Usuários</h3>
                <div className="flex gap-2">
                  <Button variant="default" size="sm" iconName="UserPlus" onClick={() => setShowNewUserModal(true)}>Novo Usuário</Button>
                  <Button variant="outline" size="sm" className="border border-border" iconName="ShieldCheck" onClick={() => setShowNewAdminModal(true)}>Novo Admin</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span>Nome</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            iconName={'ChevronsUpDown'}
                            aria-label="Ordenar por nome"
                            onClick={() => {
                              if (sortField === 'nome') {
                                setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
                              } else {
                                setSortField('nome');
                                setSortDirection('asc');
                              }
                            }}
                          />
                        </div>
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span>E-mail</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            iconName={'ChevronsUpDown'}
                            aria-label="Ordenar por e-mail"
                            onClick={() => {
                              if (sortField === 'email') {
                                setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
                              } else {
                                setSortField('email');
                                setSortDirection('asc');
                              }
                            }}
                          />
                        </div>
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">Telefone</th>
                      <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span>Papel</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            iconName={'ChevronsUpDown'}
                            aria-label="Ordenar por papel"
                            onClick={() => {
                              if (sortField === 'papel') {
                                setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
                              } else {
                                setSortField('papel');
                                setSortDirection('asc');
                              }
                            }}
                          />
                        </div>
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span>Status</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            iconName={'ChevronsUpDown'}
                            aria-label="Ordenar por status"
                            onClick={() => {
                              if (sortField === 'status') {
                                setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
                              } else {
                                setSortField('status');
                                setSortDirection('asc');
                              }
                            }}
                          />
                        </div>
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">Último Acesso</th>
                      <th className="text-left text-sm font-medium text-muted-foreground p-3 border-b border-border">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td className="p-3 text-sm text-muted-foreground" colSpan={7}>Carregando usuários...</td>
                      </tr>
                    )}
                    {!isLoading && users?.length === 0 && (
                      <tr>
                        <td className="p-3 text-sm text-muted-foreground" colSpan={7}>Nenhum usuário encontrado.</td>
                      </tr>
                    )}
                    {!isLoading && paginatedUsers?.map((u) => (
                      <tr key={u.id} className="border-b border-border hover:bg-muted/40">
                        <td className="p-3 text-sm text-foreground">{u?.nome || '—'}</td>
                        <td className="p-3 text-sm text-muted-foreground">{u?.email || '—'}</td>
                        <td className="p-3 text-sm text-muted-foreground">{u?.telefone || '—'}</td>
                        <td className="p-3 text-sm text-muted-foreground">{(u?.isAdmin || u?.admin) ? 'Administrador' : 'Usuário'}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          <Checkbox
                            label={u?.ativo ? 'Ativo' : 'Inativo'}
                            checked={!!u?.ativo}
                            onChange={(e) => handleToggleActive(u, e.target.checked)}
                          />
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{formatDateTime(u?.ultimoLogin) || '—'}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" iconName="Eye" aria-label="Ver" onClick={() => handleViewClick(u)} />
                            <Button variant="ghost" size="icon" iconName="Pencil" aria-label="Editar" onClick={() => handleEditClick(u)} />
                            <Button variant="ghost" size="icon" iconName="Trash2" className="text-destructive" aria-label="Remover" onClick={() => handleDeleteClick(u)} />
                            {(u?.isAdmin || u?.admin) && (
                              <Button variant="ghost" size="icon" iconName="Key" aria-label="Redefinir senha" onClick={() => handleResetAdminPassword(u)} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="px-6 pb-6 pt-4 flex items-center justify-between border-t border-border mt-4">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {Math.max(1, totalPages)}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="ChevronLeft"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="ChevronRight"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Filtros + Resumo */}
          <div className="space-y-6 xl:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Filtros</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Status</label>
                    <select
                      className="w-full rounded-md border border-border bg-background p-2 text-sm"
                      value={statusInput}
                      onChange={(e) => setStatusInput(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Papel</label>
                    <select
                      className="w-full rounded-md border border-border bg-background p-2 text-sm"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      <option value="Administrador">Administrador</option>
                      <option value="Usuário">Usuário</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <input
                    type="search"
                    placeholder="Buscar por nome ou e-mail"
                    className="w-full rounded-md border border-border bg-background p-2 text-sm"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                  />
                  <div className="flex items-center gap-3">
                    <Button variant="outline" iconName="Filter" onClick={applyFilters}>Aplicar</Button>
                    <Button variant="ghost" iconName="RotateCcw" onClick={clearFilters}>Limpar</Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Resumo</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon name="Clock" size={14} />
                  <span>
                    {lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString()}` : '—'}
                  </span>
                </div>
              </div>
              {(() => {
                const total = users?.length || 0;
                const ativos = users?.filter(u => u?.ativo)?.length || 0;
                const inativos = total - ativos;
                const admins = users?.filter(u => (u?.isAdmin || u?.admin))?.length || 0;
                const pctAtivo = total ? Math.round((ativos / total) * 100) : 0;
                const pctInativo = total ? Math.round((inativos / total) * 100) : 0;
                const pctAdmin = total ? Math.round((admins / total) * 100) : 0;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Total */}
                    <div className="p-4 border border-border rounded-md">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                          <Icon name="Users" size={18} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-xl font-heading font-bold text-foreground">{total}</p>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded">
                        <div className="h-1.5 bg-primary rounded" style={{ width: `${total ? 100 : 0}%` }} />
                      </div>
                    </div>
                    {/* Ativos */}
                    <div className="p-4 border border-border rounded-md">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                          <Icon name="CheckCircle" size={18} className="text-success" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Ativos</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-xl font-heading font-bold text-foreground">{ativos}</p>
                            <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success">{pctAtivo}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded">
                        <div className="h-1.5 bg-success rounded" style={{ width: `${pctAtivo}%` }} />
                      </div>
                    </div>
                    {/* Inativos */}
                    <div className="p-4 border border-border rounded-md">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                          <Icon name="XCircle" size={18} className="text-destructive" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Inativos</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-xl font-heading font-bold text-foreground">{inativos}</p>
                            <span className="text-xs px-2 py-0.5 rounded bg-destructive/10 text-destructive">{pctInativo}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded">
                        <div className="h-1.5 bg-destructive rounded" style={{ width: `${pctInativo}%` }} />
                      </div>
                    </div>
                    {/* Admins */}
                    <div className="p-4 border border-border rounded-md">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                          <Icon name="Shield" size={18} className="text-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Admins</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-xl font-heading font-bold text-foreground">{admins}</p>
                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{pctAdmin}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded">
                        <div className="h-1.5 bg-primary rounded" style={{ width: `${pctAdmin}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Gestão de Avaliações dos Usuários */}
        <UserRatingsManager />

        {/* Quick Actions (full-width) */}
        <QuickActions className="mt-6" />

        {showNewUserModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Cadastrar Novo Usuário</h3>
              <div className="space-y-4">
                <Input label="Nome" value={newUserForm.nome} onChange={(e) => setNewUserForm(prev => ({ ...prev, nome: e.target.value }))} required />
                <Input type="email" label="E-mail" value={newUserForm.email} onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))} required />
                <Input type="password" label="Senha" value={newUserForm.senha} onChange={(e) => setNewUserForm(prev => ({ ...prev, senha: e.target.value }))} required />
                <Input label="Telefone" value={newUserForm.telefone} onChange={(e) => setNewUserForm(prev => ({ ...prev, telefone: e.target.value }))} />
                <Input type="date" label="Data de Nascimento" value={newUserForm.dataNascimento} onChange={(e) => setNewUserForm(prev => ({ ...prev, dataNascimento: e.target.value }))} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Checkbox label="Ativo" checked={newUserForm.ativo} onChange={(e) => setNewUserForm(prev => ({ ...prev, ativo: e.target.checked }))} />
                  <Checkbox label="E-mail confirmado" checked={newUserForm.emailConfirmado} onChange={(e) => setNewUserForm(prev => ({ ...prev, emailConfirmado: e.target.checked }))} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setShowNewUserModal(false)} disabled={isSavingNewUser}>Cancelar</Button>
                  <Button variant="default" iconName={isSavingNewUser ? "Loader2" : "Save"} onClick={handleSaveNewUser} disabled={isSavingNewUser}>
                    {isSavingNewUser ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showViewModal && userToView && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-foreground mb-4">Detalhes do Usuário</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Nome:</span> {userToView?.nome}</p>
                <p><span className="text-muted-foreground">E-mail:</span> {userToView?.email}</p>
                <p><span className="text-muted-foreground">Telefone:</span> {userToView?.telefone || '—'}</p>
                <p><span className="text-muted-foreground">Papel:</span> {userToView?.isAdmin ? 'Administrador' : 'Usuário'}</p>
                <p><span className="text-muted-foreground">Status:</span> {userToView?.ativo ? 'Ativo' : 'Inativo'}</p>
                <p><span className="text-muted-foreground">E-mail confirmado:</span> {userToView?.emailConfirmado ? 'Sim' : 'Não'}</p>
                <p><span className="text-muted-foreground">Criado em:</span> {formatDateTime(userToView?.createdAt)}</p>
                <p><span className="text-muted-foreground">Último login:</span> {formatDateTime(userToView?.ultimoLogin) || '—'}</p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="default" onClick={() => setShowViewModal(false)}>Fechar</Button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && userToEdit && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Editar Usuário</h3>
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Nome:</span> {userToEdit?.nome || '—'}</p>
                  <p><span className="text-muted-foreground">E-mail:</span> {userToEdit?.email || '—'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Checkbox label="Ativo" checked={!!userToEdit.ativo} onChange={(e) => setUserToEdit(prev => ({ ...prev, ativo: e.target.checked }))} />
                  <Checkbox label="Admin" checked={!!userToEdit.isAdmin} onChange={(e) => setUserToEdit(prev => ({ ...prev, isAdmin: e.target.checked, admin: e.target.checked }))} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => { setShowEditModal(false); setUserToEdit(null); }}>Cancelar</Button>
                  <Button variant="default" iconName="Save" onClick={handleSaveEdit}>Salvar</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showNewAdminModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Cadastrar Novo Admin</h3>
              <div className="space-y-4">
                <Input label="Nome" value={newAdminForm.nome} onChange={(e) => setNewAdminForm(prev => ({ ...prev, nome: e.target.value }))} required />
                <Input type="email" label="E-mail" value={newAdminForm.email} onChange={(e) => setNewAdminForm(prev => ({ ...prev, email: e.target.value }))} required />
                <Input type="password" label="Senha" value={newAdminForm.senha} onChange={(e) => setNewAdminForm(prev => ({ ...prev, senha: e.target.value }))} required />
                <Input label="Telefone" value={newAdminForm.telefone} onChange={(e) => setNewAdminForm(prev => ({ ...prev, telefone: e.target.value }))} />
                <Input type="date" label="Data de Nascimento" value={newAdminForm.dataNascimento} onChange={(e) => setNewAdminForm(prev => ({ ...prev, dataNascimento: e.target.value }))} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Checkbox label="Ativo" checked={newAdminForm.ativo} onChange={(e) => setNewAdminForm(prev => ({ ...prev, ativo: e.target.checked }))} />
                  <Checkbox label="E-mail confirmado" checked={newAdminForm.emailConfirmado} onChange={(e) => setNewAdminForm(prev => ({ ...prev, emailConfirmado: e.target.checked }))} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setShowNewAdminModal(false)} disabled={isSavingNewAdmin}>Cancelar</Button>
                  <Button variant="default" iconName={isSavingNewAdmin ? "Loader2" : "Save"} onClick={handleSaveNewAdmin} disabled={isSavingNewAdmin}>
                    {isSavingNewAdmin ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default UsersManagementDashboard;

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
