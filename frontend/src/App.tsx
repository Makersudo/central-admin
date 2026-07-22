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
  payment_status?: 'paid' | 'pending' | 'overdue';
  plan_price?: number;
  last_payment_date?: string | null;
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'blocked' | 'unpaid'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estados dos Modais e Abas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'info' | 'license' | 'schedule' | 'payment'>('info');
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
  const [formPaymentStatus, setFormPaymentStatus] = useState<'paid' | 'pending' | 'overdue'>('paid');
  const [formPlanPrice, setFormPlanPrice] = useState<number>(399.90);
  const [formLastPaymentDate, setFormLastPaymentDate] = useState('');

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
    setFormPaymentStatus('paid');
    setFormPlanPrice(399.90);
    setFormLastPaymentDate('');
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
    setFormPaymentStatus(license.payment_status || 'paid');
    setFormPlanPrice(license.plan_price ?? 399.90);
    setFormLastPaymentDate(toInputDateTime(license.last_payment_date));
    setModalTab('info');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const safeIsoDate = (val?: string | null) => {
      if (!val || !val.trim()) return null;
      try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
      } catch {
        return null;
      }
    };

    const payload = {
      licenseKey: formLicenseKey,
      clientName: formClientName,
      domain: formDomain || null,
      active: formActive,
      message: formMessage || null,
      supportContact: formSupportContact || null,
      expires_at: safeIsoDate(formExpiresAt),
      scheduled_block_at: safeIsoDate(formScheduledBlockAt),
      scheduled_unblock_at: safeIsoDate(formScheduledUnblockAt),
      plan_start_date: safeIsoDate(formPlanStartDate),
      billing_cycle_days: Number(formBillingCycleDays || 30),
      payment_status: formPaymentStatus,
      plan_price: Number(formPlanPrice || 399.90),
      last_payment_date: safeIsoDate(formLastPaymentDate)
    };

    setIsModalOpen(false);

    try {
      const url = editingLicense 
        ? `${apiUrl}/api/licenses/admin/${editingLicense.id}` 
        : `${apiUrl}/api/licenses/admin`;
      
      const method = editingLicense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-admin-client': 'central-admin'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao salvar.');
      }

      await fetchLicenses();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar licença.');
      fetchLicenses();
    } finally {
      setLoading(false);
    }
  };

  const toggleLicenseActive = async (license: License) => {
    const newActiveState = !license.active;
    
    setLicenses(prev => prev.map(l => l.id === license.id ? { ...l, active: newActiveState } : l));

    try {
      const response = await fetch(`${apiUrl}/api/licenses/admin/${license.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-admin-client': 'central-admin'
        },
        body: JSON.stringify({ active: newActiveState })
      });

      if (!response.ok) throw new Error('Erro ao alterar status.');
      await fetchLicenses();
    } catch (err) {
      console.error(err);
      fetchLicenses();
    }
  };

  const handleRenewLicense = async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/licenses/admin/${id}/renew`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-admin-client': 'central-admin'
        }
      });

      if (!response.ok) throw new Error('Erro ao renovar plano.');
      await fetchLicenses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta licença? O acesso do cliente será bloqueado permanentemente.')) return;

    try {
      const response = await fetch(`${apiUrl}/api/licenses/admin/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-admin-client': 'central-admin'
        }
      });

      if (!response.ok) throw new Error('Erro ao deletar licença.');
      await fetchLicenses();
    } catch (err) {
      console.error(err);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const nowMs = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const isExpiringSoon = (lic: License) => {
    if (!lic.expires_at) return false;
    const expTime = new Date(lic.expires_at).getTime();
    return expTime > nowMs && (expTime - nowMs) <= sevenDaysMs;
  };

  const filteredLicenses = licenses.filter(lic => {
    const matchesSearch = 
      lic.client_name.toLowerCase().includes(search.toLowerCase()) ||
      lic.license_key.toLowerCase().includes(search.toLowerCase()) ||
      (lic.domain && lic.domain.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return lic.active;
    if (statusFilter === 'expiring') return isExpiringSoon(lic);
    if (statusFilter === 'blocked') return !lic.active;
    if (statusFilter === 'unpaid') return lic.payment_status === 'pending' || lic.payment_status === 'overdue';

    return true;
  });

  const totalClients = licenses.length;
  const activeClients = licenses.filter(l => l.active).length;
  const expiringClients = licenses.filter(isExpiringSoon).length;
  const blockedClients = licenses.filter(l => !l.active).length;
  const unpaidClients = licenses.filter(l => l.payment_status === 'pending' || l.payment_status === 'overdue').length;
  const totalMonthlyRevenue = licenses
    .filter(l => l.active && (l.payment_status === 'paid' || !l.payment_status))
    .reduce((acc, l) => acc + Number(l.plan_price ?? 399.90), 0);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans select-none relative">
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

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div 
            onClick={() => setStatusFilter('all')}
            className={`bg-white border rounded-3xl p-4 md:p-5 flex items-center gap-3.5 shadow-sm cursor-pointer transition-all ${
              statusFilter === 'all' ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total Lojas</p>
              <h2 className="text-lg md:text-xl font-black text-slate-800">{totalClients}</h2>
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('active')}
            className={`bg-white border rounded-3xl p-4 md:p-5 flex items-center gap-3.5 shadow-sm cursor-pointer transition-all ${
              statusFilter === 'active' ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Vigentes</p>
              <h2 className="text-lg md:text-xl font-black text-emerald-600">{activeClients}</h2>
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('expiring')}
            className={`bg-white border rounded-3xl p-4 md:p-5 flex items-center gap-3.5 shadow-sm cursor-pointer transition-all ${
              statusFilter === 'expiring' ? 'border-amber-600 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">A Vencer (7d)</p>
              <h2 className="text-lg md:text-xl font-black text-amber-600">{expiringClients}</h2>
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('blocked')}
            className={`bg-white border rounded-3xl p-4 md:p-5 flex items-center gap-3.5 shadow-sm cursor-pointer transition-all ${
              statusFilter === 'blocked' ? 'border-red-600 ring-2 ring-red-500/20' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Bloqueados</p>
              <h2 className="text-lg md:text-xl font-black text-red-600">{blockedClients}</h2>
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('unpaid')}
            className={`bg-white border rounded-3xl p-4 md:p-5 flex items-center gap-3.5 shadow-sm cursor-pointer transition-all ${
              statusFilter === 'unpaid' ? 'border-rose-600 ring-2 ring-rose-500/20' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Recorrência Mensal</p>
              <h2 className="text-lg md:text-xl font-black text-indigo-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMonthlyRevenue)}
              </h2>
              {unpaidClients > 0 && (
                <span className="text-[9px] font-bold text-rose-600">
                  {unpaidClients} pendente{unpaidClients > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 space-y-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">Gerenciamento de Empresas</h3>
                {statusFilter !== 'all' && (
                  <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Filtro: {statusFilter === 'active' ? 'Vigentes' : statusFilter === 'expiring' ? 'A Vencer 7d' : statusFilter === 'blocked' ? 'Bloqueados' : 'Pagamento Pendente'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">Monitore pagamentos, vigência de planos e controle o bloqueio em tempo real.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
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

              <button
                onClick={openCreateModal}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-2.5 rounded-2xl text-xs font-bold text-white hover:opacity-95 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Novo Cliente
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  <th className="p-4">Cliente / Empresa</th>
                  <th className="p-4">Chave & Domínio</th>
                  <th className="p-4 text-center">Plano & Valor</th>
                  <th className="p-4 text-center">Pagamento</th>
                  <th className="p-4 text-center">Status do Acesso</th>
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
                      <td className="p-4 text-center">
                        <div className="h-4 bg-slate-100 rounded w-20 mx-auto"></div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="h-6 bg-slate-200 rounded-full w-20 mx-auto"></div>
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
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <Building className="w-12 h-12 mx-auto mb-3 opacity-25" />
                      Nenhum cliente encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredLicenses.map(lic => {
                    const isExpiring = isExpiringSoon(lic);
                    const payStatus = lic.payment_status || 'paid';
                    const price = lic.plan_price ?? 399.90;

                    return (
                      <tr key={lic.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-800 text-sm">{lic.client_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 mb-1">Criado em {new Date(lic.created_at).toLocaleDateString('pt-BR')}</p>
                          <div className="flex flex-wrap gap-1">
                            {lic.expires_at && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium border ${
                                isExpiring 
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold' 
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                <Calendar className="w-2.5 h-2.5" /> Expira: {new Date(lic.expires_at).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {lic.scheduled_block_at && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                <Clock className="w-2.5 h-2.5" /> Bloqueio: {new Date(lic.scheduled_block_at).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <code className="bg-slate-100 text-indigo-600 px-2 py-0.5 rounded-lg border border-slate-200 font-mono text-[10px] font-bold">
                                {lic.license_key}
                              </code>
                              <button 
                                onClick={() => copyKey(lic.license_key)} 
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Copiar Chave"
                              >
                                {copiedKey === lic.license_key ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {lic.domain || <span className="text-slate-300 font-sans italic">Domínio livre</span>}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-slate-800 text-xs">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                          </span>
                          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Ciclo {lic.billing_cycle_days || 30}d</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            payStatus === 'paid'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : payStatus === 'pending'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-rose-50 border-rose-200 text-rose-700'
                          }`}>
                            <DollarSign className="w-3 h-3" />
                            {payStatus === 'paid' ? 'Pago' : payStatus === 'pending' ? 'Pendente' : 'Atrasado'}
                          </span>
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
                            {lic.active ? 'Vigente' : 'Bloqueado'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRenewLicense(lic.id)}
                              className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                              title="Dar Baixa no Pagamento e Renovar Plano por +30 Dias"
                            >
                              <Clock className="w-3 h-3 text-emerald-600" />
                              +30d
                            </button>
                            <button
                              onClick={() => openEditModal(lic)}
                              className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-xl hover:text-slate-800 transition-colors cursor-pointer"
                              title="Editar Detalhes"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(lic.id)}
                              className="p-2 bg-red-50 border border-red-100 hover:bg-red-100 hover:text-red-700 text-red-500 rounded-xl transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{editingLicense ? 'Editar Cliente & Plano' : 'Novo Cliente'}</h3>
              <p className="text-xs text-slate-400 mt-1">Configure dados da empresa, vigência do plano e pagamentos.</p>
            </div>

            <div className="flex border-b border-slate-100 gap-1 pb-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`pb-2 px-2.5 text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
                  modalTab === 'info' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                🏢 1. Loja
              </button>
              <button
                type="button"
                onClick={() => setModalTab('license')}
                className={`pb-2 px-2.5 text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
                  modalTab === 'license' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                🔑 2. Licença
              </button>
              <button
                type="button"
                onClick={() => setModalTab('schedule')}
                className={`pb-2 px-2.5 text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
                  modalTab === 'schedule' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                ⏰ 3. Agenda
              </button>
              <button
                type="button"
                onClick={() => setModalTab('payment')}
                className={`pb-2 px-2.5 text-xs font-bold transition-all border-b-2 shrink-0 cursor-pointer ${
                  modalTab === 'payment' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                💳 4. Financeiro
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {modalTab === 'info' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Nome da Loja *</label>
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
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Domínio Permitido (Opcional)</label>
                    <input
                      type="text"
                      value={formDomain}
                      onChange={e => setFormDomain(e.target.value)}
                      placeholder="Ex: boutiquedamoda.com.br ou localhost"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Deixe em branco para permitir acesso de qualquer domínio.</p>
                  </div>
                </div>
              )}

              {modalTab === 'license' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Chave de Licença *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={formLicenseKey}
                        onChange={e => setFormLicenseKey(e.target.value)}
                        placeholder="LIC-XXXX-XXXX"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-indigo-600 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={generateRandomKey}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-3 rounded-2xl text-xs font-bold text-slate-600 transition-colors shrink-0 cursor-pointer"
                        title="Gerar Nova Chave Aleatória"
                      >
                        Gerar
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Status do Acesso</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormActive(true)}
                        className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                          formActive 
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <Unlock className="w-4 h-4" />
                        Ativo / Vigente
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormActive(false)}
                        className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                          !formActive 
                            ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <Lock className="w-4 h-4" />
                        Bloqueado / Suspenso
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Link do WhatsApp Suporte</label>
                    <input
                      type="url"
                      value={formSupportContact}
                      onChange={e => setFormSupportContact(e.target.value)}
                      placeholder="https://wa.me/..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {modalTab === 'schedule' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Data Início do Plano</label>
                    <input
                      type="datetime-local"
                      value={formPlanStartDate}
                      onChange={e => setFormPlanStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Data Expiração</label>
                    <input
                      type="datetime-local"
                      value={formExpiresAt}
                      onChange={e => setFormExpiresAt(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-bold"
                    />
                  </div>
                </div>
              )}

              {modalTab === 'payment' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Valor do Plano (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formPlanPrice}
                      onChange={e => setFormPlanPrice(Number(e.target.value))}
                      placeholder="399.90"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Status do Pagamento</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormPaymentStatus('paid')}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          formPaymentStatus === 'paid' 
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        🟢 Pago
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormPaymentStatus('pending')}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          formPaymentStatus === 'pending' 
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        🟡 Pendente
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormPaymentStatus('overdue')}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          formPaymentStatus === 'overdue' 
                            ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        🔴 Atrasado
                      </button>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 text-xs text-emerald-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold">Dar Baixa e Liberar por +30d</p>
                      <p className="text-[10px] text-emerald-600">Marca o pagamento como PAGO hoje e estende a validade.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const isoNow = toInputDateTime(now.toISOString());
                        const nextMonth = new Date(now.getTime() + formBillingCycleDays * 24 * 3600 * 1000);
                        const isoNextMonth = toInputDateTime(nextMonth.toISOString());

                        setFormPaymentStatus('paid');
                        setFormLastPaymentDate(isoNow);
                        setFormActive(true);
                        setFormExpiresAt(isoNextMonth);
                        setFormScheduledBlockAt(isoNextMonth);
                      }}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer shrink-0 ml-2"
                    >
                      Confirmar Pago
                    </button>
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
                  {modalTab !== 'payment' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'info') setModalTab('license');
                        else if (modalTab === 'license') setModalTab('schedule');
                        else setModalTab('payment');
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 px-5 py-3 rounded-2xl transition-all cursor-pointer"
                    >
                      Próximo →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-indigo-600 to-blue-500 hover:opacity-95 text-xs font-bold text-white px-6 py-3 rounded-2xl transition-all shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : editingLicense ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
