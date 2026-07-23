import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  useOpStore, STATUS_META, getTaskClientName, getTaskProjectName, type OpTask, opStore,
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
import { parseLocalDate, formatLocalDate } from '@/lib/date-utils';

export const Route = createFileRoute('/operacoes/minhas-demandas')({
  component: MinhasDemandas,
});

function MinhasDemandas() {
  const store = useOpStore();
  const { profile } = useProfile();
  const [search, setSearch] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [manualUserId, setManualUserId] = useState<string | null>(null);
  
  const opUser = useMemo(() => {
    if (!profile) return null;
    const norm = (s?: string | null) =>
      (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const name = norm(profile.full_name);
    const email = norm(profile.email);
    const emailLocal = email.split('@')[0] ?? '';
    const firstName = name.split(/\s+/)[0] ?? '';
    if (!name && !email) return null;

    // 1) full name exact
    let found = store.users.find(u => norm(u.name) === name);
    if (found) return found;
    // 2) first name match (either side)
    found = store.users.find(u => {
      const un = norm(u.name);
      const uf = un.split(/\s+/)[0];
      return uf && firstName && (uf === firstName || un.startsWith(firstName) || name.startsWith(uf));
    });
    if (found) return found;
    // 3) email local-part contains any part of user name
    found = store.users.find(u => {
      const parts = norm(u.name).split(/\s+/).filter(Boolean);
      return parts.some(p => emailLocal.includes(p));
    });
    return found ?? null;
  }, [profile, store.users]);

  const effectiveUser = useMemo(() => {
    if (manualUserId) return store.users.find(u => u.id === manualUserId) ?? null;
    return opUser;
  }, [manualUserId, opUser, store.users]);

  const tasks = useMemo(() => {
    if (!effectiveUser) return [];
    return store.tasks
      .filter(t => t.assigneeId === effectiveUser.id)
      .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.priority === 'alta' && b.priority !== 'alta') return -1;
        if (a.priority !== 'alta' && b.priority === 'alta') return 1;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return parseLocalDate(a.dueDate)!.getTime() - parseLocalDate(b.dueDate)!.getTime();
      });
  }, [store.tasks, effectiveUser, search]);

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

      {/* User picker — always shown, defaults to detected user */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Ver demandas de</span>
        <Select
          value={effectiveUser?.id ?? ''}
          onValueChange={(v) => setManualUserId(v)}
        >
          <SelectTrigger className="h-9 w-64 text-[12.5px] bg-white/[0.03] border-white/10">
            <SelectValue placeholder="Selecione um colaborador..." />
          </SelectTrigger>
          <SelectContent>
            {store.users.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!opUser && !manualUserId && (
          <span className="text-[12px] text-amber-400">Seu perfil não foi vinculado automaticamente — selecione seu nome acima.</span>
        )}
      </div>

      {!effectiveUser ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <p className="text-zinc-400">Selecione um colaborador acima para ver suas demandas.</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center bg-white/[0.01]">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/50 mb-3" />
          <h3 className="text-lg font-medium text-white">Tudo em dia!</h3>
          <p className="text-zinc-400 text-sm">{effectiveUser.name} não possui demandas pendentes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-20">
          {tasks.map(t => {
            const dueLocal = parseLocalDate(t.dueDate);
            const isOverdue = dueLocal && dueLocal < today && t.status !== 'concluido';
            const isToday = dueLocal && dueLocal.toDateString() === today.toDateString();
            const meta = STATUS_META[t.status];
            const isExpanded = expandedTask === t.id;
            const done = t.checklist.filter(c => c.done).length;
            
            return (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  isExpanded ? 'ring-2 ring-white/10 shadow-2xl' : 'hover:shadow-lg'
                } ${
                  isOverdue 
                    ? 'border-red-500/20 bg-red-500/[0.03] hover:border-red-500/40' 
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                {/* Cabeçalho da demanda */}
                <div 
                  onClick={() => setExpandedTask(isExpanded ? null : t.id)}
                  className="cursor-pointer p-5 flex items-center justify-between gap-4"
                >
                  <div className="flex flex-1 items-center gap-5 min-w-0">
                    <div className={`h-3 w-3 shrink-0 rounded-full ${meta.dot} shadow-[0_0_12px_rgba(255,255,255,0.1)]`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                          {getTaskClientName(store, t)}
                        </span>
                        {getTaskProjectName(store, t) && (
                          <span className="shrink-0 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-sky-300">
                            {getTaskProjectName(store, t)}
                          </span>
                        )}
                        {t.priority === 'alta' && (
                          <span className="shrink-0 rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-red-500 font-bold">
                            Prioridade Alta
                          </span>
                        )}
                        {isOverdue && (
                          <span className="shrink-0 rounded-full border border-red-500/20 bg-red-500/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-red-400">
                            Atrasada
                          </span>
                        )}
                        {isToday && (
                          <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-blue-400">
                            Hoje
                          </span>
                        )}
                      </div>
                      <h3 className={`font-medium text-[17px] transition-colors ${t.status === 'concluido' ? 'text-zinc-500 line-through' : 'text-white/90 group-hover:text-white'}`}>
                        {t.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Prazo</div>
                      <div className={`font-mono text-[13px] font-medium tabular-nums ${isOverdue ? 'text-red-400' : 'text-zinc-300'}`}>
                        {t.dueDate ? formatLocalDate(t.dueDate) : '—'}
                      </div>
                    </div>
                    
                    <div className="text-right w-32 hidden sm:block">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Status</div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${meta.color}`}>
                         {meta.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                       {t.checklist.length > 0 && (
                         <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/5 text-[11px] font-mono text-zinc-400">
                           <ListChecks className="h-3.5 w-3.5" />
                           {done}/{t.checklist.length}
                         </div>
                       )}
                       <div className={`p-2 rounded-lg transition-transform ${isExpanded ? 'rotate-180 bg-white/10' : 'bg-transparent text-zinc-500'}`}>
                         <ChevronDown className="h-4 w-4" />
                       </div>
                    </div>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-white/10 bg-white/[0.01]"
                    >
                      <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Coluna Principal: Checklist e Ações */}
                        <div className="md:col-span-8 space-y-6">
                          <div>
                             <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                  <ListChecks className="h-4 w-4" /> Checklist de Entrega
                                </h4>
                             </div>
                             
                             <div className="space-y-2.5">
                                {t.checklist.length === 0 ? (
                                  <p className="text-[13px] italic text-zinc-500">Nenhum item definido.</p>
                                ) : (
                                  t.checklist.map(item => (
                                    <div 
                                      key={item.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        opStore.toggleChecklistItem(t.id, item.id);
                                      }}
                                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                        item.done 
                                          ? 'bg-emerald-500/[0.03] border-emerald-500/20 text-emerald-500/70' 
                                          : 'bg-white/[0.03] border-white/5 text-zinc-300 hover:border-white/10'
                                      }`}
                                    >
                                      <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                                        item.done ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                                      }`}>
                                        {item.done && <CheckCircle className="h-3 w-3 text-white" />}
                                      </div>
                                      <span className={`text-[13.5px] leading-relaxed ${item.done ? 'line-through' : ''}`}>
                                        {item.text}
                                      </span>
                                    </div>
                                  ))
                                )}
                             </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                             <Select 
                               value={t.status} 
                               onValueChange={(v: any) => opStore.updateTask(t.id, { status: v })}
                             >
                               <SelectTrigger className={`h-10 w-48 text-[12px] font-medium border-white/10 ${meta.color}`}>
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 {Object.entries(STATUS_META).map(([key, m]) => (
                                   <SelectItem key={key} value={key}>
                                     <div className="flex items-center gap-2">
                                       <div className={`h-2 w-2 rounded-full ${m.dot}`} />
                                       {m.label}
                                     </div>
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>

                             <Button 
                               variant="outline" 
                               className="h-10 border-white/10 bg-white/[0.03] gap-2 text-[12.5px]"
                               asChild
                             >
                                <Link to="/operacoes/projetos">
                                   <Calendar className="h-4 w-4" /> Ver no Cronograma
                                </Link>
                             </Button>
                          </div>
                        </div>

                        {/* Coluna Lateral: Metadados e Comentários Rápidos */}
                        <div className="md:col-span-4 space-y-6">
                           <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
                              <div>
                                 <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Prioridade</div>
                                 <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${t.priority === 'alta' ? 'bg-red-500' : t.priority === 'media' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                    <span className="text-[13px] capitalize text-zinc-300">{t.priority}</span>
                                 </div>
                              </div>
                              <div>
                                 <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Início</div>
                                 <div className="text-[13px] text-zinc-300">{t.startDate ? formatLocalDate(t.startDate) : '—'}</div>
                              </div>
                              {t.comments && t.comments.length > 0 && (
                                <div>
                                   <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5">
                                      <MessageSquare className="h-3 w-3" /> Últimos Comentários
                                   </div>
                                   <div className="space-y-3">
                                      {t.comments.slice(-2).map(c => (
                                        <div key={c.id} className="text-[12px] leading-relaxed">
                                           <span className="font-bold text-zinc-400">{c.authorName || 'Membro'}:</span>{' '}
                                           <span className="text-zinc-500">{c.text}</span>
                                        </div>
                                      ))}
                                   </div>
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}