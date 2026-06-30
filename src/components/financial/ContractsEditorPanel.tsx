import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContext';

type Row = {
  id: string;
  name: string;
  client_id: string | null;
  status: string | null;
  monthly_value: number | null;
  total_value: number | null;
  start_date: string | null;
  end_date: string | null;
  payment_method: string | null;
  payment_day: number | null;
};

const METHODS = ['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro', 'Outro'];

function formatBRL(v: number | null) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ContractsEditorPanel() {
  const { clients } = useData();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contracts')
      .select('id, name, client_id, status, monthly_value, total_value, start_date, end_date, payment_method, payment_day')
      .order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar contratos');
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from('contracts').update({
      monthly_value: editing.monthly_value,
      total_value: editing.total_value,
      start_date: editing.start_date,
      end_date: editing.end_date,
      payment_method: editing.payment_method,
      payment_day: editing.payment_day,
      status: editing.status,
    }).eq('id', editing.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Contrato atualizado');
    setEditing(null);
    load();
  };

  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.name ?? '-') : '-';

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Mensal</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum contrato.</TableCell></TableRow>
            ) : rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{clientName(r.client_id)}</TableCell>
                <TableCell>{r.status ?? '-'}</TableCell>
                <TableCell className="text-right">{formatBRL(r.monthly_value)}</TableCell>
                <TableCell className="text-right">{formatBRL(r.total_value)}</TableCell>
                <TableCell>{r.payment_method ?? '-'}</TableCell>
                <TableCell>{r.payment_day ? `Dia ${r.payment_day}` : '-'}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar Contrato</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Valor Mensal (R$)</Label>
                <Input type="number" step="0.01" value={editing.monthly_value ?? ''} onChange={e => setEditing({ ...editing, monthly_value: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Valor Total (R$)</Label>
                <Input type="number" step="0.01" value={editing.total_value ?? ''} onChange={e => setEditing({ ...editing, total_value: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Data de Início</Label>
                <Input type="date" value={editing.start_date ?? ''} onChange={e => setEditing({ ...editing, start_date: e.target.value || null })} />
              </div>
              <div>
                <Label>Data de Fim</Label>
                <Input type="date" value={editing.end_date ?? ''} onChange={e => setEditing({ ...editing, end_date: e.target.value || null })} />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={editing.payment_method ?? ''} onValueChange={v => setEditing({ ...editing, payment_method: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dia de Vencimento (1-31)</Label>
                <Input type="number" min={1} max={31} value={editing.payment_day ?? ''} onChange={e => setEditing({ ...editing, payment_day: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editing.status ?? 'Vigente'} onValueChange={v => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Ativo', 'Vigente', 'Em Renovação', 'Encerrado', 'Cancelado', 'Suspenso'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
