import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LevelSeal } from '@/components/gamificacao/LevelSeal';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Users, Pencil, Trash2, Lock, Cake, Link as LinkIcon, KeyRound } from 'lucide-react';
import { InviteLinksDialog } from '@/components/collaborators/InviteLinksDialog';
import { toast } from 'sonner';

export const Route = createFileRoute('/collaborators')({
  component: CollaboratorsPage,
});

type Status = 'ativo' | 'inativo' | 'ferias' | 'afastado' | 'desligado';
type ContractType = 'clt' | 'pj' | 'freelancer' | 'estagiario' | 'socio' | 'terceirizado';
type AccessLevel = 'super_admin' | 'admin' | 'gerente' | 'colaborador' | 'cliente' | 'visualizador';

interface Collaborator {
  id: string;
  full_name: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  cpf: string | null;
  rg: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  job_title: string | null;
  role_function: string | null;
  department: string | null;
  contract_type: ContractType | null;
  start_date: string | null;
  status: Status;
  manager_id: string | null;
  access_level: AccessLevel;
  linked_project_ids: string[];
  linked_client_ids: string[];
  payment_type: string | null;
  monthly_value: number | null;
  hourly_value: number | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  cnpj: string | null;
  company_name: string | null;
  payment_day: number | null;
  financial_notes: string | null;
}

const statusOptions: { value: Status; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'ferias', label: 'Em férias' },
  { value: 'afastado', label: 'Afastado' },
  { value: 'desligado', label: 'Desligado' },
];

const contractOptions: { value: ContractType; label: string }[] = [
  { value: 'clt', label: 'CLT' },
  { value: 'pj', label: 'PJ' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'estagiario', label: 'Estagiário' },
  { value: 'socio', label: 'Sócio' },
  { value: 'terceirizado', label: 'Terceirizado' },
];

const accessOptions: { value: AccessLevel; label: string }[] = [
  { value: 'super_admin', label: 'Super Administrador' },
  { value: 'admin', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'visualizador', label: 'Visualizador' },
];

const functionOptions = [
  'Administrador', 'Gerente de Projetos', 'Consultor', 'Atendimento', 'Designer',
  'Copywriter', 'Gestor de Tráfego', 'Social Media', 'SDR', 'Closer',
  'Financeiro', 'Operacional', 'Cliente',
];

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('');
}

function statusBadge(s: Status) {
  const map: Record<Status, string> = {
    ativo: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    inativo: 'bg-muted text-muted-foreground border-border',
    ferias: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
    afastado: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    desligado: 'bg-destructive/15 text-destructive border-destructive/30',
  };
  return <Badge variant="outline" className={map[s]}>{statusOptions.find(o => o.value === s)?.label}</Badge>;
}

const emptyForm: Partial<Collaborator> = {
  full_name: '', status: 'ativo', access_level: 'colaborador',
  linked_project_ids: [], linked_client_ids: [],
};

