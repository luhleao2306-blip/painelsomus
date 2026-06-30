import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/design-system/DesignSystem';
import { TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react';
import { FinancialEntriesPanel } from '@/components/financial/FinancialEntriesPanel';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

export const Route = createFileRoute('/financeiro/')({
  component: DREPage,
});

type Entry = {
  entry_type: 'receita' | 'despesa';
  amount: number;
  entry_date: string;
  status: string;
  category: string | null;
};

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function DREPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('financial_entries')
        .select('entry_type, amount, entry_date, status, category')
        .gte('entry_date', `${year}-01-01`)
        .lte('entry_date', `${year}-12-31`);
      if (!active) return;
      setEntries((data as Entry[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [year]);

  const considered = useMemo(
    () => entries.filter((e) => e.status !== 'cancelado'),
    [entries],
  );

  const monthly = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      m: i,
      label: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i],
      receita: 0,
      despesa: 0,
      resultado: 0,
    }));
    considered.forEach((e) => {
      const d = new Date(e.entry_date + 'T00:00:00');
      const idx = d.getMonth();
      if (e.entry_type === 'receita') months[idx].receita += Number(e.amount);
      else months[idx].despesa += Number(e.amount);
    });
    months.forEach((m) => (m.resultado = m.receita - m.despesa));
    return months;
  }, [considered]);

  const totals = useMemo(() => {
    const receita = monthly.reduce((s, m) => s + m.receita, 0);
    const despesa = monthly.reduce((s, m) => s + m.despesa, 0);
    return { receita, despesa, resultado: receita - despesa };
  }, [monthly]);

  const years = [year - 2, year - 1, year, year + 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">DRE — Demonstrativo {year}</h2>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard title="Receitas" value={brl(totals.receita)} icon={TrendingUp} />
        <MetricCard title="Despesas" value={brl(totals.despesa)} icon={TrendingDown} />
        <MetricCard
          title="Resultado"
          value={brl(totals.resultado)}
          icon={Wallet}
         
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultado mês a mês</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="#16a34a" radius={[4,4,0,0]} />
                <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="resultado" name="Resultado" fill="#2563eb" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabela DRE</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Mês</th>
                <th className="py-2 pr-3 text-right">Receitas</th>
                <th className="py-2 pr-3 text-right">Despesas</th>
                <th className="py-2 pr-3 text-right">Resultado</th>
                <th className="py-2 pr-3 text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => {
                const margin = m.receita > 0 ? (m.resultado / m.receita) * 100 : 0;
                return (
                  <tr key={m.m} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{m.label}</td>
                    <td className="py-2 pr-3 text-right text-emerald-600">{brl(m.receita)}</td>
                    <td className="py-2 pr-3 text-right text-rose-600">{brl(m.despesa)}</td>
                    <td className={`py-2 pr-3 text-right font-semibold ${m.resultado >= 0 ? 'text-foreground' : 'text-rose-600'}`}>
                      {brl(m.resultado)}
                    </td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">{margin.toFixed(1)}%</td>
                  </tr>
                );
              })}
              <tr className="bg-muted/40 font-semibold">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 pr-3 text-right text-emerald-700">{brl(totals.receita)}</td>
                <td className="py-2 pr-3 text-right text-rose-700">{brl(totals.despesa)}</td>
                <td className={`py-2 pr-3 text-right ${totals.resultado >= 0 ? 'text-foreground' : 'text-rose-700'}`}>
                  {brl(totals.resultado)}
                </td>
                <td className="py-2 pr-3 text-right">
                  {totals.receita > 0 ? ((totals.resultado / totals.receita) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <FinancialEntriesPanel />
    </div>
  );
}
