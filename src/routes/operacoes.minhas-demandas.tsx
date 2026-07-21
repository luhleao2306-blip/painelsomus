import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  useOpStore, STATUS_META, CARGO_COLOR_MAP, getTaskClientName, type OpTask, opStore,
} from '@/lib/operacoes-store';
import {
  Crown, Megaphone, Brush, Diamond, Bot, Zap, Rocket, Star,
  CalendarClock, CheckCircle2, Clock, AlertTriangle, ArrowLeft, Filter, Search,
  Calendar, CheckCircle, ListChecks, MessageSquare, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProfile } from '@/hooks/use-profile';

export const Route = createFileRoute('/operacoes/minhas-demandas')({
  component: MinhasDemandas,
});

const ICONS = { crown: Crown, megaphone: Megaphone, brush: Brush, diamond: Diamond, bot: Bot, zap: Zap, rocket: Rocket, star: Star };

function MinhasDemandas() {
  const store = useOpStore();
  const { profile } = useProfile();
  const [search, setSearch] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  
  const opUser = useMemo(() => {
    if (!profile) return null;
    const name = profile.full_name?.toLowerCase();
    const email = profile.email?.toLowerCase();
    
    return store.users.find(u => u.name.toLowerCase() === name) || 
           store.users.find(u => email?.includes(u.name.toLowerCase().replace(/\s/g, ''))) ||
           store.users.find(u => u.id.includes(profile.id.slice(0, 4)));
  }, [profile, store.users]);

  const tasks = useMemo(() => {
    if (!opUser) return [];
    return store.tasks
      .filter(t => t.assigneeId === opUser.id)
      .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        // Prioridade alta primeiro, depois por data
        if (a.priority === 'alta' && b.priority !== 'alta') return -1;
        if (a.priority !== 'alta' && b.priority === 'alta') return 1;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [store.tasks, opUser, search]);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  if (!profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="mx-auto max-w-[1200px] px-6 py-8 lg:px-10"
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link 
            to="/operacoes" 
            className="mb-4 inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Painel
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
            <CalendarClock className="h-7 w-7 text-white/80" /> 
            Minhas <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Demandas</span>
          </h1>
          <p className="mt-2 text-[14px] text-zinc-400">
            Foco total no que você precisa entregar.
          </p>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar demandas..." 
                className="h-9 pl-9 text-[12.5px] bg-white/[0.03] border-white/10" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>
           <Button variant="outline" size="sm" className="h-9 gap-2 text-[12px] border-white/10 bg-white/[0.03]">
              <Filter className="h-3.5 w-3.5" /> Filtros
           </Button>
        </div>
      </div>

      {!opUser ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <p className="text-zinc-400">Não foi possível vincular seu perfil às demandas de operações.</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center bg-white/[0.01]">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/50 mb-3" />
          <h3 className="text-lg font-medium text-white">Tudo em dia!</h3>
          <p className="text-zinc-400 text-sm">Você não possui demandas pendentes no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tasks.map(t => {
            const isOverdue = t.dueDate && new Date(t.dueDate) < today;
            const isToday = t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString();
            const meta = STATUS_META[t.status];
            
            return (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-lg ${
                  isOverdue 
                    ? 'border-red-500/20 bg-red-500/[0.02] hover:border-red-500/40' 
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-1 items-center gap-4 min-w-0">
                    <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot} shadow-[0_0_8px_rgba(255,255,255,0.1)]`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                          {getTaskClientName(store, t)}
                        </span>
                        {isOverdue && (
                          <span className="shrink-0 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-red-400">
                            Atrasada
                          </span>
                        )}
                        {isToday && (
                          <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-blue-400">
                            Hoje
                          </span>
                        )}
                      </div>
                      <h3 className="truncate font-medium text-[15px] text-white/90 group-hover:text-white transition-colors">
                        {t.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Prazo</div>
                      <div className={`font-mono text-[12px] font-medium tabular-nums ${isOverdue ? 'text-red-400' : 'text-zinc-300'}`}>
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : '—'}
                      </div>
                    </div>
                    
                    <div className="text-right w-32">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Status</div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${meta.color}`}>
                         {meta.label}
                      </span>
                    </div>

                    <Link 
                      to="/operacoes/projetos" 
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-2 hover:bg-white/[0.08] transition-colors"
                      title="Ver no projeto"
                    >
                       <Clock className="h-4 w-4 text-zinc-400" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
