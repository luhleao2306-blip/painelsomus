
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, Send, CheckCircle2, User, Mail, Phone, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  DISC_QUESTIONS_RAW,
  getDeterministicShuffle,
  type DISCValue
} from '@/lib/disc-data';
import somusLogo from '@/assets/somus-logo.png';

export const Route = createFileRoute('/disc')({
  component: DiscTestPage,
  head: () => ({
    title: 'Teste DISC | Somus Group',
    meta: [
      { name: 'description', content: 'Descubra seu perfil comportamental com o teste DISC da Somus.' }
    ]
  })
});

const SERIF_STACK = "'Instrument Serif', 'Times New Roman', serif";

function DiscTestPage() {
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<DISCValue[]>([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Lead state
  const [lead, setLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  const questions = useMemo(() => {
    return DISC_QUESTIONS_RAW.map((q, idx) => {
      const options = [
        { type: 'D' as DISCValue, text: q.options.D },
        { type: 'I' as DISCValue, text: q.options.I },
        { type: 'S' as DISCValue, text: q.options.S },
        { type: 'C' as DISCValue, text: q.options.C },
      ];
      return {
        ...q,
        options: getDeterministicShuffle(options, idx)
      };
    });
  }, []);

  const progress = ((currentIdx) / questions.length) * 100;

  const handleSelect = (type: DISCValue) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = type;
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setShowLeadForm(true);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.name || !lead.email) {
      toast.error('Por favor, preencha nome e e-mail.');
      return;
    }

    setSubmitting(true);
    
    try {
      // Calculate results
      const counts = { D: 0, I: 0, S: 0, C: 0 };
      answers.forEach(a => counts[a]++);

      const total = answers.length;
      const percentages = {
        D: Math.round((counts.D / total) * 100),
        I: Math.round((counts.I / total) * 100),
        S: Math.round((counts.S / total) * 100),
        C: Math.round((counts.C / total) * 100),
      };

      // Ensure they sum to 100 (handling rounding artifacts)
      const sum = percentages.D + percentages.I + percentages.S + percentages.C;
      if (sum !== 100) {
        const diff = 100 - sum;
        // Add diff to the largest dimension
        const maxDim = (Object.keys(percentages) as DISCValue[]).reduce((a, b) => percentages[a] > percentages[b] ? a : b);
        percentages[maxDim] += diff;
      }

      const result = {
        lead,
        percentages,
        counts,
        timestamp: new Date().toISOString()
      };

      // Persistence
      const existing = JSON.parse(localStorage.getItem('somus-disc-leads') || '[]');
      existing.push(result);
      localStorage.setItem('somus-disc-leads', JSON.stringify(existing));
      
      // Store current result separately for immediate access in /resultado
      localStorage.setItem('somus-disc-current-result', JSON.stringify(result));

      toast.success('Resultado processado com sucesso!');
      
      // Wait a bit for the effect
      setTimeout(() => {
        navigate({ to: '/disc-resultado' });
      }, 800);

    } catch (err) {
      toast.error('Erro ao salvar resultado.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (showLeadForm) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900/50 border border-white/10 p-8 rounded-3xl backdrop-blur-xl"
        >
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
               <img src={somusLogo} alt="Somus" className="h-8 brightness-0 invert" />
            </div>
            <h2 style={{ fontFamily: SERIF_STACK }} className="text-3xl italic">Quase lá!</h2>
            <p className="text-zinc-400 text-sm mt-2">Preencha seus dados para visualizar seu relatório comportamental completo.</p>
          </div>

          <form onSubmit={handleSubmitLead} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-zinc-500">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-zinc-600" />
                <Input 
                  required
                  value={lead.name}
                  onChange={e => setLead({...lead, name: e.target.value})}
                  className="pl-10 bg-black/40 border-white/10 h-11 focus:ring-0 focus:border-white/20" 
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-zinc-500">E-mail Profissional</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-600" />
                <Input 
                  required
                  type="email"
                  value={lead.email}
                  onChange={e => setLead({...lead, email: e.target.value})}
                  className="pl-10 bg-black/40 border-white/10 h-11 focus:ring-0 focus:border-white/20" 
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-zinc-500">Telefone / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-600" />
                <Input 
                  value={lead.phone}
                  onChange={e => setLead({...lead, phone: e.target.value})}
                  className="pl-10 bg-black/40 border-white/10 h-11 focus:ring-0 focus:border-white/20" 
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-zinc-500">Empresa</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-zinc-600" />
                <Input 
                  value={lead.company}
                  onChange={e => setLead({...lead, company: e.target.value})}
                  className="pl-10 bg-black/40 border-white/10 h-11 focus:ring-0 focus:border-white/20" 
                  placeholder="Nome da sua empresa"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full h-12 bg-white text-black hover:bg-zinc-200 mt-4 rounded-full font-bold uppercase tracking-widest text-xs"
            >
              {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : <>Ver meu resultado <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-sm">
        <img src={somusLogo} alt="Somus" className="h-6 brightness-0 invert" />
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Progresso</p>
            <p className="text-xs font-mono">{currentIdx + 1} / {questions.length}</p>
          </div>
          <div className="w-32 hidden sm:block">
            <Progress value={progress} className="h-1 bg-white/10" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <div className="mb-12">
               <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-widest text-zinc-400 mb-4">
                Questão {currentIdx + 1}
              </span>
              <h2 className="text-3xl sm:text-4xl font-medium tracking-tight leading-tight">
                {currentQuestion.text}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentQuestion.options.map((opt, i) => {
                const letter = ['A', 'B', 'C', 'D'][i];
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(opt.type)}
                    className="group relative flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 transition-all text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-sm group-hover:bg-white group-hover:text-black transition-colors">
                      {letter}
                    </div>
                    <span className="text-[15px] sm:text-base leading-snug pr-4">
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-white/5 bg-black/20 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          disabled={currentIdx === 0}
          className="text-zinc-400 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
        </Button>
        
        <div className="sm:hidden text-center flex-1 px-4">
           <Progress value={progress} className="h-1 bg-white/10 w-full" />
           <p className="text-[10px] text-zinc-500 mt-2">{currentIdx + 1} de {questions.length}</p>
        </div>

        <div className="flex items-center gap-2 text-zinc-600 text-[10px] uppercase tracking-widest hidden sm:flex">
          <CheckCircle2 className="h-3 w-3" /> Escolha uma opção para avançar
        </div>
      </footer>
    </div>
  );
}
