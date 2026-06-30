import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Users, Package, Lightbulb, Plus, Pencil, Trash2, BookOpenCheck, Upload, X as XIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

function TrailImage({ path, alt }: { path: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (/^https?:\/\//i.test(path)) { setSrc(path); return; }
    supabase.storage.from('client-assets').createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled) setSrc(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [path]);
  if (!src) return <div className="w-full h-full bg-muted animate-pulse" />;
  return <img src={src} alt={alt} className="w-full h-full object-cover" />;
}

export const Route = createFileRoute('/knowledge-trail')({
  component: KnowledgeTrailPage,
});

type Category = 'cultura' | 'time' | 'produtos' | 'informacoes';

type Item = {
  id: string;
  category: Category;
  title: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

const CATEGORIES: { id: Category; label: string; icon: typeof Sparkles; description: string; accent: string }[] = [
  { id: 'cultura', label: 'Cultura Somus', icon: Sparkles, description: 'Nossos valores, propósito e jeito de ser.', accent: 'from-amber-500/20 to-orange-500/10' },
  { id: 'time', label: 'Nosso Time', icon: Users, description: 'Quem são as pessoas que fazem a Somus acontecer.', accent: 'from-blue-500/20 to-indigo-500/10' },
  { id: 'produtos', label: 'Produtos & Serviços', icon: Package, description: 'O que entregamos para nossos clientes.', accent: 'from-emerald-500/20 to-teal-500/10' },
  { id: 'informacoes', label: 'Informações para o Time', icon: Lightbulb, description: 'Comunicados, materiais e novidades internas.', accent: 'from-fuchsia-500/20 to-pink-500/10' },
];

function KnowledgeTrailPage() {
  const { role } = useProfile();
  const canEdit = role === 'master' || role === 'project_manager' || role === 'consultant';
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Category>('cultura');
  const [viewing, setViewing] = useState<Item | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({ title: '', content: '', image_url: '' });
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 5MB'); return; }
    setUploading(true);
    try {
      const path = `knowledge-trail/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { error } = await supabase.storage.from('client-assets').upload(path, file);
      if (error) throw error;
      setForm(f => ({ ...f, image_url: path }));
      toast.success('Imagem enviada');
    } catch (e: any) {
      toast.error('Erro ao enviar imagem: ' + (e?.message ?? ''));
    } finally {
      setUploading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('knowledge_trail_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar Trilha da Alcateia');
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map: Record<Category, Item[]> = { cultura: [], time: [], produtos: [], informacoes: [] };
    for (const it of items) map[it.category]?.push(it);
    return map;
  }, [items]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', content: '', image_url: '' });
    setDialogOpen(true);
  };

  const openEdit = (it: Item) => {
    setEditing(it);
    setForm({ title: it.title, content: it.content ?? '', image_url: it.image_url ?? '' });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Informe um título'); return; }
    const payload = {
      category: tab,
      title: form.title.trim(),
      content: form.content.trim() || null,
      image_url: form.image_url.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from('knowledge_trail_items').update(payload).eq('id', editing.id);
      if (error) { toast.error('Erro ao salvar'); return; }
      toast.success('Item atualizado');
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('knowledge_trail_items').insert({ ...payload, created_by: user?.id });
      if (error) { toast.error('Erro ao criar'); return; }
      toast.success('Item adicionado');
    }
    setDialogOpen(false);
    load();
  };

  const remove = async (it: Item) => {
    if (!confirm(`Remover "${it.title}"?`)) return;
    const { error } = await supabase.from('knowledge_trail_items').delete().eq('id', it.id);
    if (error) { toast.error('Erro ao remover'); return; }
    toast.success('Removido');
    load();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <BookOpenCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Trilha da Alcateia</h1>
              <p className="text-sm text-muted-foreground">Cultura, time, produtos e tudo o que move a Somus.</p>
            </div>
          </div>
          {canEdit && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? 'Editar item' : `Adicionar em ${CATEGORIES.find(c => c.id === tab)?.label}`}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  <Textarea placeholder="Conteúdo / descrição" rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
                  <div className="space-y-2">
                    <Label>Imagem (opcional)</Label>
                    {form.image_url ? (
                      <div className="relative inline-block">
                        <div className="w-40 h-24 rounded-md overflow-hidden border bg-muted">
                          <TrailImage path={form.image_url} alt="preview" />
                        </div>
                        <Button
                          type="button" size="icon" variant="destructive"
                          className="h-6 w-6 absolute -top-2 -right-2 rounded-full"
                          onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                        >
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 border border-dashed rounded-md py-6 cursor-pointer hover:bg-muted/40 text-sm text-muted-foreground">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        <span>{uploading ? 'Enviando...' : 'Clique para enviar uma imagem'}</span>
                        <input
                          type="file" accept="image/*" className="hidden" disabled={uploading}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={save}>{editing ? 'Salvar' : 'Adicionar'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Category)}>
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto">
            {CATEGORIES.map(c => (
              <TabsTrigger key={c.id} value={c.id} className="flex items-center gap-2 py-2">
                <c.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{c.label}</span>
                <Badge variant="secondary" className="ml-1">{grouped[c.id]?.length ?? 0}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="mt-4 space-y-4">
              <Card className={`bg-gradient-to-br ${cat.accent} border-border/50`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><cat.icon className="h-5 w-5" /> {cat.label}</CardTitle>
                  <CardDescription>{cat.description}</CardDescription>
                </CardHeader>
              </Card>

              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
                </div>
              ) : grouped[cat.id].length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                  <cat.icon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum item ainda em {cat.label}.</p>
                  {canEdit && <Button variant="link" onClick={openCreate}>Adicionar o primeiro</Button>}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {grouped[cat.id].map(it => (
                    <Card
                      key={it.id}
                      className="overflow-hidden flex flex-col hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
                      onClick={() => setViewing(it)}
                    >
                      {it.image_url && (
                        <div className="aspect-video bg-muted overflow-hidden">
                          <TrailImage path={it.image_url} alt={it.title} />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{it.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col gap-3">
                        {it.content && <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{it.content}</p>}
                        {canEdit && (
                          <div className="mt-auto flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => openEdit(it)}><Pencil className="h-3 w-3 mr-1" /> Editar</Button>
                            <Button size="sm" variant="ghost" onClick={() => remove(it)}><Trash2 className="h-3 w-3 mr-1" /> Remover</Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.title}</DialogTitle>
              </DialogHeader>
              {viewing.image_url && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <TrailImage path={viewing.image_url} alt={viewing.title} />
                </div>
              )}
              {viewing.content && (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{viewing.content}</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
