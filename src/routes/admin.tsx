
import { createFileRoute } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Mail, Phone, Building2, Calendar, FileText, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin')({
  component: AdminLeadsPage,
  head: () => ({
    title: 'Leads DISC | Somus Admin',
  })
});

function AdminLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('somus-disc-leads');
    if (raw) {
      setLeads(JSON.parse(raw).reverse());
    }
  }, []);

  const handleDelete = (index: number) => {
    if (!confirm('Excluir este lead?')) return;
    const newLeads = [...leads];
    newLeads.splice(index, 1);
    setLeads(newLeads);
    localStorage.setItem('somus-disc-leads', JSON.stringify([...newLeads].reverse()));
    toast.success('Lead excluído');
  };

  const filtered = leads.filter(l => 
    l.lead.name.toLowerCase().includes(search.toLowerCase()) ||
    l.lead.email.toLowerCase().includes(search.toLowerCase()) ||
    l.lead.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Leads do Teste DISC</h1>
            <p className="text-zinc-500 text-sm mt-1">Gerencie os contatos capturados através do teste de personalidade.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou empresa..." 
              className="pl-10 bg-zinc-900 border-white/10"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item, idx) => (
              <Card key={idx} className="bg-zinc-900 border-white/5 p-6 space-y-4 hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{item.lead.name}</h3>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" /> {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(idx)}
                    className="text-zinc-600 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" /> {item.lead.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" /> {item.lead.phone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" /> {item.lead.company || 'N/A'}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                   <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Resultados DISC</p>
                   <div className="grid grid-cols-4 gap-2">
                     {Object.entries(item.percentages).map(([dim, val]: any) => (
                       <div key={dim} className="text-center">
                         <div className="text-xs font-bold">{dim}</div>
                         <div className="text-[10px] text-zinc-400">{val}%</div>
                       </div>
                     ))}
                   </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                  onClick={() => {
                    localStorage.setItem('somus-disc-current-result', JSON.stringify(item));
                    window.open('/disc-resultado', '_blank');
                  }}
                >
                  <FileText className="mr-2 h-3.5 w-3.5" /> Ver Relatório Completo
                </Button>
              </Card>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full py-20 text-center text-zinc-500">
                Nenhum lead encontrado.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
