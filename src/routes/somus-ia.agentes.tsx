import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  listSomusAgents,
  upsertSomusAgent,
  deleteSomusAgent,
} from '@/lib/somus-ia.functions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/use-profile';
import { Bot, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/somus-ia/agentes')({
  component: AgentsAdminPage,
});

type Form = {
  id?: string;
  name: string;
  description: string;
  openai_assistant_id: string;
  is_active: boolean;
};

const emptyForm: Form = {
  name: '',
  description: '',
  openai_assistant_id: '',
  is_active: true,
};

function AgentsAdminPage() {
  const { role } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listSomusAgents);
  const upsertFn = useServerFn(upsertSomusAgent);
  const deleteFn = useServerFn(deleteSomusAgent);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['somus-ia', 'agents'],
    queryFn: () => listFn({}),
    enabled: role === 'master',
  });

  const [form, setForm] = useState<Form>(emptyForm);

  const save = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          id: form.id,
          name: form.name,
          description: form.description || null,
          openai_assistant_id: form.openai_assistant_id,
          is_active: form.is_active,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['somus-ia', 'agents'] });
      setForm(emptyForm);
      toast.success('Agente salvo');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao salvar'),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['somus-ia', 'agents'] });
      toast.success('Agente excluído');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao excluir'),
  });

  if (role !== 'master') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="p-6 text-center max-w-md">
          <p className="text-sm font-medium">Acesso restrito</p>
          <p className="text-xs text-muted-foreground mt-1">
            Apenas administradores gerenciam agentes.
          </p>
          <Button variant="link" className="mt-2" onClick={() => navigate({ to: '/somus-ia' })}>
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Agentes SOMUS IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre os assistentes da OpenAI que ficarão disponíveis no chat.
          </p>
        </div>

        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {form.id ? 'Editar agente' : 'Novo agente'}
          </h2>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="agent-name">Nome</Label>
              <Input
                id="agent-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Analista de Contratos"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-assistant">Assistant ID (OpenAI)</Label>
              <Input
                id="agent-assistant"
                value={form.openai_assistant_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, openai_assistant_id: e.target.value }))
                }
                placeholder="asst_..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-desc">Descrição</Label>
              <Textarea
                id="agent-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="O que esse agente faz?"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="agent-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="agent-active" className="cursor-pointer">
                Ativo
              </Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => save.mutate()}
                disabled={!form.name || !form.openai_assistant_id || save.isPending}
              >
                {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {form.id ? 'Salvar alterações' : 'Criar agente'}
              </Button>
              {form.id && (
                <Button variant="ghost" onClick={() => setForm(emptyForm)}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Agentes cadastrados</h2>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <Card className="p-6 text-center border-dashed">
              <p className="text-sm text-muted-foreground">Nenhum agente cadastrado.</p>
            </Card>
          ) : (
            agents.map((a) => (
              <Card key={a.id} className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{a.name}</p>
                    {!a.is_active && (
                      <Badge variant="secondary" className="text-[10px]">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">
                    {a.openai_assistant_id}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm({
                      id: a.id,
                      name: a.name,
                      description: a.description ?? '',
                      openai_assistant_id: a.openai_assistant_id,
                      is_active: a.is_active,
                    })
                  }
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Excluir agente "${a.name}"?`)) del.mutate(a.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
