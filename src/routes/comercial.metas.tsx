import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Target, BarChart3, Users, TrendingUp, Trophy, Quote, Flag, Gauge, Plus, Download,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export const Route = createFileRoute('/comercial/metas')({
  component: MetasEstrategicas,
});

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

type GoalStatus = 'rascunho' | 'ativa' | 'encerrada';

type MonthlyGoal = {
  id: string;
  monthIndex: number; // 0-11
  year: number;
  meta: number;
  realizado: number;
  observacoes?: string;
  status: GoalStatus;
  responsavel?: string;
};

const CURRENT_YEAR = new Date().getFullYear();

const SEED_MONTHLY: MonthlyGoal[] = [
  { meta: 120000, realizado: 95000 },
  { meta: 120000, realizado: 130000 },
  { meta: 140000, realizado: 128000 },
  { meta: 140000, realizado: 152000 },
  { meta: 150000, realizado: 138000 },
  { meta: 160000, realizado: 118000 },
  { meta: 160000, realizado: 145000 },
  { meta: 170000, realizado: 162000 },
  { meta: 170000, realizado: 181000 },
  { meta: 180000, realizado: 155000 },
  { meta: 180000, realizado: 172000 },
  { meta: 200000, realizado: 142000 },
].map((m, i) => ({
  id: `seed-${i}`,
  monthIndex: i,
  year: CURRENT_YEAR,
  meta: m.meta,
  realizado: m.realizado,
  status: 'ativa' as GoalStatus,
  responsavel: 'Mariana Lopes',
}));

type SellerGoal = {
  id: string;
  monthIndex: number;
  year: number;
  seller: string;
  meta: number;
  realizado: number;
  observacoes?: string;
  status: GoalStatus;
};

type UserOption = { id: string; full_name: string };

const SEED_SELLER_GOALS: SellerGoal[] = [
  { nome: 'Mariana Lopes', meta: 50000, realizado: 58000 },
  { nome: 'Rafael Souza', meta: 45000, realizado: 42000 },
  { nome: 'Camila Duarte', meta: 40000, realizado: 41500 },
  { nome: 'Bruno Almeida', meta: 40000, realizado: 28000 },
].map((s, i) => ({
  id: `seed-seller-${i}`,
  monthIndex: new Date().getMonth(),
  year: CURRENT_YEAR,
  seller: s.nome,
  meta: s.meta,
  realizado: s.realizado,
  status: 'ativa' as GoalStatus,
}));

const SELLERS = SEED_SELLER_GOALS.map((s) => ({
  nome: s.seller, meta: s.meta, realizado: s.realizado,
}));


