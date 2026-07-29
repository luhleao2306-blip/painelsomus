import { useRef, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DocumentCard, EmptyState } from '@/components/design-system/DesignSystem';
import { FileText, Plus, Upload, File as FileIcon, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['Contrato', 'Relatório', 'Apresentação', 'Planilha', 'Briefing', 'Outros'];

export function ClientDocumentsPanel({ clientId }: { clientId: string }) {
  const { documents, projects, addDocument, deleteDocument } = useData();
  const { role } = useProfile();
  const canManage = role === 'master' || role === 'project_manager' || role === 'consultant';

  const clientDocs = documents.filter(d => d.clientId === clientId);
  const clientProjects = projects.filter(p => p.clientId === clientId);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: '', category: '', projectId: '', externalLink: '' });

  const reset = () => { setForm({ name: '', category: '', projectId: '', externalLink: '' }); setFile(null); };

  const handleSave = async () => {
    const name = form.name.trim() || file?.name || '';
    if (!name) { toast.error('Informe o nome do documento.'); return; }
    if (!file && !form.externalLink.trim()) {
      toast.error('Anexe um arquivo ou informe um link.');
      return;
    }
    setSaving(true);
    try {
      await addDocument(
        {
          clientId,
          projectId: form.projectId || null,
          name,
          category: form.category || null,
          externalLink: form.externalLink.trim() || null,
        },
        file ?? undefined,
      );
      setOpen(false);
      reset();
    } catch {
      /* toast already handled */
    } finally {
      setSaving(false);
    }
  };

  const handleOpen = (doc: any) => {
    if (doc.externalLink) window.open(doc.externalLink, '_blank');
    else toast.info('Nenhum link disponível para este documento.');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {clientDocs.length} documento(s) deste cliente
        </p>
        {canManage && (
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo documento
          </Button>
        )}
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {clientDocs.map(doc => (
              <div key={doc.id} className="p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <DocumentCard doc={doc} onDownload={() => handleOpen(doc)} />
                </div>
                {canManage && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{doc.name}" será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteDocument(doc.id)}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
            {clientDocs.length === 0 && (
              <EmptyState
                icon={FileText}
                title="Sem documentos"
                description="Adicione arquivos ou links para deixá-los disponíveis neste cliente."
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { if (!saving) { setOpen(o); if (!o) reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Novo documento</DialogTitle>
            <DialogDescription className="text-xs">
              Anexe um arquivo ou registre um link externo para este cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Nome</Label>
              <Input
                className="h-8 text-sm"
                value={form.name}
                placeholder={file?.name ?? 'Ex: Relatório mensal'}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-0.5">
                <Label className="text-xs">Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5">
                <Label className="text-xs">Projeto (opcional)</Label>
                <Select
                  value={form.projectId || 'none'}
                  onValueChange={v => setForm({ ...form, projectId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem projeto —</SelectItem>
                    {clientProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Link externo (opcional)</Label>
              <Input
                className="h-8 text-xs"
                placeholder="https://..."
                value={form.externalLink}
                onChange={e => setForm({ ...form, externalLink: e.target.value })}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Arquivo (opcional)</Label>
              <div
                className="border border-dashed rounded-md p-3 text-center cursor-pointer hover:bg-muted/50"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileRef}
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <span className="text-xs font-medium flex items-center gap-2 justify-center">
                    <FileIcon className="h-3.5 w-3.5" /> {file.name}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 justify-center">
                    <Upload className="h-3.5 w-3.5" /> Clique para anexar
                  </span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Salvando...</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