function CollaboratorsPage() {
  const { role, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const isAdmin = role === 'master' || role === 'project_manager';

  const [items, setItems] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [contractFilter, setContractFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [form, setForm] = useState<Partial<Collaborator>>(emptyForm);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<Collaborator | null>(null);
  const [pwdValue, setPwdValue] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    if (!profileLoading && !isAdmin) {
      navigate({ to: '/dashboard' });
    }
  }, [profileLoading, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from('collaborators').select('*').order('full_name');
    if (error) {
      toast.error('Erro ao carregar colaboradores');
      setLoading(false);
      return;
    }
    const collabs = (data || []) as Collaborator[];

    // Também exibe profiles ativos (usuários com login) que ainda não foram
    // cadastrados como colaborador — assim a lista nunca fica vazia após signup.
    const { data: profs } = await (supabase as any)
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, status')
      .eq('status', 'active');
    const profileList = (profs || []) as Array<{
      id: string; email: string | null; full_name: string | null;
      avatar_url: string | null; role: string | null; status: string | null;
    }>;

    const avatarByEmail = new Map<string, string>();
    profileList.forEach(p => {
      if (p.email && p.avatar_url) avatarByEmail.set(p.email.toLowerCase(), p.avatar_url);
    });
    collabs.forEach(c => {
      if (!c.avatar_url && c.email && avatarByEmail.has(c.email.toLowerCase())) {
        c.avatar_url = avatarByEmail.get(c.email.toLowerCase())!;
      }
    });

    const emailsInCollab = new Set(
      collabs.map(c => (c.email || '').toLowerCase()).filter(Boolean),
    );
    const virtual: Collaborator[] = profileList
      .filter(p => p.email && !emailsInCollab.has(p.email.toLowerCase()))
      .map(p => ({
        id: `profile:${p.id}`,
        full_name: p.full_name || p.email || 'Sem nome',
        display_name: null,
        email: p.email,
        phone: null, birth_date: null, cpf: null, rg: null,
        address: null, city: null, state: null,
        avatar_url: p.avatar_url,
        job_title: null,
        role_function:
          p.role === 'master' ? 'Administrador'
          : p.role === 'project_manager' ? 'Gerente de Projetos'
          : p.role === 'consultant' ? 'Consultor'
          : p.role === 'client' ? 'Cliente' : null,
        department: null,
        contract_type: null,
        start_date: null,
        status: 'ativo',
        manager_id: null,
        access_level: 'colaborador',
        linked_project_ids: [], linked_client_ids: [],
        payment_type: null, monthly_value: null, hourly_value: null,
        bank_name: null, bank_agency: null, bank_account: null, bank_account_type: null,
        pix_key: null, pix_key_type: null,
        cnpj: null, company_name: null, payment_day: null, financial_notes: null,
      }));

    const merged = [...collabs, ...virtual].sort((a, b) =>
      (a.full_name || '').localeCompare(b.full_name || ''),
    );
    setItems(merged);
    setLoading(false);
  };


  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const departments = useMemo(
    () => Array.from(new Set(items.map(i => i.department).filter(Boolean))) as string[],
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (q && !`${i.full_name} ${i.display_name ?? ''} ${i.email ?? ''} ${i.job_title ?? ''} ${i.role_function ?? ''}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (contractFilter !== 'all' && i.contract_type !== contractFilter) return false;
      if (departmentFilter !== 'all' && i.department !== departmentFilter) return false;
      return true;
    });
  }, [items, search, statusFilter, contractFilter, departmentFilter]);

  const startNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const startEdit = (c: Collaborator) => { setEditing(c); setForm(c); setOpen(true); };

  const save = async () => {
    if (!form.full_name?.trim()) {
      toast.error('Nome completo é obrigatório');
      return;
    }
    const payload: any = { ...form };
    // ensure arrays
    payload.linked_project_ids = payload.linked_project_ids ?? [];
    payload.linked_client_ids = payload.linked_client_ids ?? [];
    // numeric coercion
    if (payload.monthly_value === '' || payload.monthly_value == null) payload.monthly_value = null;
    if (payload.hourly_value === '' || payload.hourly_value == null) payload.hourly_value = null;
    if (payload.payment_day === '' || payload.payment_day == null) payload.payment_day = null;

    if (editing) {
      const { error } = await (supabase as any).from('collaborators').update(payload).eq('id', editing.id);
      if (error) return toast.error('Erro ao atualizar');
      toast.success('Colaborador atualizado');
    } else {
      const { error } = await (supabase as any).from('collaborators').insert(payload);
      if (error) return toast.error('Erro ao cadastrar');
      toast.success('Colaborador cadastrado');
    }
    setOpen(false);
    load();
  };

  const inactivate = async (c: Collaborator) => {
    const { error } = await (supabase as any).from('collaborators').update({ status: 'inativo' }).eq('id', c.id);
    if (error) return toast.error('Erro ao inativar');
    toast.success('Colaborador inativado');
    load();
  };

  const remove = async (c: Collaborator) => {
    if (!window.confirm(`Excluir ${c.full_name}? Esta ação também remove o acesso (login) vinculado a este e-mail.`)) return;
    const { error } = await (supabase as any).from('collaborators').delete().eq('id', c.id);
    if (error) return toast.error('Erro ao excluir');
    if (c.email) {
      try {
        await supabase.functions.invoke('admin-delete-user', { body: { email: c.email } });
      } catch { /* best-effort */ }
    }
    toast.success('Colaborador excluído');
    load();
  };

  const openPwd = (c: Collaborator) => {
    if (!c.email) {
      toast.error('Colaborador sem e-mail vinculado — não é possível alterar a senha.');
      return;
    }
    setPwdTarget(c);
    setPwdValue('');
    setPwdOpen(true);
  };

  const savePwd = async () => {
    if (!pwdTarget?.email) return;
    if (pwdValue.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (role !== 'master') {
      toast.error('Apenas o Administrador master pode alterar senhas.');
      return;
    }
    setPwdSaving(true);
    try {
      // Descobre o user_id do auth pelo e-mail via profiles
      const { data: prof, error: pErr } = await (supabase as any)
        .from('profiles')
        .select('id')
        .ilike('email', pwdTarget.email)
        .maybeSingle();
      if (pErr || !prof?.id) {
        toast.error('Usuário de login não encontrado para este e-mail.');
        setPwdSaving(false);
        return;
      }
      const { error } = await supabase.functions.invoke('admin-update-password', {
        body: { user_id: prof.id, password: pwdValue },
      });
      if (error) {
        toast.error('Erro ao alterar senha: ' + (error.message || 'tente novamente'));
      } else {
        toast.success('Senha alterada com sucesso.');
        setPwdOpen(false);
        setPwdTarget(null);
        setPwdValue('');
      }
    } catch (e: any) {
      toast.error('Erro ao alterar senha: ' + (e?.message ?? 'desconhecido'));
    } finally {
      setPwdSaving(false);
    }
  };

  const setField = (k: keyof Collaborator, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  if (!isAdmin) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" /> Colaboradores
            </h1>
            <p className="text-muted-foreground text-sm">Gestão de equipe interna do Portal Modulor.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInvitesOpen(true)} className="gap-2">
              <LinkIcon className="h-4 w-4" /> Links de convite
            </Button>
            <Button onClick={startNew} className="gap-2"><Plus className="h-4 w-4" /> Novo colaborador</Button>
          </div>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-4 grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por nome, cargo, função, e-mail…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={contractFilter} onValueChange={setContractFilter}>
              <SelectTrigger><SelectValue placeholder="Vínculo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vínculos</SelectItem>
                {contractOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {departments.length > 0 && (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os departamentos</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-base">{filtered.length} colaboradores</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Nenhum colaborador encontrado.</div>
            ) : (
              <div className="grid gap-2">
                {filtered.map(c => {
                  const bd = c.birth_date ? new Date(c.birth_date + 'T00:00:00') : null;
                  return (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition">
                      <Avatar className="h-10 w-10 border border-border/50">
                        {c.avatar_url && <AvatarImage src={c.avatar_url} alt={c.full_name} />}
                        <AvatarFallback className="text-[11px] font-semibold bg-muted">{initials(c.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm truncate">{c.full_name}</span>
                          {statusBadge(c.status)}
                          {c.role_function && <Badge variant="secondary" className="text-[10px]">{c.role_function}</Badge>}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {[c.job_title, c.department, c.contract_type && contractOptions.find(o => o.value === c.contract_type)?.label].filter(Boolean).join(' · ')}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.email || '—'} {c.phone ? ` · ${c.phone}` : ''}
                          {bd ? ` · 🎂 ${bd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(c)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        {role === 'master' && c.email && (
                          <Button size="sm" variant="ghost" onClick={() => openPwd(c)} title="Alterar senha"><KeyRound className="h-4 w-4" /></Button>
                        )}
                        {c.status !== 'inativo' && (
                          <Button size="sm" variant="ghost" onClick={() => inactivate(c)} title="Inativar"><Lock className="h-4 w-4" /></Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(c)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar colaborador' : 'Novo colaborador'}</DialogTitle>
            <DialogDescription>Preencha os dados do colaborador. Campos financeiros são restritos a administradores.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="personal" className="mt-2">
            <TabsList>
              <TabsTrigger value="personal">Dados pessoais</TabsTrigger>
              <TabsTrigger value="professional">Profissionais</TabsTrigger>
              <TabsTrigger value="financial"><Lock className="h-3 w-3 mr-1" />Financeiros</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="grid gap-3 md:grid-cols-2 pt-3">
              <div className="md:col-span-2"><Label>Nome completo *</Label>
                <Input value={form.full_name || ''} onChange={e => setField('full_name', e.target.value)} /></div>
              <div><Label>Nome de exibição</Label>
                <Input value={form.display_name || ''} onChange={e => setField('display_name', e.target.value)} /></div>
              <div><Label>E-mail</Label>
                <Input type="email" value={form.email || ''} onChange={e => setField('email', e.target.value)} /></div>
              <div><Label>Telefone</Label>
                <Input value={form.phone || ''} onChange={e => setField('phone', e.target.value)} /></div>
              <div><Label>Data de nascimento</Label>
                <Input type="date" value={form.birth_date || ''} onChange={e => setField('birth_date', e.target.value)} /></div>
              <div><Label>CPF</Label>
                <Input value={form.cpf || ''} onChange={e => setField('cpf', e.target.value)} /></div>
              <div><Label>RG</Label>
                <Input value={form.rg || ''} onChange={e => setField('rg', e.target.value)} /></div>
              <div className="md:col-span-2"><Label>Endereço</Label>
                <Input value={form.address || ''} onChange={e => setField('address', e.target.value)} /></div>
              <div><Label>Cidade</Label>
                <Input value={form.city || ''} onChange={e => setField('city', e.target.value)} /></div>
              <div><Label>Estado</Label>
                <Input value={form.state || ''} onChange={e => setField('state', e.target.value)} /></div>
              <div className="md:col-span-2"><Label>Foto (URL)</Label>
                <Input value={form.avatar_url || ''} onChange={e => setField('avatar_url', e.target.value)} placeholder="https://…" /></div>
            </TabsContent>

            <TabsContent value="professional" className="grid gap-3 md:grid-cols-2 pt-3">
              <div><Label>Cargo</Label>
                <Input value={form.job_title || ''} onChange={e => setField('job_title', e.target.value)} /></div>
              <div><Label>Função</Label>
                <Select value={form.role_function || ''} onValueChange={v => setField('role_function', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {functionOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><Label>Departamento</Label>
                <Input value={form.department || ''} onChange={e => setField('department', e.target.value)} /></div>
              <div><Label>Tipo de vínculo</Label>
                <Select value={form.contract_type || ''} onValueChange={v => setField('contract_type', v as ContractType)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {contractOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><Label>Data de entrada</Label>
                <Input type="date" value={form.start_date || ''} onChange={e => setField('start_date', e.target.value)} /></div>
              <div><Label>Status</Label>
                <Select value={form.status || 'ativo'} onValueChange={v => setField('status', v as Status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div className="md:col-span-2"><Label>Nível de acesso</Label>
                <Select value={form.access_level || 'colaborador'} onValueChange={v => setField('access_level', v as AccessLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {accessOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">Este campo é informativo nesta versão; as permissões continuam controladas pelo perfil de usuário.</p>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="grid gap-3 md:grid-cols-2 pt-3">
              <div className="md:col-span-2 rounded-md bg-muted/40 border border-border p-2 text-[11px] text-muted-foreground flex items-center gap-2">
                <Lock className="h-3 w-3" /> Visível apenas para administradores.
              </div>
              <div><Label>Tipo de pagamento</Label>
                <Input value={form.payment_type || ''} onChange={e => setField('payment_type', e.target.value)} placeholder="Mensal, por hora, projeto…" /></div>
              <div><Label>Valor fixo mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.monthly_value ?? ''} onChange={e => setField('monthly_value', e.target.value === '' ? null : Number(e.target.value))} /></div>
              <div><Label>Valor por hora (R$)</Label>
                <Input type="number" step="0.01" value={form.hourly_value ?? ''} onChange={e => setField('hourly_value', e.target.value === '' ? null : Number(e.target.value))} /></div>
              <div><Label>Dia de pagamento</Label>
                <Input type="number" min={1} max={31} value={form.payment_day ?? ''} onChange={e => setField('payment_day', e.target.value === '' ? null : Number(e.target.value))} /></div>
              <div><Label>Banco</Label>
                <Input value={form.bank_name || ''} onChange={e => setField('bank_name', e.target.value)} /></div>
              <div><Label>Tipo de conta</Label>
                <Input value={form.bank_account_type || ''} onChange={e => setField('bank_account_type', e.target.value)} placeholder="Corrente / Poupança" /></div>
              <div><Label>Agência</Label>
                <Input value={form.bank_agency || ''} onChange={e => setField('bank_agency', e.target.value)} /></div>
              <div><Label>Conta</Label>
                <Input value={form.bank_account || ''} onChange={e => setField('bank_account', e.target.value)} /></div>
              <div><Label>Tipo de chave PIX</Label>
                <Input value={form.pix_key_type || ''} onChange={e => setField('pix_key_type', e.target.value)} placeholder="CPF, e-mail, telefone, aleatória" /></div>
              <div><Label>Chave PIX</Label>
                <Input value={form.pix_key || ''} onChange={e => setField('pix_key', e.target.value)} /></div>
              <div><Label>CNPJ (se PJ)</Label>
                <Input value={form.cnpj || ''} onChange={e => setField('cnpj', e.target.value)} /></div>
              <div><Label>Razão social (se PJ)</Label>
                <Input value={form.company_name || ''} onChange={e => setField('company_name', e.target.value)} /></div>
              <div className="md:col-span-2"><Label>Observações financeiras internas</Label>
                <Textarea rows={3} value={form.financial_notes || ''} onChange={e => setField('financial_notes', e.target.value)} /></div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <InviteLinksDialog open={invitesOpen} onOpenChange={setInvitesOpen} />

      <Dialog open={pwdOpen} onOpenChange={(o) => { setPwdOpen(o); if (!o) { setPwdTarget(null); setPwdValue(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>
              Definir nova senha para <span className="font-semibold">{pwdTarget?.full_name}</span>
              {pwdTarget?.email ? <> ({pwdTarget.email})</> : null}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nova senha</Label>
            <Input
              type="text"
              autoFocus
              value={pwdValue}
              onChange={(e) => setPwdValue(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
            />
            <p className="text-[11px] text-muted-foreground">
              A senha será atualizada imediatamente. Comunique o colaborador em canal seguro.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwdOpen(false)} disabled={pwdSaving}>Cancelar</Button>
            <Button onClick={savePwd} disabled={pwdSaving || pwdValue.length < 6}>
              {pwdSaving ? 'Alterando…' : 'Alterar senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// Birthdays widget (used in dashboard)
export function BirthdaysWidget() {
  const { role } = useProfile();
  const [items, setItems] = useState<Pick<Collaborator, 'id' | 'full_name' | 'job_title' | 'avatar_url' | 'birth_date'>[]>([]);

  useEffect(() => {
    if (role === 'client') return;
    (supabase as any).from('collaborators')
      .select('id, full_name, job_title, avatar_url, birth_date, status')
      .neq('status', 'desligado')
      .neq('status', 'inativo')
      .then(({ data }: any) => setItems((data || []) as any));
  }, [role]);

  if (role === 'client') return null;

  const today = new Date();
  const sameDay = (m: number, d: number) => m === today.getMonth() && d === today.getDate();
  const weekEnd = new Date(); weekEnd.setDate(today.getDate() + 7);

  const parsed = items
    .filter(i => i.birth_date)
    .map(i => {
      const [y, m, d] = (i.birth_date as string).split('-').map(Number);
      const upcoming = new Date(today.getFullYear(), m - 1, d);
      if (upcoming < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        upcoming.setFullYear(today.getFullYear() + 1);
      }
      return { ...i, _m: m - 1, _d: d, _upcoming: upcoming };
    });

  const todays = parsed.filter(i => sameDay(i._m, i._d));
  const week = parsed.filter(i => !sameDay(i._m, i._d) && i._upcoming <= weekEnd).sort((a, b) => a._upcoming.getTime() - b._upcoming.getTime());
  const month = parsed.filter(i => i._m === today.getMonth()).sort((a, b) => a._d - b._d);

  if (parsed.length === 0) return null;

  const renderItem = (i: any) => (
    <div key={i.id} className="flex items-center gap-2.5 p-2 rounded-md border border-border/40 hover:bg-muted/30">
      <LevelSeal size="sm" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{i.full_name}</div>
        <div className="text-[10px] text-muted-foreground truncate">{i.job_title || '—'}</div>
      </div>
      <span className="text-[10px] font-semibold text-primary">
        {String(i._d).padStart(2, '0')}/{String(i._m + 1).padStart(2, '0')}
      </span>
    </div>
  );

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Cake className="h-4 w-4 text-primary" /> Aniversariantes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {todays.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Hoje 🎉</div>
            <div className="space-y-1">{todays.map(renderItem)}</div>
          </div>
        )}
        {week.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Próximos 7 dias</div>
            <div className="space-y-1">{week.slice(0, 5).map(renderItem)}</div>
          </div>
        )}
        {todays.length === 0 && week.length === 0 && month.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Este mês</div>
            <div className="space-y-1">{month.slice(0, 5).map(renderItem)}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