const QUOTES = [
  'Vendas fortes nascem de rotina clara.',
  'O que não é medido não é melhorado.',
  'Toda meta precisa virar ação diária.',
  'Pipeline saudável sustenta crescimento previsível.',
  'Resultado comercial é consequência de consistência.',
];

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function MetricCard({
  label, value, hint, icon: Icon,
}: {
  label: string; value: string; hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function MetasEstrategicas() {
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        const allowed = ['lucius vieira', 'wilson camargos'];
        const list = (data ?? [])
          .filter((p): p is { id: string; full_name: string } =>
            !!p.full_name && allowed.some((n) => p.full_name!.toLowerCase().includes(n)),
          )
          .map((p) => ({ id: p.id, full_name: p.full_name as string }));
        setUsers(list);
      });
  }, []);

  const mapDbStatus = (s: string | null | undefined): GoalStatus => {
    if (s === 'rascunho' || s === 'ativa' || s === 'encerrada') return s;
    return 'ativa';
  };

  const refreshAll = async () => {
    const [{ data: gs, error: e1 }, { data: ss, error: e2 }] = await Promise.all([
      supabase.from('strategic_sales_goals').select('*'),
      supabase.from('seller_monthly_goals').select('*'),
    ]);
    if (e1 || e2) {
      toast.error('Erro ao carregar metas do banco.');
      return;
    }
    setGoals(
      (gs ?? []).map((g) => ({
        id: g.id,
        monthIndex: g.month - 1,
        year: g.year,
        meta: Number(g.general_goal_amount) || 0,
        realizado: Number(g.general_result_amount) || 0,
        observacoes: g.notes ?? undefined,
        status: mapDbStatus(g.status),
        responsavel: undefined,
      })),
    );
    setSellerGoals(
      (ss ?? []).map((s) => ({
        id: s.id,
        monthIndex: s.month - 1,
        year: s.year,
        seller: s.seller_name,
        meta: Number(s.individual_goal_amount) || 0,
        realizado: Number(s.individual_result_amount) || 0,
        observacoes: s.notes ?? undefined,
        status: mapDbStatus(s.status),
      })),
    );
  };

  useEffect(() => {
    refreshAll().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    monthIndex: new Date().getMonth(),
    year: CURRENT_YEAR,
    metaText: '',
    observacoes: '',
    status: 'ativa' as GoalStatus,
    responsavel: '', // user id
  });

  // Série mensal para gráficos/cards, sempre 12 meses do ano atual
  const monthlySeries = useMemo(() => {
    return MONTH_LABELS.map((label, i) => {
      const g = goals.find((x) => x.year === CURRENT_YEAR && x.monthIndex === i);
      return { mes: label, meta: g?.meta ?? 0, realizado: g?.realizado ?? 0 };
    });
  }, [goals]);

  const nowIdx = new Date().getMonth();
  // Mês de referência: usa o atual se já tem meta; senão, salta para o próximo
  // mês do ano que tenha meta cadastrada (ex.: hoje é junho sem meta, mas julho tem).
  const referenceIdx = useMemo(() => {
    if (monthlySeries[nowIdx]?.meta > 0 || monthlySeries[nowIdx]?.realizado > 0) return nowIdx;
    for (let i = nowIdx + 1; i < monthlySeries.length; i++) {
      if (monthlySeries[i].meta > 0) return i;
    }
    return nowIdx;
  }, [monthlySeries, nowIdx]);
  const currentIdx = referenceIdx;
  const safeIdx = Math.min(currentIdx, monthlySeries.length - 1);
  const current = monthlySeries[safeIdx];
  const metaMes = current.meta;
  const realizadoMes = current.realizado;
  const pctMes = metaMes > 0 ? Math.round((realizadoMes / metaMes) * 100) : 0;
  const gapMes = metaMes - realizadoMes;

  const upTo = monthlySeries.slice(0, safeIdx + 1);
  const metaAno = upTo.reduce((a, m) => a + m.meta, 0);
  const realizadoAno = upTo.reduce((a, m) => a + m.realizado, 0);
  const pctAno = metaAno > 0 ? Math.round((realizadoAno / metaAno) * 100) : 0;

  const parseBRL = (txt: string) => {
    const cleaned = txt.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  const handleSave = async () => {
    const value = parseBRL(form.metaText);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Informe um valor de meta válido.');
      return;
    }
    if (form.year < 2000 || form.year > 2100) {
      toast.error('Ano inválido.');
      return;
    }
    const duplicate = goals.some(
      (g) => g.monthIndex === form.monthIndex && g.year === form.year,
    );
    if (duplicate) {
      toast.error('Já existe uma meta geral para esse mês e ano.');
      return;
    }
    const { error } = await supabase.from('strategic_sales_goals').insert({
      month: form.monthIndex + 1,
      year: form.year,
      general_goal_amount: value,
      general_result_amount: 0,
      notes: form.observacoes.trim().slice(0, 500) || null,
      status: form.status,
      responsible_id: form.responsavel || null,
    });
    if (error) {
      toast.error('Erro ao salvar meta: ' + error.message);
      return;
    }
    if (form.responsavel) {
      await supabase.from('notifications').insert({
        user_id: form.responsavel,
        title: 'Nova meta geral atribuída',
        description: `Você é responsável pela meta geral de ${MONTH_NAMES[form.monthIndex]}/${form.year} — ${BRL(value)}.`,
        type: 'goal',
        link: '/comercial/metas',
      });
    }
    await refreshAll();
    toast.success(`Meta geral de ${MONTH_NAMES[form.monthIndex]}/${form.year} cadastrada.`);
    setDialogOpen(false);
    setForm((f) => ({ ...f, metaText: '', observacoes: '' }));
  };

  // ---- Metas por vendedor ----
  const [sellerGoals, setSellerGoals] = useState<SellerGoal[]>([]);
  const [sellerView, setSellerView] = useState({
    monthIndex: new Date().getMonth(),
    year: CURRENT_YEAR,
  });
  const [sellerDialogOpen, setSellerDialogOpen] = useState(false);
  const [sellerForm, setSellerForm] = useState({
    monthIndex: new Date().getMonth(),
    year: CURRENT_YEAR,
    seller: '', // user id
    metaText: '',
    realizadoText: '',
    observacoes: '',
    status: 'ativa' as GoalStatus,
  });

  // ---- Filtros globais da área de Metas Estratégicas ----
  type PerformanceFilter = 'all' | 'batida' | 'naobatida' | 'acima' | 'abaixo';
  const DEFAULT_FILTERS = {
    seller: 'all' as string,
    status: 'all' as 'all' | GoalStatus,
    performance: 'all' as PerformanceFilter,
  };
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const filtersActive =
    filters.seller !== 'all' ||
    filters.status !== 'all' ||
    filters.performance !== 'all' ||
    sellerView.year !== CURRENT_YEAR ||
    sellerView.monthIndex !== new Date().getMonth();

  const applyPerformance = (meta: number, realizado: number) => {
    const pct = meta > 0 ? (realizado / meta) * 100 : 0;
    if (filters.performance === 'all') return true;
    if (meta <= 0) return false;
    if (filters.performance === 'batida') return pct >= 100;
    if (filters.performance === 'naobatida') return pct < 100;
    if (filters.performance === 'acima') return pct > 100;
    if (filters.performance === 'abaixo') return pct < 100;
    return true;
  };

  const sellerGoalsOfMonth = useMemo(
    () => sellerGoals.filter((s) => {
      if (s.monthIndex !== sellerView.monthIndex) return false;
      if (s.year !== sellerView.year) return false;
      if (filters.seller !== 'all' && s.seller !== filters.seller) return false;
      if (filters.status !== 'all' && s.status !== filters.status) return false;
      if (!applyPerformance(s.meta, s.realizado)) return false;
      return true;
    }),
    [sellerGoals, sellerView, filters],
  );

  const somaMetasIndividuais = sellerGoalsOfMonth.reduce((a, s) => a + s.meta, 0);
  const somaRealizadoIndividual = sellerGoalsOfMonth.reduce((a, s) => a + s.realizado, 0);
  const metaGeralDoMes =
    goals.find(
      (g) => g.monthIndex === sellerView.monthIndex && g.year === sellerView.year,
    )?.meta ?? 0;
  const diffMetas = somaMetasIndividuais - metaGeralDoMes;

  const sellersForDashboard = sellerGoals
    .filter((s) => s.year === sellerView.year && s.monthIndex === sellerView.monthIndex)
    .map((s) => ({ nome: s.seller, meta: s.meta, realizado: s.realizado }));
  const ranking = [...sellersForDashboard].sort((a, b) => b.realizado - a.realizado);
  const melhor = ranking[0];
  const batidas = sellersForDashboard.filter((s) => s.realizado >= s.meta).length;
  const naoBatidas = sellersForDashboard.filter((s) => s.realizado < s.meta);
  const maisProximo = naoBatidas.length
    ? naoBatidas.sort((a, b) => b.realizado / b.meta - a.realizado / a.meta)[0]
    : null;

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSellerView({ monthIndex: new Date().getMonth(), year: CURRENT_YEAR });
  };

  // Série mensal filtrada (ano + status/performance) para a tabela mensal
  const filteredMonthlySeries = useMemo(() => {
    return MONTH_LABELS.map((label, i) => {
      const g = goals.find((x) => x.year === sellerView.year && x.monthIndex === i);
      return {
        mes: label,
        meta: g?.meta ?? 0,
        realizado: g?.realizado ?? 0,
        status: g?.status ?? ('rascunho' as GoalStatus),
        hasGoal: !!g,
      };
    }).filter((m) => {
      if (filters.status !== 'all' && m.hasGoal && m.status !== filters.status) return false;
      if (filters.status !== 'all' && !m.hasGoal) return false;
      if (!applyPerformance(m.meta, m.realizado)) return false;
      return true;
    });
  }, [goals, sellerView.year, filters]);



  const handleSaveSellerGoal = async () => {
    const meta = parseBRL(sellerForm.metaText);
    const realizado = sellerForm.realizadoText.trim()
      ? parseBRL(sellerForm.realizadoText)
      : 0;
    if (!Number.isFinite(meta) || meta <= 0) {
      toast.error('Informe uma meta individual válida.');
      return;
    }
    if (!Number.isFinite(realizado) || realizado < 0) {
      toast.error('Resultado individual inválido.');
      return;
    }
    if (sellerForm.year < 2000 || sellerForm.year > 2100) {
      toast.error('Ano inválido.');
      return;
    }
    const seller = users.find((u) => u.id === sellerForm.seller);
    if (!seller) {
      toast.error('Selecione um vendedor válido.');
      return;
    }
    const duplicate = sellerGoals.some(
      (g) =>
        g.monthIndex === sellerForm.monthIndex &&
        g.year === sellerForm.year &&
        g.seller === seller.full_name,
    );
    if (duplicate) {
      toast.error('Esse vendedor já tem meta para esse mês.');
      return;
    }
    const parentGoal = goals.find(
      (g) => g.monthIndex === sellerForm.monthIndex && g.year === sellerForm.year,
    );
    const { error } = await supabase.from('seller_monthly_goals').insert({
      strategic_goal_id: parentGoal?.id ?? null,
      seller_id: seller.id,
      seller_name: seller.full_name,
      month: sellerForm.monthIndex + 1,
      year: sellerForm.year,
      individual_goal_amount: meta,
      individual_result_amount: realizado,
      notes: sellerForm.observacoes.trim().slice(0, 500) || null,
      status: sellerForm.status,
    });
    if (error) {
      toast.error('Erro ao salvar meta do vendedor: ' + error.message);
      return;
    }
    await supabase.from('notifications').insert({
      user_id: seller.id,
      title: 'Nova meta atribuída a você',
      description: `Meta de ${MONTH_NAMES[sellerForm.monthIndex]}/${sellerForm.year}: ${BRL(meta)}.`,
      type: 'goal',
      link: '/dashboard',
    });
    await refreshAll();
    setSellerView({ monthIndex: sellerForm.monthIndex, year: sellerForm.year });
    toast.success(`Meta de ${seller.full_name} cadastrada.`);
    setSellerDialogOpen(false);
    setSellerForm((f) => ({ ...f, metaText: '', realizadoText: '', observacoes: '' }));
  };

  const sellerRanking = [...sellerGoalsOfMonth].sort((a, b) => {
    const pa = a.meta > 0 ? a.realizado / a.meta : 0;
    const pb = b.meta > 0 ? b.realizado / b.meta : 0;
    return pb - pa;
  });

  // ---- Exportação ----
  const statusLabel = (s: GoalStatus) =>
    s === 'ativa' ? 'Ativa' : s === 'encerrada' ? 'Encerrada' : 'Rascunho';

  const csvCell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const toCsv = (rows: (string | number)[][]) =>
    rows.map((r) => r.map(csvCell).join(';')).join('\n');

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const monthlyRows = () => {
    const header = ['Mês', 'Ano', 'Meta geral', 'Resultado geral', '% atingimento', 'Gap', 'Status', 'Observações'];
    const body = filteredMonthlySeries.map((m) => {
      const idx = MONTH_LABELS.indexOf(m.mes);
      const g = goals.find((x) => x.year === sellerView.year && x.monthIndex === idx);
      const pct = m.meta > 0 ? (m.realizado / m.meta) * 100 : 0;
      const gap = m.meta - m.realizado;
      return [
        MONTH_NAMES[idx] ?? m.mes,
        sellerView.year,
        m.meta,
        m.realizado,
        `${pct.toFixed(1)}%`,
        gap,
        statusLabel(m.status),
        g?.observacoes ?? '',
      ];
    });
    return [header, ...body];
  };

  const sellerRows = () => {
    const header = [
      'Mês', 'Ano', 'Vendedor', 'Meta individual', 'Resultado individual',
      '% atingimento', 'Gap', 'Status', 'Meta geral do mês', 'Resultado geral do mês', 'Observações',
    ];
    const general = goals.find(
      (g) => g.year === sellerView.year && g.monthIndex === sellerView.monthIndex,
    );
    const body = sellerGoalsOfMonth.map((s) => {
      const pct = s.meta > 0 ? (s.realizado / s.meta) * 100 : 0;
      return [
        MONTH_NAMES[s.monthIndex],
        s.year,
        s.seller,
        s.meta,
        s.realizado,
        `${pct.toFixed(1)}%`,
        s.meta - s.realizado,
        statusLabel(s.status),
        general?.meta ?? 0,
        general?.realizado ?? 0,
        s.observacoes ?? '',
      ];
    });
    return [header, ...body];
  };

  const comparativoRows = () => {
    const header = ['Mês', 'Ano', 'Meta geral', 'Realizado geral', 'Soma metas individuais', 'Soma realizado individual', 'Diferença meta', 'Diferença realizado'];
    const body = filteredMonthlySeries.map((m) => {
      const idx = MONTH_LABELS.indexOf(m.mes);
      const sellersOfM = sellerGoals.filter(
        (s) => s.year === sellerView.year && s.monthIndex === idx,
      );
      const sm = sellersOfM.reduce((a, s) => a + s.meta, 0);
      const sr = sellersOfM.reduce((a, s) => a + s.realizado, 0);
      return [
        MONTH_NAMES[idx] ?? m.mes,
        sellerView.year,
        m.meta,
        m.realizado,
        sm,
        sr,
        sm - m.meta,
        sr - m.realizado,
      ];
    });
    return [header, ...body];
  };

  const rankingRows = () => {
    const header = ['Posição', 'Vendedor', 'Mês', 'Ano', 'Meta', 'Realizado', '% atingimento', 'Gap', 'Status'];
    const body = sellerRanking.map((s, i) => {
      const pct = s.meta > 0 ? (s.realizado / s.meta) * 100 : 0;
      return [
        i + 1,
        s.seller,
        MONTH_NAMES[s.monthIndex],
        s.year,
        s.meta,
        s.realizado,
        `${pct.toFixed(1)}%`,
        s.meta - s.realizado,
        statusLabel(s.status),
      ];
    });
    return [header, ...body];
  };

  const stamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  };

  const exportMonthly = () => {
    const rows = monthlyRows();
    if (rows.length <= 1) { toast.error('Sem dados para exportar.'); return; }
    downloadFile(`metas-mensais_${sellerView.year}_${stamp()}.csv`, toCsv(rows), 'text/csv');
    toast.success('Metas mensais exportadas.');
  };
  const exportSellers = () => {
    const rows = sellerRows();
    if (rows.length <= 1) { toast.error('Sem dados para exportar.'); return; }
    downloadFile(`metas-vendedores_${sellerView.year}-${String(sellerView.monthIndex + 1).padStart(2, '0')}_${stamp()}.csv`, toCsv(rows), 'text/csv');
    toast.success('Metas por vendedor exportadas.');
  };
  const exportComparativo = () => {
    const rows = comparativoRows();
    if (rows.length <= 1) { toast.error('Sem dados para exportar.'); return; }
    downloadFile(`comparativo_${sellerView.year}_${stamp()}.csv`, toCsv(rows), 'text/csv');
    toast.success('Comparativo exportado.');
  };
  const exportRanking = () => {
    const rows = rankingRows();
    if (rows.length <= 1) { toast.error('Sem dados para exportar.'); return; }
    downloadFile(`ranking_${sellerView.year}-${String(sellerView.monthIndex + 1).padStart(2, '0')}_${stamp()}.csv`, toCsv(rows), 'text/csv');
    toast.success('Ranking exportado.');
  };

  const xmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const exportFullXlsx = () => {
    // Gera um Excel 2003 XML (SpreadsheetML) — abre no Excel/LibreOffice, sem dependências.
    const sheets: { name: string; rows: (string | number)[][] }[] = [
      { name: 'Metas mensais', rows: monthlyRows() },
      { name: 'Metas por vendedor', rows: sellerRows() },
      { name: 'Comparativo', rows: comparativoRows() },
      { name: 'Ranking', rows: rankingRows() },
    ];
    const sheetXml = sheets.map((sh) => {
      const rowsXml = sh.rows.map((r) => {
        const cells = r.map((v) => {
          const isNum = typeof v === 'number' && Number.isFinite(v);
          return isNum
            ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
            : `<Cell><Data ss:Type="String">${xmlEscape(String(v ?? ''))}</Data></Cell>`;
        }).join('');
        return `<Row>${cells}</Row>`;
      }).join('');
      return `<Worksheet ss:Name="${xmlEscape(sh.name).slice(0, 31)}"><Table>${rowsXml}</Table></Worksheet>`;
    }).join('');
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${sheetXml}
</Workbook>`;
    downloadFile(`metas-estrategicas_${stamp()}.xls`, xml, 'application/vnd.ms-excel');
    toast.success('Planilha exportada.');
  };

  // ---- Lançamento de resultados ----
  type ResultTarget =
    | { kind: 'general'; monthIndex: number; year: number; current: number }
    | { kind: 'seller'; sellerGoalId: string; sellerName: string; current: number };

  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultTarget, setResultTarget] = useState<ResultTarget | null>(null);
  const [resultForm, setResultForm] = useState({
    valorText: '',
    data: new Date().toISOString().slice(0, 10),
    origem: '',
    observacoes: '',
  });

  const openGeneralResult = (monthIndex: number, year: number) => {
    const g = goals.find((x) => x.monthIndex === monthIndex && x.year === year);
    setResultTarget({ kind: 'general', monthIndex, year, current: g?.realizado ?? 0 });
    setResultForm({
      valorText: g?.realizado ? String(g.realizado).replace('.', ',') : '',
      data: new Date().toISOString().slice(0, 10),
      origem: '',
      observacoes: '',
    });
    setResultDialogOpen(true);
  };

  const openSellerResult = (sg: SellerGoal) => {
    setResultTarget({
      kind: 'seller',
      sellerGoalId: sg.id,
      sellerName: sg.seller,
      current: sg.realizado,
    });
    setResultForm({
      valorText: sg.realizado ? String(sg.realizado).replace('.', ',') : '',
      data: new Date().toISOString().slice(0, 10),
      origem: '',
      observacoes: '',
    });
    setResultDialogOpen(true);
  };

  const handleSaveResult = async () => {
    if (!resultTarget) return;
    const valor = parseBRL(resultForm.valorText);
    if (!Number.isFinite(valor) || valor < 0) {
      toast.error('Informe um valor de resultado válido.');
      return;
    }
    const notes = resultForm.observacoes.trim().slice(0, 500) || null;
    if (resultTarget.kind === 'general') {
      const { monthIndex, year } = resultTarget;
      const existing = goals.find((g) => g.monthIndex === monthIndex && g.year === year);
      let error: { message: string } | null = null;
      if (existing) {
        const payload = notes
          ? { general_result_amount: valor, notes }
          : { general_result_amount: valor };
        ({ error } = await supabase.from('strategic_sales_goals')
          .update(payload).eq('id', existing.id));
      } else {
        ({ error } = await supabase.from('strategic_sales_goals').insert({
          month: monthIndex + 1, year,
          general_goal_amount: 0, general_result_amount: valor,
          notes, status: 'ativa',
        }));
      }
      if (error) { toast.error('Erro ao salvar resultado: ' + error.message); return; }
      await refreshAll();
      toast.success(`Resultado geral de ${MONTH_NAMES[monthIndex]}/${year} atualizado.`);
    } else {
      const id = resultTarget.sellerGoalId;
      const payload = notes
        ? { individual_result_amount: valor, notes }
        : { individual_result_amount: valor };
      const { error } = await supabase.from('seller_monthly_goals')
        .update(payload).eq('id', id);
      if (error) { toast.error('Erro ao salvar resultado: ' + error.message); return; }
      await refreshAll();
      toast.success(`Resultado de ${resultTarget.sellerName} atualizado.`);
    }
    setResultDialogOpen(false);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Metas Estratégicas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dashboard comercial — visão de metas, resultados e performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
            Dados simulados
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="mr-1 h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Exportar (respeita filtros)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportMonthly()}>
                Metas gerais mês a mês (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportSellers()}>
                Metas por vendedor (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportComparativo()}>
                Comparativo meta x realizado (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportRanking()}>
                Ranking de vendedores (CSV)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportFullXlsx()}>
                Exportar tudo (XLSX)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar Meta Geral
          </Button>
        </div>
      </div>

      {/* Dialog cadastro de meta geral */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Meta Geral</DialogTitle>
            <DialogDescription>
              Defina a meta comercial geral da SOMUS para um mês específico.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="meta-mes">Mês</Label>
                <Select
                  value={String(form.monthIndex)}
                  onValueChange={(v) => setForm((f) => ({ ...f, monthIndex: Number(v) }))}
                >
                  <SelectTrigger id="meta-mes"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((n, i) => (
                      <SelectItem key={n} value={String(i)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meta-ano">Ano</Label>
                <Input
                  id="meta-ano"
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meta-valor">Valor da meta (R$)</Label>
              <Input
                id="meta-valor"
                inputMode="decimal"
                placeholder="Ex.: 150.000,00"
                value={form.metaText}
                maxLength={20}
                onChange={(e) => setForm((f) => ({ ...f, metaText: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="meta-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as GoalStatus }))}
                >
                  <SelectTrigger id="meta-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="encerrada">Encerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meta-resp">Responsável</Label>
                <Select
                  value={form.responsavel}
                  onValueChange={(v) => setForm((f) => ({ ...f, responsavel: v }))}
                >
                  <SelectTrigger id="meta-resp"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meta-obs">Observações estratégicas</Label>
              <Textarea
                id="meta-obs"
                rows={3}
                maxLength={500}
                placeholder="Contexto, foco do mês, premissas..."
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar meta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Frase motivacional */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Quote className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">
                Meta não é pressão. É direção.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {QUOTES[safeIdx % QUOTES.length]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="border-border/70">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Ano</Label>
            <Input
              type="number"
              className="w-24"
              value={sellerView.year}
              onChange={(e) => setSellerView((s) => ({ ...s, year: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mês</Label>
            <Select
              value={String(sellerView.monthIndex)}
              onValueChange={(v) => setSellerView((s) => ({ ...s, monthIndex: Number(v) }))}
            >
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((n, i) => (
                  <SelectItem key={n} value={String(i)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vendedor</Label>
            <Select
              value={filters.seller}
              onValueChange={(v) => setFilters((f) => ({ ...f, seller: v }))}
            >
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.full_name}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v as 'all' | GoalStatus }))}
            >
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="encerrada">Encerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Performance</Label>
            <Select
              value={filters.performance}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, performance: v as PerformanceFilter }))
              }
            >
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="batida">Meta batida (≥ 100%)</SelectItem>
                <SelectItem value="naobatida">Meta não batida (&lt; 100%)</SelectItem>
                <SelectItem value="acima">Acima de 100%</SelectItem>
                <SelectItem value="abaixo">Abaixo de 100%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={!filtersActive}
          >
            Limpar filtros
          </Button>
        </CardContent>
      </Card>



      {/* KPIs do mês */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Meta do mês" value={BRL(metaMes)} icon={Target} />
        <MetricCard label="Realizado do mês" value={BRL(realizadoMes)} icon={TrendingUp} />
        <MetricCard
          label="Atingimento do mês"
          value={`${pctMes}%`}
          hint={gapMes > 0 ? `Faltam ${BRL(gapMes)}` : `Superou em ${BRL(-gapMes)}`}
          icon={Gauge}
        />
        <MetricCard
          label="Gap para meta"
          value={gapMes > 0 ? BRL(gapMes) : 'Meta batida'}
          icon={Flag}
        />
      </div>

      {/* Progresso da meta geral */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Progresso da meta geral — mês atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {BRL(realizadoMes)} de {BRL(metaMes)}
            </span>
            <span className="font-semibold">{pctMes}%</span>
          </div>
          <Progress value={Math.min(pctMes, 100)} className="h-3" />
        </CardContent>
      </Card>

      {/* Acumulado do ano */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Meta acumulada do ano" value={BRL(metaAno)} icon={Target} />
        <MetricCard label="Realizado acumulado" value={BRL(realizadoAno)} icon={TrendingUp} />
        <MetricCard label="Atingimento anual" value={`${pctAno}%`} icon={Gauge} />
      </div>

      {/* Gráfico mês a mês */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Meta vs. Realizado — mês a mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => BRL(v)}
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realizado" name="Realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Destaques comerciais — derivados das metas por vendedor do mês selecionado */}
      {(() => {
        const list = sellerGoalsOfMonth;
        const valid = list.filter((s) => s.meta > 0);
        const melhorV = [...list].sort((a, b) => b.realizado - a.realizado)[0];
        const maiorGap = [...valid]
          .map((s) => ({ ...s, gap: s.meta - s.realizado }))
          .sort((a, b) => b.gap - a.gap)[0];
        const proximo = [...valid]
          .filter((s) => s.realizado < s.meta)
          .sort((a, b) => b.realizado / b.meta - a.realizado / a.meta)[0];
        const batidasV = valid.filter((s) => s.realizado >= s.meta).length;
        const abaixoV = valid.filter((s) => s.realizado < s.meta).length;
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label="Melhor vendedor"
              value={melhorV?.seller ?? '—'}
              hint={melhorV ? BRL(melhorV.realizado) : 'Sem dados'}
              icon={Trophy}
            />
            <MetricCard
              label="Maior gap"
              value={maiorGap && maiorGap.gap > 0 ? maiorGap.seller : '—'}
              hint={maiorGap && maiorGap.gap > 0 ? BRL(maiorGap.gap) : 'Sem gaps'}
              icon={Flag}
            />
            <MetricCard
              label="Mais próximo da meta"
              value={proximo?.seller ?? 'Todos bateram'}
              hint={
                proximo
                  ? `${Math.round((proximo.realizado / proximo.meta) * 100)}% atingido`
                  : '100%+'
              }
              icon={Gauge}
            />
            <MetricCard
              label="Bateram a meta"
              value={`${batidasV} / ${valid.length || 0}`}
              icon={Users}
            />
            <MetricCard
              label="Abaixo da meta"
              value={`${abaixoV} / ${valid.length || 0}`}
              icon={TrendingUp}
            />
          </div>
        );
      })()}


      {/* Ranking de vendedores */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Ranking de vendedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ranking.map((s, i) => {
              const pct = Math.round((s.realizado / s.meta) * 100);
              const bateu = s.realizado >= s.meta;
              return (
                <div key={s.nome} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="font-medium">{s.nome}</span>
                      {bateu && (
                        <Badge variant="secondary" className="text-[10px]">
                          Meta batida
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{pct}%</div>
                      <div className="text-xs text-muted-foreground">
                        {BRL(s.realizado)} / {BRL(s.meta)}
                      </div>
                    </div>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance por vendedor (gráfico) */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Performance por vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sellersForDashboard}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="nome" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => BRL(v)}
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realizado" name="Realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Metas por vendedor */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">
              Metas por vendedor
            </h3>
            <p className="text-sm text-muted-foreground">
              Distribuição da meta geral entre os vendedores do mês.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Mês</Label>
              <Select
                value={String(sellerView.monthIndex)}
                onValueChange={(v) =>
                  setSellerView((s) => ({ ...s, monthIndex: Number(v) }))
                }
              >
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((n, i) => (
                    <SelectItem key={n} value={String(i)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ano</Label>
              <Input
                type="number"
                className="w-24"
                value={sellerView.year}
                onChange={(e) =>
                  setSellerView((s) => ({ ...s, year: Number(e.target.value) }))
                }
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSellerForm((f) => ({
                  ...f,
                  monthIndex: sellerView.monthIndex,
                  year: sellerView.year,
                }));
                setSellerDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Adicionar meta de vendedor
            </Button>
          </div>
        </div>

        {/* Cards comparativos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="Meta geral do mês" value={BRL(metaGeralDoMes)} icon={Target} />
          <MetricCard
            label="Soma das metas individuais"
            value={BRL(somaMetasIndividuais)}
            hint={`${sellerGoalsOfMonth.length} vendedor(es)`}
            icon={Users}
          />
          <MetricCard
            label="Diferença (individuais − geral)"
            value={diffMetas === 0 ? 'Equilibrada' : (diffMetas > 0 ? `+${BRL(diffMetas)}` : BRL(diffMetas))}
            hint={
              metaGeralDoMes === 0
                ? 'Cadastre a meta geral'
                : diffMetas === 0
                  ? 'Soma = meta geral'
                  : diffMetas > 0
                    ? 'Soma maior que a meta geral'
                    : 'Soma menor que a meta geral'
            }
            icon={Flag}
          />
        </div>

        {/* Tabela de vendedores */}
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Tabela de vendedores — {MONTH_NAMES[sellerView.monthIndex]}/{sellerView.year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sellerGoalsOfMonth.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma meta cadastrada para esse mês.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Vendedor</th>
                      <th className="py-2 pr-3 font-medium">Meta</th>
                      <th className="py-2 pr-3 font-medium">Realizado</th>
                      <th className="py-2 pr-3 font-medium">Atingimento</th>
                      <th className="py-2 pr-3 font-medium">Gap</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Observações</th>
                      <th className="py-2 pr-3 font-medium text-right">Ações</th>

                    </tr>
                  </thead>
                  <tbody>
                    {sellerGoalsOfMonth.map((s) => {
                      const pct = s.meta > 0 ? (s.realizado / s.meta) * 100 : 0;
                      const gap = s.meta - s.realizado;
                      let status: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; cls?: string };
                      if (s.realizado === 0) {
                        status = { label: 'Não iniciada', variant: 'outline' };
                      } else if (pct >= 110) {
                        status = { label: 'Superada', variant: 'default', cls: 'bg-emerald-600 hover:bg-emerald-600 text-white' };
                      } else if (pct >= 100) {
                        status = { label: 'Batida', variant: 'default' };
                      } else {
                        status = { label: 'Em andamento', variant: 'secondary' };
                      }
                      return (
                        <tr key={s.id} className="border-b border-border/60 last:border-0">
                          <td className="py-2 pr-3 font-medium">{s.seller}</td>
                          <td className="py-2 pr-3">{BRL(s.meta)}</td>
                          <td className="py-2 pr-3">{BRL(s.realizado)}</td>
                          <td className="py-2 pr-3 font-semibold">{Math.round(pct)}%</td>
                          <td className="py-2 pr-3">
                            {gap > 0 ? (
                              <span className="text-destructive">{BRL(gap)}</span>
                            ) : (
                              <span className="text-emerald-600">+{BRL(-gap)}</span>
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant={status.variant} className={status.cls}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">
                            {s.observacoes || '—'}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <button
                              type="button"
                              className="text-xs font-medium text-primary hover:underline"
                              onClick={() => openSellerResult(s)}
                            >
                              Lançar resultado
                            </button>
                          </td>
                        </tr>

                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ranking individual por atingimento */}
        {sellerGoalsOfMonth.length > 0 && (
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Ranking por atingimento — {MONTH_NAMES[sellerView.monthIndex]}/{sellerView.year}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sellerRanking.map((s, i) => {
                const pct = s.meta > 0 ? Math.round((s.realizado / s.meta) * 100) : 0;
                return (
                  <div key={s.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {i + 1}
                        </span>
                        <span className="font-medium">{s.seller}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{pct}%</div>
                        <div className="text-xs text-muted-foreground">
                          {BRL(s.realizado)} / {BRL(s.meta)}
                        </div>
                      </div>
                    </div>
                    <Progress value={Math.min(pct, 100)} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog: cadastrar meta por vendedor */}
      <Dialog open={sellerDialogOpen} onOpenChange={setSellerDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar meta por vendedor</DialogTitle>
            <DialogDescription>
              Defina meta individual e (opcional) resultado parcial.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mês</Label>
                <Select
                  value={String(sellerForm.monthIndex)}
                  onValueChange={(v) => setSellerForm((f) => ({ ...f, monthIndex: Number(v) }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((n, i) => (
                      <SelectItem key={n} value={String(i)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={sellerForm.year}
                  onChange={(e) => setSellerForm((f) => ({ ...f, year: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Vendedor</Label>
              <Select
                value={sellerForm.seller}
                onValueChange={(v) => setSellerForm((f) => ({ ...f, seller: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Meta individual (R$)</Label>
                <Input
                  inputMode="decimal"
                  placeholder="Ex.: 50.000,00"
                  maxLength={20}
                  value={sellerForm.metaText}
                  onChange={(e) => setSellerForm((f) => ({ ...f, metaText: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Resultado individual (R$)</Label>
                <Input
                  inputMode="decimal"
                  placeholder="Opcional"
                  maxLength={20}
                  value={sellerForm.realizadoText}
                  onChange={(e) => setSellerForm((f) => ({ ...f, realizadoText: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={sellerForm.status}
                onValueChange={(v) => setSellerForm((f) => ({ ...f, status: v as GoalStatus }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="encerrada">Encerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                maxLength={500}
                value={sellerForm.observacoes}
                onChange={(e) => setSellerForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellerDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSellerGoal}>Salvar meta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabela de metas mês a mês */}

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Tabela de metas mês a mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Mês</th>
                  <th className="py-2 pr-3 font-medium">Ano</th>
                  <th className="py-2 pr-3 font-medium">Meta geral</th>
                  <th className="py-2 pr-3 font-medium">Resultado</th>
                  <th className="py-2 pr-3 font-medium">Atingimento</th>
                  <th className="py-2 pr-3 font-medium">Gap</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthlySeries.map((m) => {
                  const monthIdx = MONTH_LABELS.indexOf(m.mes);
                  const pct = m.meta > 0 ? (m.realizado / m.meta) * 100 : 0;
                  const gap = m.meta - m.realizado;
                  const nowIdx = new Date().getMonth();
                  let status: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; cls?: string };
                  if (m.meta === 0) {
                    status = { label: 'Não iniciada', variant: 'outline' };
                  } else if (m.realizado === 0) {
                    status = { label: 'Não iniciada', variant: 'outline' };
                  } else if (pct >= 110) {
                    status = { label: 'Superada', variant: 'default', cls: 'bg-emerald-600 hover:bg-emerald-600 text-white' };
                  } else if (pct >= 100) {
                    status = { label: 'Batida', variant: 'default' };
                  } else if (monthIdx >= nowIdx && sellerView.year >= CURRENT_YEAR) {
                    status = { label: 'Em andamento', variant: 'secondary' };
                  } else {
                    status = { label: 'Não batida', variant: 'destructive' };
                  }
                  return (
                    <tr key={m.mes} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-medium">{m.mes}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{sellerView.year}</td>
                      <td className="py-2 pr-3">{BRL(m.meta)}</td>
                      <td className="py-2 pr-3">{BRL(m.realizado)}</td>
                      <td className="py-2 pr-3 font-semibold">{Math.round(pct)}%</td>
                      <td className="py-2 pr-3">
                        {m.meta === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : gap > 0 ? (
                          <span className="text-destructive">{BRL(gap)}</span>
                        ) : (
                          <span className="text-emerald-600">+{BRL(-gap)}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={status.variant} className={status.cls}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => openGeneralResult(monthIdx, sellerView.year)}
                        >
                          Lançar resultado
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredMonthlySeries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum mês corresponde aos filtros.
                    </td>
                  </tr>
                )}


              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: lançar resultado */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {resultTarget?.kind === 'seller'
                ? `Lançar resultado — ${resultTarget.sellerName}`
                : resultTarget?.kind === 'general'
                  ? `Lançar resultado geral — ${MONTH_NAMES[resultTarget.monthIndex]}/${resultTarget.year}`
                  : 'Lançar resultado'}
            </DialogTitle>
            <DialogDescription>
              O percentual de atingimento, gap, status e ranking serão recalculados automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  inputMode="decimal"
                  placeholder="Ex.: 120.000,00"
                  maxLength={20}
                  value={resultForm.valorText}
                  onChange={(e) => setResultForm((f) => ({ ...f, valorText: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data do lançamento</Label>
                <Input
                  type="date"
                  value={resultForm.data}
                  onChange={(e) => setResultForm((f) => ({ ...f, data: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Origem do resultado</Label>
              <Input
                placeholder="Ex.: CRM, planilha, fechamento manual..."
                maxLength={100}
                value={resultForm.origem}
                onChange={(e) => setResultForm((f) => ({ ...f, origem: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                maxLength={500}
                value={resultForm.observacoes}
                onChange={(e) => setResultForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
            {resultTarget && (
              <p className="text-xs text-muted-foreground">
                Valor atual: <span className="font-medium">{BRL(resultTarget.current)}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveResult}>Salvar resultado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}

