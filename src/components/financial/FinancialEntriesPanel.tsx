import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Entry = {
  id: string;
  entry_type: 'receita' | 'despesa';
  description: string;
  category: string | null;
  amount: number;
  entry_date: string;
  payment_method: string | null;
  status: string;
  notes: string | null;
  contract_id: string | null;
  client_id: string | null;
};

const PAYMENT_METHODS = ['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro', 'Outro'];
const STATUSES = ['pago', 'pendente', 'atrasado', 'cancelado'];

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function emptyEntry(): Partial<Entry> {
  return {
    entry_type: 'receita',
    description: '',
    amount: 0,
    entry_date: new Date().toISOString().slice(0, 10),
    status: 'pago',
    payment_method: 'PIX',
  };
}

export function FinancialEntriesPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Entry>>(emptyEntry());
  const [filter, setFilter] = useState<'all' | 'receita' | 'despesa'>('all');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .order('entry_date', { ascending: false });
    if (error) toast.error('Erro ao carregar lançamentos');
    setEntries((data as Entry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => filter === 'all' ? entries : entries.filter(e => e.entry_type === filter),
    [entries, filter]
  );

  const totals = useMemo(() => {
    const receitas = entries.filter(e => e.entry_type === 'receita' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0);
    const despesas = entries.filter(e => e.entry_type === 'despesa' && e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [entries]);

  const save = async () => {
    if (!editing.description || !editing.amount) {
      toast.error('Preencha descrição e valor');
      return;
    }
    const payload = {
      entry_type: editing.entry_type ?? 'receita',
      description: editing.description!,
      category: editing.category ?? null,
      amount: Number(editing.amount),
      entry_date: editing.entry_date ?? new Date().toISOString().slice(0, 10),
      payment_method: editing.payment_method ?? null,
      status: editing.status ?? 'pago',
      notes: editing.notes ?? null,
      contract_id: editing.contract_id ?? null,
      client_id: editing.client_id ?? null,
    };
    const { error } = editing.id
      ? await supabase.from('financial_entries').update(payload).eq('id', editing.id)
      : await supabase.from('financial_entries').insert(payload);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success('Lançamento salvo');
    setOpen(false);
    setEditing(emptyEntry());
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este lançamento?')) return;
    const { error } = await supabase.from('financial_entries').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Excluído');
    load();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receitas (pagas)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{formatBRL(totals.receitas)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Despesas (pagas)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{formatBRL(totals.despesas)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${totals.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatBRL(totals.saldo)}</p></CardContent></Card>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>Todos</Button>
          <Button variant={filter === 'receita' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('receita')}>Receitas</Button>
          <Button variant={filter === 'despesa' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('despesa')}>Despesas</Button>
        </div>
        <Button onClick={() => { setEditing(emptyEntry()); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum lançamento.</TableCell></TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.entry_date + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant={e.entry_type === 'receita' ? 'default' : 'destructive'}>
                      {e.entry_type === 'receita' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{e.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.category ?? '-'}</TableCell>
                  <TableCell className="text-sm">{e.payment_method ?? '-'}</TableCell>
                  <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                  <TableCell className={`text-right font-semibold ${e.entry_type === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {e.entry_type === 'receita' ? '+' : '-'} {formatBRL(Number(e.amount))}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(e.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing.id ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Tipo</Label>
              <Select value={editing.entry_type} onValueChange={(v: 'receita' | 'despesa') => setEditing({ ...editing, entry_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={editing.entry_date ?? ''} onChange={e => setEditing({ ...editing, entry_date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição *</Label>
              <Input value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input placeholder="Ex: Mensalidade, Equipamento..." value={editing.category ?? ''} onChange={e => setEditing({ ...editing, category: e.target.value })} />
            </div>
            <div>
              <Label>Valor *</Label>
              <Input type="number" step="0.01" value={editing.amount ?? 0} onChange={e => setEditing({ ...editing, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={editing.payment_method ?? ''} onValueChange={v => setEditing({ ...editing, payment_method: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={editing.notes ?? ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
