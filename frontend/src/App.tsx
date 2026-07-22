import { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldAlert, 
  CheckCircle, 
  Search, 
  Plus, 
  Lock, 
  Unlock, 
  Copy, 
  Trash2, 
  Edit3, 
  LogOut, 
  Key, 
  Check, 
  Building,
  DollarSign,
  AlertCircle,
  Clock,
  Calendar
} from 'lucide-react';

interface License {
  id: string;
  license_key: string;
  client_name: string;
  domain: string | null;
  active: boolean;
  message: string | null;
  support_contact: string | null;
  created_at: string;
  expires_at?: string | null;
  scheduled_block_at?: string | null;
  scheduled_unblock_at?: string | null;
  plan_start_date?: string | null;
  billing_cycle_days?: number;
}

export function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('central_admin_token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingLicenses, setFetchingLicenses] = useState(true);
  const [error, setError] = useState('');
  const [licenses, setLicenses] = useState<License[]>([]);
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estados dos Modais e Abas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'info' | 'license' | 'schedule'>('info');
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  
  // Campos do Formulário
  const [formClientName, setFormClientName] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [formLicenseKey, setFormLicenseKey] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formSupportContact, setFormSupportContact] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formScheduledBlockAt, setFormScheduledBlockAt] = useState('');
  const [formScheduledUnblockAt, setFormScheduledUnblockAt] = useState('');
  const [formPlanStartDate, setFormPlanStartDate] = useState('');
  const [formBillingCycleDays, setFormBillingCycleDays] = useState(30);

  const apiUrl = import.meta.env.VITE_CENTRAL_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (token) {
      fetchLicenses();
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/licenses/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Credenciais inválidas.');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('central_admin_token', data.token);
        setToken(data.token);
      } else {
        throw new Error('Falha ao autenticar.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('central_admin_token');
    setToken(null);
    setLicenses([]);
  };

  const fetchLicenses = async () => {
    setFetchingLicenses(true);
    try {
      const response = await fetch(`${apiUrl}/api/licenses/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-admin-client': 'central-admin'
        }
      });

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      if (!response.ok) throw new Error('Falha ao buscar licenças.');
      const data = await response.json();
      setLicenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingLicenses(false);
    }
  };

  const toInputDateTime = (isoStr?: string | null) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'LIC-';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormLicenseKey(result);
  };

  const openCreateModal = () => {
    setEditingLicense(null);
    setFormClientName('');
    setFormDomain('');
    setFormLicenseKey('');
    setFormMessage('Plataforma suspensa por pendências financeiras. Entre em contato com o suporte para reativação.');
    setFormSupportContact('');
    setFormActive(true);
    setFormExpiresAt('');
    setFormScheduledBlockAt('');
    setFormScheduledUnblockAt('');
    setFormPlanStartDate('');
    setFormBillingCycleDays(30);
    setModalTab('info');
    setIsModalOpen(true);
    generateRandomKey();
  };

  const openEditModal = (license: License) => {
    setEditingLicense(license);
    setFormClientName(license.client_name);
    setFormDomain(license.domain || '');
    setFormLicenseKey(license.license_key);
    setFormMessage(license.message || '');
    setFormSupportContact(license.support_contact || '');
    setFormActive(license.active);
    setFormExpiresAt(toInputDateTime(license.expires_at));
    setFormScheduledBlockAt(toInputDateTime(license.scheduled_block_at));
    setFormScheduledUnblockAt(toInputDateTime(license.scheduled_unblock_at));
    setFormPlanStartDate(toInputDateTime(license.plan_start_date));
    setFormBillingCycleDays(license.billing_cycle_days || 30);
    setModalTab('info');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      licenseKey: formLicenseKey,
      clientName: formClientName,
      domain: formDomain || null,
      active: formActive,
      message: formMessage || null,
      supportContact: formSupportContact || null,
      expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      scheduled_block_at: formScheduledBlockAt ? new Date(formScheduledBlockAt).toISOString() : null,
      scheduled_unblock_at: formScheduledUnblockAt ? new Date(formScheduledUnblockAt).toISOString() : null,
      plan_start_date: formPlanStartDate ? new Date(formPlanStartDate).toISOString() : null,
      billing_cycle_days: Number(formBillingCycleDays || 30)
    };

    // Item Otimista (feedback visual instantâneo)
    const tempId = editingLicense ? editingLicense.id : 'temp-' + Date.now();
    const optimisticItem: License = {
      id: tempId,
      license_key: formLicenseKey,
      client_name: formClientName,
      domain: formDomain || null,
      active: formActive,
      message: formMessage || null,
      support_contact: formSupportContact || null,
      created_at: editingLicense ? editingLicense.created_at : new Date().toISOString(),
      expires_at: payload.expires_at,
      scheduled_block_at: payload.scheduled_block_at,
      scheduled_unblock_at: payload.scheduled_unblock_at,
      plan_start_date: payload.plan_start_date,
      billing_cycle_days: payload.billing_cycle_days
    };

    // ⚡ Fecha o modal INSTANTANEAMENTE (0ms)
    setIsModalOpen(false);

    // ⚡ Atualiza a tabela INSTANTANEAMENTE no frontend
    if (editingLicense) {
      setLicenses(prev => prev.map(l => l.id === editingLicense.id ? optimisticItem : l));
    } else {
      setLicenses(prev => [optimisticItem, ...prev]);
    }

    try {
      let response;
      if (editingLicense) {
        response = await fetch(`${apiUrl}/api/licenses/admin/${editingLicense.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${apiUrl}/api/licenses/admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        fetchLicenses();
        const errData = await response.json();
        alert(errData.error || 'Erro ao salvar licença no servidor.');
      } else {
        const savedData = await response.json();
        setLicenses(prev => prev.map(l => l.id === tempId ? (savedData.id ? savedData : l) : l));
      }
    } catch (err: any) {
      fetchLicenses();
      console.error(err);
      alert('Erro de conexão ao salvar licença.');
    } finally {
      setLoading(false);
    }
  };

  const safeJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const handleRenewLicense = async (id: string) => {
    // Optimistic UI: ativa a licença imediatamente na tabela
    setLicenses(prev => prev.map(l => l.id === id ? { ...l, active: true } : l));

    try {
      const response = await fetch(`${apiUrl}/api/licenses/admin/${id}/renew`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        alert('Sua sessão expirou. Faça login novamente.');
        handleLogout();
        return;
      }

      if (response.ok) {
        const data = await safeJson(response);
        if (data) {
          setLicenses(prev => prev.map(l => l.id === id ? data : l));
        } else {
          fetchLicenses();
        }
      } else {
        const errData = await safeJson(response);
        alert(errData?.error || 'Erro ao renovar plano do cliente no servidor.');
        fetchLicenses();
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao renovar plano.');
      fetchLicenses();
    }
  };

  const toggleLicenseActive = async (license: License) => {
    const newActiveState = !license.active;
    // Optimistic UI update
    setLicenses(prev => prev.map(l => l.id === license.id ? { ...l, active: newActiveState } : l));

    try {
      const response = await fetch(`${apiUrl}/api/licenses/admin/${license.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          active: newActiveState
        })
      });

      if (response.status === 401 || response.status === 403) {
        alert('Sua sessão expirou. Faça login novamente.');
        handleLogout();
        return;
      }

      if (!response.ok) {
        // Revert on server error
        setLicenses(prev => prev.map(l => l.id === license.id ? { ...l, active: license.active } : l));
        const errData = await safeJson(response);
        alert(errData?.error || 'Erro ao alterar status da licença.');
      }
    } catch (err) {
      // Revert on network error
      setLicenses(prev => prev.map(l => l.id === license.id ? { ...l, active: license.active } : l));
      console.error(err);
      alert('Erro de conexão ao alterar status da licença.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover esta licença? O catálogo do cliente perderá acesso.')) return;
    try {
      const response = await fetch(`${apiUrl}/api/licenses/admin/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchLicenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtro de Busca
  const filteredLicenses = licenses.filter(lic => 
    lic.client_name.toLowerCase().includes(search.toLowerCase()) ||
    lic.license_key.toLowerCase().includes(search.toLowerCase()) ||
    (lic.domain && lic.domain.toLowerCase().includes(search.toLowerCase()))
  );

  // Métricas
  const totalClients = licenses.length;
  const activeClients = licenses.filter(l => l.active).length;
  const blockedClients = licenses.filter(l => !l.active).length;
  const estimatedRevenue = activeClients * 299.90; // Exemplo de ticket recorrente

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans select-none relative">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.04),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.04),transparent_50%)]" />

        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative z-10">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/20">
              <Key className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-slate-800">Central de Gerenciamento</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Painel Geral de Licenciamento</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-600 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">E-mail Master</label>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@seusite.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Senha Master</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-500 py-4 rounded-2xl font-bold text-white hover:opacity-95 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Autenticando...' : 'Acessar Central'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col font-sans">
      
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-md">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-slate-800 tracking-wider uppercase text-sm">Central de Gerenciamento</span>
            <span className="text-[10px] text-slate-400 ml-2 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Master</span>
          </div>
        </div>

        <button 
          onClick={handleLogout} 
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Metric Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-100 flex items-center justify-center text-slate-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Clientes</p>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">{totalClients}</h2>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Ativos</p>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">{activeClients}</h2>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Bloqueados</p>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">{blockedClients}</h2>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/30 flex items-center justify-center text-indigo-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Recorrente Est.</p>
              <h2 className="text-xl md:text-2xl font-black text-indigo-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedRevenue)}
              </h2>
            </div>
          </div>
        </section>

        {/* Client Management Panel */}
        <section className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 space-y-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Gerenciamento de Empresas</h3>
              <p className="text-xs text-slate-400 mt-1">Monitore, ative e suspenda o acesso dos catálogos cadastrados.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar empresa ou chave..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors w-full sm:w-60"
                />
              </div>

              {/* Add Client Button */}
              <button
                onClick={openCreateModal}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-2.5 rounded-2xl text-xs font-bold text-white hover:opacity-95 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Novo Cliente
              </button>
            </div>
          </div>

          {/* Licenses Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  <th className="p-4">Cliente / Loja</th>
                  <th className="p-4">Chave de Licença</th>
                  <th className="p-4">Domínio Cadastrado</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fetchingLicenses ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4">
                        <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-slate-100 rounded w-24"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-6 bg-slate-200 rounded-lg w-36"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-slate-100 rounded w-28"></div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="h-6 bg-slate-200 rounded-full w-20 mx-auto"></div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="h-8 bg-slate-100 rounded-lg w-16 ml-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredLicenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                      <Building className="w-12 h-12 mx-auto mb-3 opacity-25" />
                      Nenhum cliente cadastrado ou encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLicenses.map(lic => (
                    <tr key={lic.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-sm">{lic.client_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 mb-1">Criado em {new Date(lic.created_at).toLocaleDateString('pt-BR')}</p>
                        <div className="flex flex-wrap gap-1">
                          {lic.expires_at && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200" title="Validade / Expiração">
                              <Calendar className="w-2.5 h-2.5" /> Expira: {new Date(lic.expires_at).toLocaleString('pt-BR')}
                            </span>
                          )}
                          {lic.scheduled_block_at && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-200" title="Bloqueio Agendado">
                              <Clock className="w-2.5 h-2.5" /> Bloqueio: {new Date(lic.scheduled_block_at).toLocaleString('pt-BR')}
                            </span>
                          )}
                          {lic.scheduled_unblock_at && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-200" title="Desbloqueio Agendado">
                              <Clock className="w-2.5 h-2.5" /> Desbloqueio: {new Date(lic.scheduled_unblock_at).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="bg-slate-100 text-indigo-600 px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-[11px] font-bold">
                            {lic.license_key}
                          </code>
                          <button 
                            onClick={() => copyKey(lic.license_key)} 
                            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Copiar Chave"
                          >
                            {copiedKey === lic.license_key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 font-mono">
                        {lic.domain || <span className="text-slate-300 font-sans italic">Não cadastrado</span>}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleLicenseActive(lic)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                            lic.active 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100/50' 
                              : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100/50'
                          }`}
                        >
                          {lic.active ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {lic.active ? 'Ativo' : 'Bloqueado'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRenewLicense(lic.id)}
                            className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="Renovar Plano por +30 Dias"
                          >
                            <Clock className="w-3 h-3 text-emerald-600" />
                            +30d
                          </button>
                          <button
                            onClick={() => openEditModal(lic)}
                            className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-lg hover:text-slate-800 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lic.id)}
                            className="p-2 bg-red-50 border border-red-100 hover:bg-red-100 hover:text-red-700 text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modal Criar/Editar com Abas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{editingLicense ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <p className="text-xs text-slate-400 mt-1">Configure o controle de acesso e agendamentos.</p>
            </div>

            {/* Navegação por Abas do Modal */}
            <div className="flex border-b border-slate-100 gap-1 pb-1">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'info' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                🏢 1. Dados da Loja
              </button>
              <button
                type="button"
                onClick={() => setModalTab('license')}
                className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'license' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                🔑 2. Licença & Status
              </button>
              <button
                type="button"
                onClick={() => setModalTab('schedule')}
                className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'schedule' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                ⏰ 3. Agendamento
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Aba 1: Dados da Loja */}
              {modalTab === 'info' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Nome da Loja / Empresa *</label>
                    <input
                      type="text"
                      required
                      value={formClientName}
                      onChange={e => setFormClientName(e.target.value)}
                      placeholder="Ex: Boutique da Moda"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Domínio / Subdomínio (Opcional)</label>
                    <input
                      type="text"
                      value={formDomain}
                      onChange={e => setFormDomain(e.target.value)}
                      placeholder="Ex: boutiquedamoda.com.br"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Aba 2: Licença & Status */}
              {modalTab === 'license' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Chave de Licença (.env)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={formLicenseKey}
                        onChange={e => setFormLicenseKey(e.target.value)}
                        placeholder="LIC-..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={generateRandomKey}
                        className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-xs font-bold text-slate-600 px-4 py-3 rounded-2xl transition-colors cursor-pointer"
                      >
                        Gerar
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border border-slate-100 p-3 rounded-2xl bg-slate-50">
                    <span className="text-xs font-bold text-slate-700">Status Inicial da Plataforma</span>
                    <button
                      type="button"
                      onClick={() => setFormActive(!formActive)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                        formActive 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                          : 'bg-red-50 border-red-200 text-red-600'
                      }`}
                    >
                      {formActive ? 'Liberado' : 'Suspenso'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Link do WhatsApp Suporte (Ex: clique no aviso)</label>
                    <input
                      type="url"
                      value={formSupportContact}
                      onChange={e => setFormSupportContact(e.target.value)}
                      placeholder="https://wa.me/55..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Mensagem de Bloqueio personalizada</label>
                    <textarea
                      value={formMessage}
                      onChange={e => setFormMessage(e.target.value)}
                      rows={3}
                      placeholder="Texto que aparecerá na tela do cliente se for bloqueado..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Aba 3: Programação por Data & Hora */}
              {modalTab === 'schedule' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-700">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <Clock className="w-4 h-4 text-indigo-600" /> Programação de Plano e Ciclos
                    </p>
                    <p className="text-[11px] text-indigo-600/80">Ao definir a data de início do plano, o sistema calcula o ciclo de 30 dias para o próximo vencimento e bloqueio.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-1.5">📅 Data de Início do Plano</label>
                      <input
                        type="datetime-local"
                        value={formPlanStartDate}
                        onChange={e => {
                          const val = e.target.value;
                          setFormPlanStartDate(val);
                          if (val) {
                            const startDate = new Date(val);
                            const cycleEnd = new Date(startDate.getTime() + formBillingCycleDays * 24 * 60 * 60 * 1000);
                            const isoEnd = toInputDateTime(cycleEnd.toISOString());
                            setFormExpiresAt(isoEnd);
                            setFormScheduledBlockAt(isoEnd);
                          }
                        }}
                        className="w-full bg-indigo-50/50 border border-indigo-200 rounded-2xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">🔄 Ciclo (em Dias)</label>
                      <input
                        type="number"
                        value={formBillingCycleDays}
                        onChange={e => setFormBillingCycleDays(Number(e.target.value))}
                        placeholder="30"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-purple-600 mb-1.5">Agendar Bloqueio Automático</label>
                      <input
                        type="datetime-local"
                        value={formScheduledBlockAt}
                        onChange={e => setFormScheduledBlockAt(e.target.value)}
                        className="w-full bg-purple-50/50 border border-purple-200 rounded-2xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1.5">Agendar Desbloqueio Automático</label>
                      <input
                        type="datetime-local"
                        value={formScheduledUnblockAt}
                        onChange={e => setFormScheduledUnblockAt(e.target.value)}
                        className="w-full bg-blue-50/50 border border-blue-200 rounded-2xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1.5">Data de Expiração / Validade do Plano</label>
                    <input
                      type="datetime-local"
                      value={formExpiresAt}
                      onChange={e => setFormExpiresAt(e.target.value)}
                      className="w-full bg-amber-50/50 border border-amber-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-500 px-5 py-3 rounded-2xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <div className="flex gap-2">
                  {modalTab !== 'schedule' ? (
                    <button
                      type="button"
                      onClick={() => setModalTab(modalTab === 'info' ? 'license' : 'schedule')}
                      className="bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 px-5 py-3 rounded-2xl transition-all cursor-pointer"
                    >
                      Próximo →
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-indigo-600 to-blue-500 text-xs font-bold text-white px-5 py-3 rounded-2xl hover:opacity-95 active:scale-95 transition-all cursor-pointer shadow-md shadow-indigo-200"
                  >
                    {loading ? 'Salvando...' : 'Salvar Cliente'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
