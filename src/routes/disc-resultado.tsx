
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  ArrowRight, 
  Share2, 
  MessageSquare, 
  UserCircle, 
  Layout, 
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DISC_PROFILES, 
  type DISCValue, 
  type DISCProfileInfo 
} from '@/lib/disc-data';
import somusLogo from '@/assets/somus-logo.png';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const Route = createFileRoute('/disc-resultado')({
  component: DiscResultPage,
  head: () => ({
    title: 'Meu Perfil DISC | Somus Group',
    meta: [
      { name: 'description', content: 'Confira o resultado detalhado do seu perfil comportamental Somus.' }
    ]
  })
});

const SERIF_STACK = "'Instrument Serif', 'Times New Roman', serif";

const DIMENSION_META = {
  D: { name: 'Dominância', color: '#ef4444', label: 'D' },
  I: { name: 'Influência', color: '#f59e0b', label: 'I' },
  S: { name: 'Estabilidade', color: '#10b981', label: 'S' },
  C: { name: 'Conformidade', color: '#3b82f6', label: 'C' }
};

function DiscResultPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem('somus-disc-current-result');
    if (!raw) {
      navigate({ to: '/disc' });
      return;
    }
    setResult(JSON.parse(raw));
  }, [navigate]);

  const profile = useMemo(() => {
    if (!result) return null;
    const { percentages } = result;
    const sorted = (Object.keys(percentages) as DISCValue[]).sort((a, b) => percentages[b] - percentages[a]);
    const primary = sorted[0];
    const secondary = sorted[1];
    
    // Rule for pure profile: >55% and significant advantage over second
    const isPure = percentages[primary] > 55 && (percentages[primary] - percentages[secondary] > 15);
    const key = isPure ? primary : `${primary}${secondary}`;
    
    return {
      info: DISC_PROFILES[key] || DISC_PROFILES[primary],
      primary,
      secondary: isPure ? null : secondary,
      isPure
    };
  }, [result]);

  const exportPDF = async () => {
    const element = document.getElementById('disc-report');
    if (!element) return;
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#000000'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Relatorio_DISC_${result.lead.name.replace(/\s+/g, '_')}.pdf`);
  };

  if (!result || !profile) return null;

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans">
      <div id="disc-report" className="max-w-5xl mx-auto space-y-8 pb-20">
        
        {/* Header & Main Card */}
        <Card className="relative overflow-hidden border-none bg-zinc-900 shadow-2xl rounded-[2.5rem]">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-emerald-500/5 pointer-events-none" />
          
          <div className="relative p-8 sm:p-12 flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-4">
                 <img src={somusLogo} alt="Somus" className="h-6 brightness-0 invert" />
                 <span className="w-px h-4 bg-white/20" />
                 <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em] border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-3">
                  Seu Relatório
                 </Badge>
              </div>
              
              <div>
                <h1 style={{ fontFamily: SERIF_STACK }} className="text-5xl sm:text-6xl italic leading-tight">
                  Perfil {profile.info.name}
                </h1>
                <div className="flex flex-wrap gap-3 mt-6">
                  <Badge className="bg-white/10 text-white border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DIMENSION_META[profile.primary].color }} />
                    {DIMENSION_META[profile.primary].name} (P)
                  </Badge>
                  {profile.secondary && (
                    <Badge className="bg-white/10 text-white border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DIMENSION_META[profile.secondary].color }} />
                      {DIMENSION_META[profile.secondary].name} (S)
                    </Badge>
                  )}
                </div>
              </div>
              
              <p className="text-zinc-400 text-lg max-w-lg leading-relaxed">
                {profile.info.description}
              </p>
            </div>

            {/* Dimensional Bars */}
            <div className="w-full md:w-80 bg-black/40 p-8 rounded-3xl border border-white/5 backdrop-blur-sm">
              <h3 className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-8 text-center">Gráfico Comportamental</h3>
              <div className="space-y-6">
                {(['D', 'I', 'S', 'C'] as DISCValue[]).map(key => {
                  const meta = DIMENSION_META[key];
                  const value = result.percentages[key];
                  const isPrimary = key === profile.primary;
                  const isSecondary = key === profile.secondary;
                  
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                          <div 
                            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{ backgroundColor: meta.color, color: '#000' }}
                          >
                            {meta.label}
                          </div>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-300">{meta.name}</span>
                          {(isPrimary || isSecondary) && (
                            <Badge className="h-4 text-[8px] bg-white/10 border-white/10 text-white px-1">
                              {isPrimary ? 'PRINCIPAL' : 'SECUNDÁRIA'}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xl font-mono font-bold">{value}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${value}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Executive Summary & Details */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-zinc-900/50 border-white/5 p-8 rounded-3xl space-y-6">
            <h3 className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-xs">
              <CheckCircle2 className="h-4 w-4" /> Pontos Fortes
            </h3>
            <ul className="grid grid-cols-1 gap-3">
              {profile.info.strengths.map((s, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {s}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="bg-zinc-900/50 border-white/5 p-8 rounded-3xl space-y-6">
            <h3 className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-widest text-xs">
              <AlertCircle className="h-4 w-4" /> Desafios
            </h3>
            <ul className="grid grid-cols-1 gap-3">
              {profile.info.challenges.map((s, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Behavioral Style Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard 
            icon={MessageSquare}
            label="Comunicação"
            text={profile.info.communication}
          />
          <InfoCard 
            icon={UserCircle}
            label="Liderança"
            text={profile.info.leadership}
          />
          <InfoCard 
            icon={Layout}
            label="Ambiente Ideal"
            text={profile.info.idealEnvironment}
          />
          <InfoCard 
            icon={Zap}
            label="Motivadores"
            text={profile.info.motivation}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 no-print">
          <Button 
            onClick={exportPDF}
            className="h-12 px-8 rounded-full bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-widest text-xs"
          >
            <Download className="mr-2 h-4 w-4" /> Baixar Relatório PDF
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.print()}
            className="h-12 px-8 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold uppercase tracking-widest text-xs"
          >
            <Share2 className="mr-2 h-4 w-4" /> Compartilhar Resultado
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, text }: { icon: any, label: string, text: string }) {
  return (
    <Card className="bg-zinc-900 border-white/5 p-6 rounded-2xl hover:bg-zinc-800/50 transition-colors h-full flex flex-col items-center text-center">
      <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-emerald-500" />
      </div>
      <h4 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2 font-bold">{label}</h4>
      <p className="text-sm text-zinc-200 leading-relaxed italic">{text}</p>
    </Card>
  );
}
