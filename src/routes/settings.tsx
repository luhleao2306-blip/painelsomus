import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, Bell, Loader2, Users as UsersIcon, Settings as SettingsIcon, Plug, ChevronRight, LayoutGrid } from 'lucide-react';
import { LevelSeal } from '@/components/gamificacao/LevelSeal';
import { useMyGamificationProfile, getLevelInfo, isSuperAdminAccess } from '@/lib/gamificacao-store';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/use-profile';
import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MODULES, useAllModuleOverrides, useSetModuleOverride } from '@/lib/module-permissions';
import { WolfAvatarPicker } from '@/components/WolfAvatarPicker';

type AdminPanel = 'users' | 'permissions' | 'module-access' | 'general' | 'integrations' | null;

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  master: 'Colaborador',
  project_manager: 'Gestor',
  consultant: 'Colaborador',
  collaborator: 'Colaborador',
  client: 'Cliente',
};

const ROLE_OPTIONS: Record<string, string> = {
  project_manager: 'Gestor',
  consultant: 'Colaborador',
  client: 'Cliente',
};

const ROLE_PERMISSIONS: { role: string; label: string; permissions: string[] }[] = [
  { role: 'super_admin', label: 'Super Admin', permissions: ['Acesso total ao sistema (exclusivo do Wilson)', 'Gerenciar usuários', 'Gerenciar clientes', 'Gerenciar projetos', 'Configurações globais'] },
  { role: 'project_manager', label: 'Gestor', permissions: ['Gerenciar projetos', 'Gerenciar tarefas', 'Visualizar todos os clientes', 'Excluir tarefas'] },
  { role: 'consultant', label: 'Colaborador', permissions: ['Visualizar projetos atribuídos', 'Gerenciar tarefas atribuídas', 'Acessar documentos do projeto'] },
  { role: 'client', label: 'Cliente', permissions: ['Visualizar projetos próprios', 'Visualizar entregas', 'Visualizar atas e documentos liberados'] },
];


