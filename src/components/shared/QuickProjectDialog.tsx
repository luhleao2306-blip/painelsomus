import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { Eye, EyeOff, FolderPlus, Building2 } from 'lucide-react';

interface QuickProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string | null;
  lockClient?: boolean;
}

export function QuickProjectDialog({
  open,
  onOpenChange,
  clientId,
  lockClient,
}: QuickProjectDialogProps) {
  const { clients, addProject } = useData();
  const [saving, setSaving] = useState(false);
  const [isInternal, setIsInternal] = useState(!clientId && !lockClient ? false : !clientId);
  const [form, setForm] = useState({
    name: '',
    description: '',
    clientId: clientId || '',
    priority: 'Média' as 'Baixa' | 'Média' | 'Alta',
    deadline: '',
    visibleToClient: false,
  });

  useEffect(() => {
    if (open) {
      setIsInternal(!clientId && !lockClient ? false : !clientId);
      setForm({
        name: '',
        description: '',
        clientId: clientId || '',
        priority: 'Média',
        deadline: '',
        visibleToClient: false,
      });
    }
  }, [open, clientId, lockClient]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (!isInternal && !form.clientId && !lockClient) return;
    setSaving(true);
    try {
      await addProject({
        name: form.name.trim(),
        description: form.description,
        clientId: isInternal ? null : (form.clientId || null),
        status: 'Em andamento',
        priority: form.priority,
        startDate: new Date().toISOString().split('T')[0],
        deadline: form.deadline || null,
        progress: 0,
        visibleToClient: isInternal ? false : form.visibleToClient,
        currentStageIndex: 0,
        isInternal,
      } as any);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-primary" />
            Novo projeto
          </DialogTitle>
          <DialogDescription>
            Crie um projeto vinculado ao cliente e comece a adicionar tarefas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!lockClient && (
            <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-amber-700" />
                <div>
                  <p className="text-sm font-semibold">Interno Somus</p>
                  <p className="text-xs text-muted-foreground">
                    {isInternal ? 'Projeto interno — não vinculado a cliente.' : 'Vinculado a um cliente abaixo.'}
                  </p>
                </div>
              </div>
              <Switch checked={isInternal} onCheckedChange={setIsInternal} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Nome do projeto *</Label>
            <Input
              autoFocus
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Reestruturação Comercial 2026"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Resumo do escopo (opcional)"
            />
          </div>

          {!lockClient && !isInternal && (
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select
                value={form.clientId || '__none__'}
                onValueChange={v => setForm({ ...form, clientId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Selecione —</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>

          {!isInternal && (
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-2.5">
                {form.visibleToClient
                  ? <Eye className="h-4 w-4 text-emerald-600" />
                  : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-semibold">Visível para o cliente</p>
                  <p className="text-xs text-muted-foreground">
                    {form.visibleToClient
                      ? 'O cliente verá este projeto no portal.'
                      : 'Projeto interno — oculto do cliente.'}
                  </p>
                </div>
              </div>
              <Switch
                checked={form.visibleToClient}
                onCheckedChange={v => setForm({ ...form, visibleToClient: v })}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'Criando...' : 'Criar projeto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
