import { InDevelopmentNotice } from '@/components/common/InDevelopmentNotice';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProfile } from '@/hooks/use-profile';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Folder, FolderPlus, Plus, Search, ChevronRight, ExternalLink, Copy,
  Pencil, Trash2, Library, ArrowLeft, Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/info-center')({
  component: () => (
    <MainLayout>
      <div className="py-16">
        <InDevelopmentNotice module="Central de Informações" />
      </div>
    </MainLayout>
  ),
});

interface InfoFolder {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  parent_id: string | null;
  owner_id: string | null;
  allowed_roles: string[];
  created_at: string;
  updated_at: string;
}

interface InfoItem {
  id: string;
  folder_id: string | null;
  title: string;
  item_type: string;
  link_url: string | null;
  description: string | null;
  client_id: string | null;
  project_id: string | null;
  owner_id: string | null;
  tags: string[];
  status: string | null;
  allowed_roles: string[];
  created_at: string;
  updated_at: string;
}

const ITEM_TYPES = [
  { value: 'link_lovable', label: 'Link Lovable' },
  { value: 'link_drive', label: 'Link Google Drive' },
  { value: 'link_notion', label: 'Link Notion' },
  { value: 'link_external', label: 'Link externo' },
  { value: 'document', label: 'Documento' },
  { value: 'presentation', label: 'Apresentação' },
  { value: 'spreadsheet', label: 'Planilha' },
  { value: 'video', label: 'Vídeo' },
  { value: 'reference', label: 'Referência' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'process', label: 'Processo' },
  { value: 'other', label: 'Outro' },
];

const ROLES = [
  { value: 'master', label: 'Super Admin' },
  { value: 'project_manager', label: 'Administrador' },
  { value: 'consultant', label: 'Colaborador' },
];

const CATEGORIES = [
  'Apresentações', 'Drive', 'Notion', 'Documentos Internos', 'Referências',
  'Clientes', 'Projetos', 'Comercial', 'Financeiro', 'Marketing',
  'Branding', 'Consultoria', 'Processos',
];

function labelType(t: string) { return ITEM_TYPES.find(x => x.value === t)?.label || t; }