const accessLabel = (user?: { email?: string | null; role?: string | null } | null) => {
  if (isSuperAdminAccess(user?.email, user?.role)) return 'Super Admin';
  return ROLE_LABELS[user?.role ?? ''] || user?.role || 'Usuário';
};

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, role, updateProfile, loading: profileLoading, refreshProfile } = useProfile();
  const isMaster = isSuperAdminAccess(profile?.email, role);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });

  const NOTIF_KEYS: { key: string; title: string; desc: string }[] = [
    { key: 'new_minutes', title: 'Novas Atas', desc: 'Receba um e-mail sempre que uma nova ata for publicada.' },
    { key: 'deadline_alerts', title: 'Alertas de Prazo', desc: 'Notificações push quando uma tarefa estiver próxima do vencimento.' },
    { key: 'mentions', title: 'Menções', desc: 'Avisar quando você for citado em um comentário ou tarefa.' },
    { key: 'weekly_reports', title: 'Relatórios Semanais', desc: 'Resumo de progresso enviado toda segunda-feira.' },
  ];

  const prefs = ((profile as any)?.notification_prefs as Record<string, boolean>) || {};
  const avatarUrl = (profile as any)?.avatar_url as string | null | undefined;

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        full_name: formData.full_name,
        phone: formData.phone,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo maior que 2MB');
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `avatars/${profile.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('client-assets').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from('client-assets').createSignedUrl(path, 60 * 60 * 24 * 365);
      if (!signed?.signedUrl) throw new Error('Falha ao gerar URL');
      await (supabase as any).from('profiles').update({ avatar_url: signed.signedUrl }).eq('id', profile.id);
      await refreshProfile();
      toast.success('Foto atualizada!');
    } catch (err: any) {
      toast.error('Erro ao enviar foto: ' + (err?.message || 'desconhecido'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTogglePref = async (key: string, value: boolean) => {
    if (!profile?.id) return;
    const next = { ...prefs, [key]: value };
    try {
      const { error } = await (supabase as any).from('profiles').update({ notification_prefs: next }).eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
    } catch (err: any) {
      toast.error('Erro ao salvar preferência');
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile?.id) return;
    setIsDeleting(true);
    try {
      const { error } = await (supabase as any).from('profiles').update({ status: 'inactive' }).eq('id', profile.id);
      if (error) throw error;
      toast.success('Conta desativada. Você será desconectado.');
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err: any) {
      toast.error('Erro ao desativar conta: ' + (err?.message || ''));
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta, preferências e notificações.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 border border-border/50">
            <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Shield className="h-4 w-4" />
              Segurança
            </TabsTrigger>
            {isMaster && (
              <TabsTrigger value="admin" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <SettingsIcon className="h-4 w-4" />
                Administração
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
                <CardDescription>Atualize suas informações de contato. Seu perfil é representado pelo selo do seu nível na alcateia.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ProfileLevelDisplay userId={profile?.id} />

                {role !== 'client' && (
                  <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/20 p-5 sm:flex-row sm:items-center">
                    <WolfAvatarPicker
                      value={(profile as any)?.avatar_key as string | null | undefined}
                      seed={profile?.id ?? profile?.email}
                      onChange={async (key) => {
                        try {
                          await updateProfile({ avatar_key: key } as any);
                          await refreshProfile();
                          toast.success('Avatar atualizado!');
                        } catch (err: any) {
                          toast.error('Erro ao salvar avatar: ' + (err?.message || ''));
                        }
                      }}
                    />
                    <div className="leading-tight">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Seu avatar</p>
                      <p className="font-display text-base font-semibold">Escolha um lobo da matilha</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        O avatar escolhido aparece em tarefas, notificações e em todo o sistema.
                      </p>
                    </div>
                  </div>
                )}




                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input 
                      id="name" 
                      value={formData.full_name} 
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="bg-muted/20 border-border/50" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input 
                      id="email" 
                      value={profile?.email || ''} 
                      disabled 
                      className="bg-muted/10 border-border/40 opacity-70" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-muted/20 border-border/50" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Cargo</Label>
                    <Input 
                      id="role" 
                      value={accessLabel(profile)} 
                      disabled 
                      className="bg-muted/10 border-border/40 opacity-70" 
                    />
                  </div>
                </div>
              </CardContent>
              <div className="flex items-center justify-end p-6 bg-muted/20 border-t border-border/50 rounded-b-xl">
                <Button 
                  className="font-semibold px-8" 
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : 'Salvar Alterações'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>Escolha como deseja ser avisado sobre atualizações nos projetos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {NOTIF_KEYS.map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-2">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={prefs[item.key] ?? false}
                        onCheckedChange={(v) => handleTogglePref(item.key, v)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <ChangePasswordCard />

            <Card className="border-border/50 shadow-sm border-rose-500/20">
              <CardHeader>
                <CardTitle className="text-rose-600">Área de Risco</CardTitle>
                <CardDescription>Ações irreversíveis relacionadas à sua conta.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-rose-500/5 rounded-xl border border-rose-500/10">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-rose-600">Excluir Conta</h4>
                    <p className="text-xs text-rose-600/70">Isso removerá permanentemente seu acesso a todos os projetos.</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          {isMaster && (
            <TabsContent value="admin" className="space-y-6">
              <AdminTab />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar sua conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua conta será marcada como inativa e você será desconectado imediatamente. Para reativar, entre em contato com um administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Desativando...' : 'Sim, desativar conta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

function ChangePasswordCard() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error('Erro ao alterar senha: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle>Alterar Senha</CardTitle>
        <CardDescription>Defina uma nova senha de acesso à sua conta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="bg-muted/20 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              className="bg-muted/20 border-border/50"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleChangePassword} disabled={saving || !newPassword || !confirmPassword}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : 'Alterar senha'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


function AdminTab() {
  const [panel, setPanel] = useState<AdminPanel>(null);

  const cards: { id: Exclude<AdminPanel, null>; icon: typeof UsersIcon; title: string; desc: string }[] = [
    { id: 'users', icon: UsersIcon, title: 'Gestão global de usuários', desc: 'Criar, editar, ativar/inativar e remover usuários.' },
    { id: 'permissions', icon: Shield, title: 'Permissões e papéis', desc: 'Veja o que cada perfil pode acessar no sistema.' },
    { id: 'module-access', icon: LayoutGrid, title: 'Acesso por módulo', desc: 'Libere ou bloqueie módulos individualmente para cada usuário.' },
    { id: 'general', icon: SettingsIcon, title: 'Configurações gerais', desc: 'Nome do sistema, logo e dados da empresa.' },
    { id: 'integrations', icon: Plug, title: 'Integrações globais', desc: 'APIs externas, webhooks e conectores.' },
  ];

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Configurações Administrativas
          </CardTitle>
          <CardDescription>Acesso restrito ao Super Admin. Clique em um card para gerenciar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => setPanel(c.id)}
                className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/50 transition-colors text-left group"
              >
                <Icon className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-bold">{c.title}</h4>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            );
          })}
        </CardContent>
      </Card>

      <UsersDialog open={panel === 'users'} onClose={() => setPanel(null)} />
      <PermissionsDialog open={panel === 'permissions'} onClose={() => setPanel(null)} />
      <ModuleAccessDialog open={panel === 'module-access'} onClose={() => setPanel(null)} />
      <GeneralDialog open={panel === 'general'} onClose={() => setPanel(null)} />
      <IntegrationsDialog open={panel === 'integrations'} onClose={() => setPanel(null)} />
    </>
  );
}

function ModuleAccessDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { data: overrides } = useAllModuleOverrides();
  const setOverride = useSetModuleOverride();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('profiles')
      .select('id, full_name, email, role, status')
      .neq('role', 'client')
      .order('full_name')
      .then(({ data, error }) => {
        if (error) toast.error('Erro ao carregar usuários');
        else setUsers((data as AdminUser[]) || []);
        setLoading(false);
      });
  }, [open]);

  const userOverrides = new Map<string, boolean>();
  overrides?.filter(o => o.user_id === selectedUserId).forEach(o => userOverrides.set(o.module_key, o.granted));

  const grouped = MODULES.reduce<Record<string, typeof MODULES>>((acc, m) => {
    (acc[m.group] = acc[m.group] || []).push(m);
    return acc;
  }, {});

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Acesso por módulo</DialogTitle>
          <DialogDescription>
            Selecione um usuário e ajuste quais módulos ele pode ver. Liberar sobrepõe o cargo; bloquear remove o acesso mesmo se o cargo permitir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Usuário</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione um usuário'} />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email} — {accessLabel(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUser && isSuperAdminAccess(selectedUser.email, selectedUser.role) && (
          <p className="text-xs text-muted-foreground">Usuários Super Admin têm acesso total e não podem ser restringidos por módulo.</p>
        )}

        {selectedUserId && selectedUser && !isSuperAdminAccess(selectedUser.email, selectedUser.role) && (
          <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-2">
            {Object.entries(grouped).map(([group, mods]) => (
              <div key={group} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h4>
                <div className="space-y-1.5">
                  {mods.map(m => {
                    const current = userOverrides.get(m.key); // true | false | undefined
                    const value = current === true ? 'allow' : current === false ? 'deny' : 'inherit';
                    return (
                      <div key={m.key} className="flex items-center justify-between gap-3 p-2 rounded-md border border-border/50">
                        <span className="text-sm">{m.label}</span>
                        <Select
                          value={value}
                          onValueChange={(v) => {
                            const granted = v === 'allow' ? true : v === 'deny' ? false : null;
                            setOverride.mutate({ user_id: selectedUserId, module_key: m.key, granted });
                          }}
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inherit">Conforme cargo</SelectItem>
                            <SelectItem value="allow">Liberar</SelectItem>
                            <SelectItem value="deny">Bloquear</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'client' });
  const [submitting, setSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!editing) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    setUpdatingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-password', {
        body: { user_id: editing.id, password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Senha atualizada com sucesso');
      setNewPassword('');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar senha');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, status')
      .order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar usuários');
    else setUsers((data as AdminUser[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const toggleStatus = async (u: AdminUser) => {
    const next = u.status === 'inactive' ? 'active' : 'inactive';
    const { error } = await supabase.from('profiles').update({ status: next }).eq('id', u.id);
    if (error) toast.error('Erro ao atualizar status');
    else {
      toast.success(`Usuário ${next === 'active' ? 'ativado' : 'inativado'}`);
      load();
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editing.full_name, role: editing.role })
      .eq('id', editing.id);
    if (error) toast.error('Erro ao salvar');
    else {
      toast.success('Usuário atualizado');
      setEditing(null);
      load();
    }
  };
  
  const handleCreate = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Usuário criado com sucesso!');
      setIsCreating(false);
      setNewUser({ full_name: '', email: '', password: '', role: 'client' });
      load();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle>Gestão de Usuários</DialogTitle>
              <DialogDescription>
                Liste, edite, ative/inative e altere o perfil dos usuários do sistema.
              </DialogDescription>
            </div>
            <Button onClick={() => setIsCreating(true)}>Novo Usuário</Button>
          </DialogHeader>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum usuário encontrado.</TableCell></TableRow>
                  ) : users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="outline">{accessLabel(u)}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={u.status === 'inactive' ? 'secondary' : 'default'}>
                          {u.status === 'inactive' ? 'Inativo' : 'Ativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setEditing({ ...u })}>Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(u)}>
                          {u.status === 'inactive' ? 'Ativar' : 'Inativar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            if (!confirm(`Excluir definitivamente o usuário ${u.full_name || u.email}? Esta ação não pode ser desfeita.`)) return;
                            try {
                              const { data, error } = await supabase.functions.invoke('admin-delete-user', {
                                body: { user_id: u.id },
                              });
                              if (error) throw error;
                              if (data?.error) throw new Error(data.error);
                              toast.success('Usuário excluído');
                              load();
                            } catch (err: any) {
                              toast.error(err.message || 'Erro ao excluir usuário');
                            }
                          }}
                        >
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreating} onOpenChange={(v) => !v && setIsCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Cadastre um novo usuário manualmente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input 
                value={newUser.full_name} 
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} 
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input 
                type="email" 
                value={newUser.email} 
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} 
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha Temporária</Label>
              <Input 
                type="password" 
                value={newUser.password} 
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} 
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_OPTIONS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) { setEditing(null); setNewPassword(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Atualize nome, perfil de acesso e senha.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={editing.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={editing.role} onValueChange={(v) => setEditing({ ...editing, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_OPTIONS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 pt-4 border-t">
                <Label>Nova senha</Label>
                <p className="text-xs text-muted-foreground">Deixe em branco para manter a senha atual. Mínimo 6 caracteres.</p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleUpdatePassword}
                    disabled={updatingPassword || !newPassword}
                  >
                    {updatingPassword ? 'Atualizando...' : 'Alterar senha'}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setNewPassword(''); }}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PermissionsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Permissões de módulos</DialogTitle>
          <DialogDescription>
            Defina quais módulos cada colaborador pode acessar. Quando não marcado, vale o acesso padrão do cargo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          <ModulePermissionsList />
        </div>
        <div className="px-6 py-3 border-t bg-muted/30">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Liberar</span> força acesso, mesmo se o cargo não tivesse.{' '}
            <span className="font-medium text-foreground">Bloquear</span> remove acesso, mesmo se o cargo tivesse. Super Admin sempre vê tudo.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModulePermissionsList() {
  const { data: overrides = [], isLoading } = useAllModuleOverrides();
  const setOverride = useSetModuleOverride();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingUsers(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, status')
        .neq('role', 'client')
        .order('full_name');
      setUsers((data ?? []) as any);
      setLoadingUsers(false);
    })();
  }, []);

  const ovMap = new Map<string, boolean>();
  overrides.forEach(o => ovMap.set(`${o.user_id}::${o.module_key}`, o.granted));

  const filtered = users.filter(u =>
    !search ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()),
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  const grouped = MODULES.reduce<Record<string, typeof MODULES>>((acc, m) => {
    (acc[m.group] ||= []).push(m);
    return acc;
  }, {});

  if (loadingUsers || isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  // Detail view: shows modules for a selected collaborator
  if (selectedUser) {
    if (isSuperAdminAccess(selectedUser.email, selectedUser.role)) {
      return (
        <div className="flex flex-col h-full">
          <div className="px-6 py-3 border-b flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(null)} className="h-8 px-2 gap-1">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Voltar
            </Button>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{selectedUser.full_name || '—'}</div>
              <div className="text-[11px] text-muted-foreground truncate">{selectedUser.email} • Super Admin</div>
            </div>
          </div>
          <div className="flex-1 px-6 py-8 text-sm text-muted-foreground">
            Este usuário é Super Admin e já possui acesso total a todos os módulos.
          </div>
        </div>
      );
    }
    const overrideCount = MODULES.filter(m => ovMap.has(`${selectedUser.id}::${m.key}`)).length;
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-3 border-b flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(null)} className="h-8 px-2 gap-1">
            <ChevronRight className="h-4 w-4 rotate-180" />
            Voltar
          </Button>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{selectedUser.full_name || '—'}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {selectedUser.email} • {accessLabel(selectedUser)}
            </div>
          </div>
          {overrideCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {overrideCount} {overrideCount === 1 ? 'regra' : 'regras'}
            </Badge>
          )}
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-5">
          {Object.entries(grouped).map(([group, mods]) => (
            <div key={group} className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</div>
              <div className="space-y-1.5">
                {mods.map(m => {
                  const key = `${selectedUser.id}::${m.key}`;
                  const current = ovMap.get(key);
                  const value = current === true ? 'allow' : current === false ? 'deny' : 'default';
                  return (
                    <div key={m.key} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 hover:bg-accent/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{m.label}</div>
                      </div>
                      <Select
                        value={value}
                        onValueChange={(val) => {
                          const granted = val === 'allow' ? true : val === 'deny' ? false : null;
                          setOverride.mutate({ user_id: selectedUser.id, module_key: m.key, granted });
                        }}
                      >
                        <SelectTrigger className={`h-8 w-32 text-xs ${value === 'allow' ? 'border-emerald-500/50 text-emerald-700 dark:text-emerald-400' : value === 'deny' ? 'border-destructive/50 text-destructive' : ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Padrão</SelectItem>
                          <SelectItem value="allow">✓ Liberar</SelectItem>
                          <SelectItem value="deny">✕ Bloquear</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // List view: collaborators
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b">
        <Input
          placeholder="Buscar colaborador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9"
        />
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-6 py-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Nenhum colaborador encontrado.</div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(u => {
              const count = MODULES.filter(m => ovMap.has(`${u.id}::${m.key}`)).length;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className="w-full flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 hover:bg-accent/50 hover:border-accent transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{u.full_name || '—'}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {u.email} • {accessLabel(u)}
                    </div>
                  </div>
                  {count > 0 && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {count} {count === 1 ? 'regra' : 'regras'}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}
        </div>
      </ScrollArea>
    </div>
  );
}

const SETTINGS_KEY = 'app_general_settings';

function GeneralDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState({ systemName: '', companyName: '', companyEmail: '', companyPhone: '', logoUrl: '' });

  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) setData(JSON.parse(stored));
      } catch {}
    }
  }, [open]);

  const save = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    toast.success('Configurações salvas');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurações Gerais</DialogTitle>
          <DialogDescription>Identidade do sistema e dados da empresa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do sistema</Label>
            <Input value={data.systemName} onChange={(e) => setData({ ...data, systemName: e.target.value })} placeholder="Ex: Portal do Cliente" />
          </div>
          <div className="space-y-2">
            <Label>URL do logo</Label>
            <Input value={data.logoUrl} onChange={(e) => setData({ ...data, logoUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Nome da empresa</Label>
            <Input value={data.companyName} onChange={(e) => setData({ ...data, companyName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={data.companyEmail} onChange={(e) => setData({ ...data, companyEmail: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={data.companyPhone} onChange={(e) => setData({ ...data, companyPhone: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Integration {
  id: string;
  name: string;
  type: string;
  url: string;
  secret: string | null;
  events: string[];
  enabled: boolean;
}

function IntegrationsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [form, setForm] = useState({ name: '', type: 'webhook', url: '', secret: '', events: '', enabled: true });

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from('integrations').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar integrações: ' + error.message);
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const resetForm = () => {
    setForm({ name: '', type: 'webhook', url: '', secret: '', events: '', enabled: true });
    setEditing(null);
    setShowForm(false);
  };

  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (it: Integration) => {
    setEditing(it);
    setForm({ name: it.name, type: it.type, url: it.url, secret: it.secret || '', events: (it.events || []).join(', '), enabled: it.enabled });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.url.trim()) { toast.error('Nome e URL são obrigatórios'); return; }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      url: form.url.trim(),
      secret: form.secret.trim() || null,
      events: form.events.split(',').map(s => s.trim()).filter(Boolean),
      enabled: form.enabled,
    };
    const q = editing
      ? (supabase as any).from('integrations').update(payload).eq('id', editing.id)
      : (supabase as any).from('integrations').insert({ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id });
    const { error } = await q;
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success(editing ? 'Integração atualizada' : 'Integração criada');
    resetForm();
    load();
  };

  const toggle = async (it: Integration) => {
    const { error } = await (supabase as any).from('integrations').update({ enabled: !it.enabled }).eq('id', it.id);
    if (error) toast.error('Erro: ' + error.message); else load();
  };

  const remove = async (it: Integration) => {
    if (!confirm(`Excluir integração "${it.name}"?`)) return;
    const { error } = await (supabase as any).from('integrations').delete().eq('id', it.id);
    if (error) toast.error('Erro: ' + error.message);
    else { toast.success('Integração excluída'); load(); }
  };

  const test = async (it: Integration) => {
    try {
      new URL(it.url);
    } catch {
      toast.error('URL inválida');
      return;
    }
    try {
      const res = await fetch(it.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(it.secret ? { 'X-Webhook-Secret': it.secret } : {}) },
        body: JSON.stringify({ event: 'test', timestamp: new Date().toISOString(), source: 'portal-cliente' }),
      });
      if (res.ok) toast.success(`Teste enviado (${res.status})`);
      else toast.error(`Falha no teste: ${res.status}`);
    } catch {
      try {
        await fetch(it.url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'test', timestamp: new Date().toISOString(), source: 'portal-cliente' }),
        });
        toast.success('Requisição enviada (sem confirmação - CORS bloqueado pelo destino)');
      } catch {
        toast.error('Falha ao conectar. A URL precisa ser um endpoint de webhook que aceite POST. URLs como chatgpt.com/share não são webhooks válidos.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (resetForm(), onClose())}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Integrações Globais</DialogTitle>
          <DialogDescription>Conectores, APIs externas e webhooks do sistema.</DialogDescription>
        </DialogHeader>

        {showForm ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Slack notificações" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="api">API externa</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="zapier">Zapier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex flex-col">
                <Label>Ativo</Label>
                <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Secret (opcional)</Label>
              <Input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder="Token de assinatura" />
            </div>
            <div className="space-y-2">
              <Label>Eventos (separados por vírgula)</Label>
              <Input value={form.events} onChange={(e) => setForm({ ...form, events: e.target.value })} placeholder="project.created, task.completed" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={save}>{editing ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={openNew}>+ Nova integração</Button>
            </div>
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <Plug className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Nenhuma integração configurada.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{it.name}</p>
                        <Badge variant={it.enabled ? 'default' : 'secondary'} className="text-[10px]">{it.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{it.url}</p>
                    </div>
                    <Switch checked={it.enabled} onCheckedChange={() => toggle(it)} />
                    <Button size="sm" variant="outline" onClick={() => test(it)}>Testar</Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(it)}>Editar</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(it)}>Excluir</Button>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileLevelDisplay({ userId }: { userId?: string }) {
  const { data: gam } = useMyGamificationProfile(userId);
  const lvl = getLevelInfo((gam as any)?.current_level);
  return (
    <div className="flex items-center gap-5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <LevelSeal levelName={lvl.current.name} size="lg" />
      <div className="leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selo da Alcateia</p>
        <p className="font-display text-xl font-semibold">{lvl.current.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">Seu nível é o seu rosto na alcateia. Sem fotos — só atitude e meritocracia.</p>
      </div>
    </div>
  );
}