function InfoCenterPage() {
  const { role, loading: profileLoading } = useProfile();
  const { filteredClients, filteredProjects } = useData();
  const navigate = useNavigate();
  const canManage = role === 'master' || role === 'project_manager';
  const isInternal = role !== 'client';

  const [folders, setFolders] = useState<InfoFolder[]>([]);
  const [items, setItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<InfoFolder | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const [folderOpen, setFolderOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<InfoFolder | null>(null);
  const [folderForm, setFolderForm] = useState<Partial<InfoFolder>>({});

  const [itemOpen, setItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<InfoItem | null>(null);
  const [itemForm, setItemForm] = useState<Partial<InfoItem>>({});

  useEffect(() => { if (!profileLoading && !isInternal) navigate({ to: '/dashboard' }); }, [profileLoading, isInternal, navigate]);

  const load = async () => {
    setLoading(true);
    const [{ data: f }, { data: i }] = await Promise.all([
      (supabase as any).from('info_folders').select('*').order('name'),
      (supabase as any).from('info_items').select('*').order('created_at', { ascending: false }),
    ]);
    setFolders((f || []) as InfoFolder[]);
    setItems((i || []) as InfoItem[]);
    setLoading(false);
  };
  useEffect(() => { if (isInternal) load(); }, [isInternal]);

  const breadcrumb = useMemo(() => {
    const chain: InfoFolder[] = [];
    let cur = currentFolder;
    while (cur) {
      chain.unshift(cur);
      cur = folders.find(f => f.id === cur!.parent_id) || null;
    }
    return chain;
  }, [currentFolder, folders]);

  const visibleFolders = useMemo(() => {
    return folders.filter(f => f.parent_id === (currentFolder?.id ?? null));
  }, [folders, currentFolder]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (search) {
        const hay = `${i.title} ${i.description ?? ''} ${(i.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      } else if (i.folder_id !== (currentFolder?.id ?? null)) {
        return false;
      }
      if (typeFilter !== 'all' && i.item_type !== typeFilter) return false;
      if (clientFilter !== 'all' && i.client_id !== clientFilter) return false;
      if (projectFilter !== 'all' && i.project_id !== projectFilter) return false;
      return true;
    });
  }, [items, currentFolder, search, typeFilter, clientFilter, projectFilter]);

  // Folder CRUD
  const openNewFolder = () => {
    setEditFolder(null);
    setFolderForm({ allowed_roles: ['master', 'project_manager', 'consultant'], parent_id: currentFolder?.id ?? null });
    setFolderOpen(true);
  };
  const openEditFolder = (f: InfoFolder) => { setEditFolder(f); setFolderForm(f); setFolderOpen(true); };

  const saveFolder = async () => {
    if (!folderForm.name?.trim()) return toast.error('Nome obrigatório');
    const payload: any = { ...folderForm };
    payload.allowed_roles = payload.allowed_roles || ['master', 'project_manager', 'consultant'];
    if (editFolder) {
      const { error } = await (supabase as any).from('info_folders').update(payload).eq('id', editFolder.id);
      if (error) return toast.error('Erro ao salvar pasta');
      toast.success('Pasta atualizada');
    } else {
      const { error } = await (supabase as any).from('info_folders').insert(payload);
      if (error) return toast.error('Erro ao criar pasta');
      toast.success('Pasta criada');
    }
    setFolderOpen(false); load();
  };

  const removeFolder = async (f: InfoFolder) => {
    if (!window.confirm(`Excluir a pasta "${f.name}" e todo o conteúdo dentro dela?`)) return;
    const { error } = await (supabase as any).from('info_folders').delete().eq('id', f.id);
    if (error) return toast.error('Erro ao excluir');
    if (currentFolder?.id === f.id) setCurrentFolder(folders.find(x => x.id === f.parent_id) || null);
    toast.success('Pasta excluída');
    load();
  };

  // Item CRUD
  const openNewItem = () => {
    setEditItem(null);
    setItemForm({
      folder_id: currentFolder?.id ?? null,
      item_type: 'link_external',
      tags: [],
      allowed_roles: ['master', 'project_manager', 'consultant'],
    });
    setItemOpen(true);
  };
  const openEditItem = (i: InfoItem) => { setEditItem(i); setItemForm(i); setItemOpen(true); };

  const saveItem = async () => {
    if (!itemForm.title?.trim()) return toast.error('Título obrigatório');
    const payload: any = { ...itemForm };
    payload.tags = payload.tags || [];
    payload.allowed_roles = payload.allowed_roles || ['master', 'project_manager', 'consultant'];
    if (editItem) {
      const { error } = await (supabase as any).from('info_items').update(payload).eq('id', editItem.id);
      if (error) return toast.error('Erro ao salvar item');
      toast.success('Item atualizado');
    } else {
      const { error } = await (supabase as any).from('info_items').insert(payload);
      if (error) return toast.error('Erro ao criar item');
      toast.success('Item criado');
    }
    setItemOpen(false); load();
  };

  const removeItem = async (i: InfoItem) => {
    if (!window.confirm(`Excluir "${i.title}"?`)) return;
    const { error } = await (supabase as any).from('info_items').delete().eq('id', i.id);
    if (error) return toast.error('Erro ao excluir');
    toast.success('Item excluído'); load();
  };

  const copyLink = async (url: string | null) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  };

  const openLink = (url: string | null) => {
    if (!url) return toast.error('Sem link cadastrado');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toggleRole = (form: any, set: (v: any) => void, role: string) => {
    const arr = new Set<string>(form.allowed_roles || []);
    if (arr.has(role)) arr.delete(role); else arr.add(role);
    set({ ...form, allowed_roles: Array.from(arr) });
  };

  if (!isInternal) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Library className="h-7 w-7 text-primary" /> Central de Informações
            </h1>
            <p className="text-muted-foreground text-sm">Organize links, documentos e referências em pastas compartilhadas.</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={openNewFolder} className="gap-2"><FolderPlus className="h-4 w-4" />Nova pasta</Button>
              <Button onClick={openNewItem} className="gap-2"><Plus className="h-4 w-4" />Novo item</Button>
            </div>
          )}
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <button onClick={() => setCurrentFolder(null)} className="hover:text-foreground font-medium">Raiz</button>
          {breadcrumb.map(f => (
            <span key={f.id} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3" />
              <button onClick={() => setCurrentFolder(f)} className="hover:text-foreground font-medium">{f.name}</button>
            </span>
          ))}
          {currentFolder && (
            <Button size="sm" variant="ghost" className="h-7 ml-2" onClick={() => {
              const p = folders.find(f => f.id === currentFolder.parent_id) || null;
              setCurrentFolder(p);
            }}><ArrowLeft className="h-3 w-3 mr-1" />Voltar</Button>
          )}
        </div>

        {/* Current folder header */}
        {currentFolder && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Folder className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-lg truncate">{currentFolder.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {currentFolder.description || currentFolder.category || 'Você está dentro desta pasta'}
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEditFolder(currentFolder)} className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />Editar
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive gap-1.5" onClick={() => removeFolder(currentFolder)}>
                    <Trash2 className="h-3.5 w-3.5" />Excluir
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="p-4 grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar em todas as pastas…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos clientes</SelectItem>
                  {filteredClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger><SelectValue placeholder="Projeto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos projetos</SelectItem>
                  {filteredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Folders */}
        {!search && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Pastas</h2>
            {visibleFolders.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">{currentFolder ? 'Esta pasta não tem subpastas.' : 'Nenhuma pasta neste nível.'}</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                {visibleFolders.map(f => (
                  <Card key={f.id} className="border-border/50 hover:border-primary/40 transition cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => setCurrentFolder(f)} className="flex items-start gap-3 text-left flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Folder className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate">{f.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{f.category || f.description || '—'}</div>
                          </div>
                        </button>
                        {canManage && (
                          <div className="opacity-0 group-hover:opacity-100 transition flex">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditFolder(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFolder(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {search ? `Resultados (${visibleItems.length})` : 'Itens nesta pasta'}
          </h2>
          {loading ? (
            <div className="text-sm text-muted-foreground py-4">Carregando…</div>
          ) : visibleItems.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 border border-dashed rounded-lg text-center">
              {search ? 'Nada encontrado.' : 'Nenhum item nesta pasta ainda.'}
            </div>
          ) : (
            <div className="grid gap-2">
              {visibleItems.map(i => {
                const folder = folders.find(x => x.id === i.folder_id);
                const client = filteredClients.find(c => c.id === i.client_id);
                const project = filteredProjects.find(p => p.id === i.project_id);
                return (
                  <Card key={i.id} className="border-border/50">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm truncate">{i.title}</span>
                          <Badge variant="secondary" className="text-[10px]">{labelType(i.item_type)}</Badge>
                          {folder && <Badge variant="outline" className="text-[10px]">{folder.name}</Badge>}
                        </div>
                        {i.description && <div className="text-[11px] text-muted-foreground line-clamp-1">{i.description}</div>}
                        <div className="text-[11px] text-muted-foreground truncate flex flex-wrap gap-x-2">
                          {client && <span>Cliente: {client.name}</span>}
                          {project && <span>Projeto: {project.name}</span>}
                          {i.tags?.length > 0 && <span>#{i.tags.join(' #')}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => openLink(i.link_url)} className="gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5" />Abrir
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => copyLink(i.link_url)} title="Copiar link"><Copy className="h-4 w-4" /></Button>
                        {canManage && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => openEditItem(i)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Folder dialog */}
      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editFolder ? 'Editar pasta' : 'Nova pasta'}</DialogTitle>
            <DialogDescription>Pastas podem conter subpastas e itens compartilháveis.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nome *</Label>
              <Input value={folderForm.name || ''} onChange={e => setFolderForm({ ...folderForm, name: e.target.value })} /></div>
            <div><Label>Descrição</Label>
              <Textarea rows={2} value={folderForm.description || ''} onChange={e => setFolderForm({ ...folderForm, description: e.target.value })} /></div>
            <div><Label>Categoria</Label>
              <Select value={folderForm.category || ''} onValueChange={v => setFolderForm({ ...folderForm, category: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><Label>Pasta pai</Label>
              <Select value={folderForm.parent_id || 'none'} onValueChange={v => setFolderForm({ ...folderForm, parent_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Raiz —</SelectItem>
                  {folders.filter(f => f.id !== editFolder?.id).map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div>
              <Label>Visível para</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ROLES.map(r => {
                  const active = (folderForm.allowed_roles || []).includes(r.value);
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => toggleRole(folderForm, setFolderForm, r.value)}
                      className={`px-3 py-1.5 rounded-md border text-xs font-semibold transition ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                    >{r.label}</button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderOpen(false)}>Cancelar</Button>
            <Button onClick={saveFolder}>{editFolder ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Editar item' : 'Novo item'}</DialogTitle>
            <DialogDescription>Cadastre links e referências dentro de uma pasta.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Título *</Label>
              <Input value={itemForm.title || ''} onChange={e => setItemForm({ ...itemForm, title: e.target.value })} /></div>
            <div><Label>Tipo</Label>
              <Select value={itemForm.item_type || 'link_external'} onValueChange={v => setItemForm({ ...itemForm, item_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><Label>Pasta</Label>
              <Select value={itemForm.folder_id || 'none'} onValueChange={v => setItemForm({ ...itemForm, folder_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem pasta —</SelectItem>
                  {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="md:col-span-2"><Label>Link / URL</Label>
              <Input value={itemForm.link_url || ''} onChange={e => setItemForm({ ...itemForm, link_url: e.target.value })} placeholder="https://…" /></div>
            <div className="md:col-span-2"><Label>Descrição</Label>
              <Textarea rows={2} value={itemForm.description || ''} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} /></div>
            <div><Label>Cliente vinculado</Label>
              <Select value={itemForm.client_id || 'none'} onValueChange={v => setItemForm({ ...itemForm, client_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {filteredClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><Label>Projeto vinculado</Label>
              <Select value={itemForm.project_id || 'none'} onValueChange={v => setItemForm({ ...itemForm, project_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {filteredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="md:col-span-2"><Label>Tags (separadas por vírgula)</Label>
              <Input
                value={(itemForm.tags || []).join(', ')}
                onChange={e => setItemForm({ ...itemForm, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              /></div>
            <div className="md:col-span-2">
              <Label>Visível para</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ROLES.map(r => {
                  const active = (itemForm.allowed_roles || []).includes(r.value);
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => toggleRole(itemForm, setItemForm, r.value)}
                      className={`px-3 py-1.5 rounded-md border text-xs font-semibold transition ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                    >{r.label}</button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemOpen(false)}>Cancelar</Button>
            <Button onClick={saveItem}>{editItem ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
