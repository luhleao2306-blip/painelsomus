import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  Search, 
  Upload, 
  Filter, 
  File, 
  FileSpreadsheet, 
  FileImage,
  Layers,
  ChevronRight,
  ExternalLink,
  MoreVertical,
  Plus,
  Eye,
  Loader2,
  Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useData } from '@/contexts/DataContext';
import { useProfile } from '@/hooks/use-profile';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { StatusBadge, EmptyState } from '@/components/design-system/DesignSystem';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FileViewerDialog } from '@/components/files/FileViewerDialog';

export const Route = createFileRoute('/documents')({
  component: DocumentsPage,
});

const getFileIcon = (type: string) => {
  switch (type?.toUpperCase()) {
    case 'PDF': return <FileText className="h-5 w-5 text-rose-500" />;
    case 'XLSX': return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
    case 'IMAGE': return <FileImage className="h-5 w-5 text-blue-500" />;
    default: return <File className="h-5 w-5 text-muted-foreground" />;
  }
};

function DocumentsPage() {
  const { role } = useProfile();
  const {
    filteredDocuments,
    filteredDeliverables,
    clients,
    projects,
    addDocument,
    addDeliverable,
    deleteDocument,
    deleteDeliverable,
    getDownloadUrl,
    refreshDocuments,
    refreshDeliverables
  } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'deliverables'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');


  const inPeriod = (dateStr?: string | null) => {
    if (!periodStart && !periodEnd) return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (periodStart) {
      const s = new Date(periodStart + 'T00:00:00');
      if (d < s) return false;
    }
    if (periodEnd) {
      const e = new Date(periodEnd + 'T23:59:59');
      if (d > e) return false;
    }
    return true;
  };
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewerItem, setViewerItem] = useState<any | null>(null);

  const openInternalViewer = (item: any) => setViewerItem(item);
  const handleDownload = async (item: any) => {
    if (role === 'client' && item.downloadEnabled === false) {
      toast.error("Download desabilitado para este item.");
      return;
    }
    if (item.filePath) {
      const url = await getDownloadUrl(item.filePath);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name || '';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } else if (item.externalLink) {
      window.open(item.externalLink, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    if (role === 'client') { setActiveTab('all'); return; }
    const hash = window.location.hash.replace('#', '');
    if (hash === 'deliverables' || hash === 'all') {
      setActiveTab(hash);
    }
  }, [role]);

  // Form states
  const [newItem, setNewItem] = useState({
    name: '',
    clientId: '',
    projectId: '',
    category: '', 
    externalLink: '',
    visibleToClient: true,
    downloadEnabled: true,
    status: 'Pendente', 
    forecastDate: new Date().toISOString().split('T')[0], 
    startDate: new Date().toISOString().split('T')[0], 
    endDate: '',
  });

  const handleAction = async (item: any) => {
    if (item.externalLink) {
      window.open(item.externalLink, '_blank');
      toast.success(`Abrindo link externo...`);
    } else if (item.filePath) {
      if (role === 'client' && !item.downloadEnabled) {
        toast.error("Download desabilitado para este item.");
        return;
      }
      const url = await getDownloadUrl(item.filePath);
      if (url) window.open(url, '_blank');
    } else {
      toast.error("Nenhum arquivo ou link disponível.");
    }
  };

  const handleSave = async () => {
    if (!newItem.name) {
      toast.error("Informe o nome do item");
      return;
    }
    if (!newItem.clientId) {
      toast.error("Selecione um cliente");
      return;
    }



    setIsUploading(true);
    const before =
      activeTab === 'deliverables' ? filteredDeliverables.length :
      filteredDocuments.length;

    try {
      if (activeTab === 'all') {
        await addDocument(newItem, selectedFile || undefined);
        await refreshDocuments();
      } else if (activeTab === 'deliverables') {
        await addDeliverable({ ...newItem, type: newItem.category || 'Entrega' }, selectedFile || undefined);
        await refreshDeliverables();
      }

      const after =
        activeTab === 'deliverables' ? filteredDeliverables.length :
        filteredDocuments.length;

      // Only close + reset when the add functions didn't toast an error (which they handle internally).
      // We rely on the add* functions to show success/error. Avoid showing a duplicate success here.
      if (after >= before) {
        setIsAdding(false);
        setSelectedFile(null);
        setNewItem({
          name: '', clientId: '', projectId: '', category: '', externalLink: '',
          visibleToClient: true, downloadEnabled: true, status: 'Pendente',
          forecastDate: new Date().toISOString().split('T')[0],
          startDate: new Date().toISOString().split('T')[0], endDate: '',
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (kind: 'document' | 'deliverable', id: string, name: string) => {
    if (!window.confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    if (kind === 'document') await deleteDocument(id);
    else if (kind === 'deliverable') await deleteDeliverable(id);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{role === 'client' ? 'Documentos' : 'Documentos e Entregas'}</h1>
            <p className="text-muted-foreground">{role === 'client' ? 'Arquivos disponibilizados para você.' : 'Central de arquivos, entregáveis e contratos.'}</p>
          </div>
          {role !== 'client' && (
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
              <DialogTrigger asChild>
                <Button className="gap-2 shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" />
                  Cadastrar {activeTab === 'all' ? 'Documento' : 'Entregável'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Novo {activeTab === 'all' ? 'Documento' : 'Entregável'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome do Item</Label>
                    <Input id="name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Cliente</Label>
                    <Select value={newItem.clientId} onValueChange={v => setNewItem({...newItem, clientId: v})}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  
                  <div className="space-y-4 border-y py-4">
                    <div className="grid gap-2">
                      <Label>Arquivo (Upload Real)</Label>
                      <div 
                        className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input 
                          type="file" 
                          className="hidden" 
                          ref={fileInputRef} 
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                        {selectedFile ? (
                          <div className="flex items-center justify-center gap-2 text-primary font-bold">
                            <File className="h-4 w-4" />
                            {selectedFile.name}
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-xs uppercase font-bold flex flex-col items-center gap-2">
                            <Upload className="h-6 w-6" />
                            Clique para selecionar arquivo
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OU LINK EXTERNO</span></div>
                    </div>

                    <div className="grid gap-2">
                      <Label>URL Externa (Google Drive, Notion, etc)</Label>
                      <Input value={newItem.externalLink} onChange={e => setNewItem({...newItem, externalLink: e.target.value})} placeholder="https://..." />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Categoria / Tipo</Label>
                    <Input value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} placeholder="Ex: Briefing, Manual..." />
                  </div>
                  
                  {activeTab === 'deliverables' && (
                    <div className="grid gap-2">
                      <Label>Data de Previsão</Label>
                      <Input type="date" value={newItem.forecastDate} onChange={e => setNewItem({...newItem, forecastDate: e.target.value})} />
                    </div>
                  )}


                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex flex-col gap-1">
                      <Label>Visível para o Cliente</Label>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">O cliente poderá ver este item no portal</span>
                    </div>
                    <Switch checked={newItem.visibleToClient} onCheckedChange={v => setNewItem({...newItem, visibleToClient: v})} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <Label>Habilitar Download</Label>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Permite que o arquivo seja baixado/acessado</span>
                    </div>
                    <Switch checked={newItem.downloadEnabled} onCheckedChange={v => setNewItem({...newItem, downloadEnabled: v})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsAdding(false)} disabled={isUploading}>Cancelar</Button>
                  <Button onClick={handleSave} disabled={isUploading}>
                    {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={(tab) => setActiveTab(tab as 'all' | 'deliverables')} className="space-y-6">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <TabsList className={`bg-muted/50 p-1 border border-border/50 ${role === 'client' ? 'hidden' : ''}`}>
              <TabsTrigger value="all" className="px-6">Documentos</TabsTrigger>
              <TabsTrigger value="deliverables" className="px-6">Entregáveis</TabsTrigger>
            </TabsList>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-card border-border/50 h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {role !== 'client' && (
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="bg-card border-border/50 h-9"><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">De</Label>
              <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="bg-card border-border/50 h-9" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Até</Label>
              <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="bg-card border-border/50 h-9" />
            </div>
            {(clientFilter !== 'all' || periodStart || periodEnd) && (
              <Button variant="ghost" size="sm" onClick={() => { setClientFilter('all'); setPeriodStart(''); setPeriodEnd(''); }} className="h-9 w-fit">
                Limpar filtros
              </Button>
            )}
          </div>


          {/* TAB: DOCUMENTOS GERAIS */}
          <TabsContent value="all" className="space-y-4">
            {(() => {
              const list = filteredDocuments.filter(d => {
                const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesClient = clientFilter === 'all' || d.clientId === clientFilter;
                const matchesPeriod = inPeriod((d as any).createdAt ?? (d as any).updatedAt);
                return matchesSearch && matchesClient && matchesPeriod;
              });

              if (filteredDocuments.length === 0) {
                return (
                  <Card className="border-border/50 bg-card/80">
                    <CardContent className="py-16">
                      <EmptyState icon={FileText} title="Nenhum documento cadastrado ainda." description="Use o botão acima para cadastrar o primeiro documento." />
                    </CardContent>
                  </Card>
                );
              }
              if (list.length === 0) {
                return (
                  <Card className="border-border/50 bg-card/80">
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      Nenhum documento encontrado para os filtros aplicados.
                    </CardContent>
                  </Card>
                );
              }
              return (
                <Card className="border-border/50 shadow-sm overflow-hidden bg-card/80">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/10">
                            <th className="px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">Nome</th>
                            <th className="px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">Cliente</th>
                            <th className="px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">Versão</th>
                            <th className="px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">Status</th>
                            <th className="px-3 py-2 text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {list.map((doc) => (
                            <tr key={doc.id} className="group hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-md bg-background border border-border/40 flex items-center justify-center shrink-0">
                                    {getFileIcon(doc.type)}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-xs truncate">{doc.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{doc.category} • {doc.size}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-1.5">
                                <span className="text-xs text-muted-foreground">
                                  {clients.find(c => c.id === doc.clientId)?.name || 'Geral'}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 font-mono text-[10px] font-bold">v{doc.version}</td>
                              <td className="px-3 py-1.5">
                                {doc.visibleToClient ?
                                  <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20">Visível</Badge> :
                                  <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-none">Interno</Badge>
                                }
                              </td>
                              <td className="px-3 py-1.5 text-right">
                                <div className="flex items-center justify-end gap-0.5">
                                  {(doc.externalLink || doc.filePath) && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openInternalViewer(doc)} title="Visualizar no portal">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {doc.downloadEnabled && doc.filePath && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)} title="Baixar">
                                      <Download className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {doc.externalLink && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" asChild title="Abrir link externo (referência)">
                                      <a href={doc.externalLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                                    </Button>
                                  )}
                                  {role !== 'client' && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete('document', doc.id, doc.name)} title="Excluir">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          {/* TAB: ENTREGÁVEIS */}
          <TabsContent value="deliverables" className="space-y-4">
            {(() => {
              const list = filteredDeliverables.filter(d => {
                const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesClient = clientFilter === 'all' || d.clientId === clientFilter;
                const matchesPeriod = inPeriod((d as any).forecastDate ?? (d as any).createdAt);
                return matchesSearch && matchesClient && matchesPeriod;
              });

              if (filteredDeliverables.length === 0) {
                return (
                  <Card className="border-border/50 bg-card/80">
                    <CardContent className="py-16">
                      <EmptyState icon={Layers} title="Nenhum entregável cadastrado ainda." description="Cadastre o primeiro entregável usando o botão acima." />
                    </CardContent>
                  </Card>
                );
              }
              if (list.length === 0) {
                return (
                  <Card className="border-border/50 bg-card/80">
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      Nenhum entregável encontrado para "{searchTerm}".
                    </CardContent>
                  </Card>
                );
              }
              return (
                <Card className="border-border/50 shadow-sm overflow-hidden bg-card/80">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/10">
                            <th className="px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">Nome</th>
                            <th className="px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">Cliente</th>
                            <th className="px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">Tipo</th>
                            <th className="px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">Status</th>
                            <th className="px-3 py-2 text-[10px] font-bold uppercase text-muted-foreground">Previsão</th>
                            <th className="px-3 py-2 text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {list.map((del) => (
                            <tr key={del.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-1.5 font-semibold text-xs">{del.name}</td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground">{clients.find(c => c.id === del.clientId)?.name || '—'}</td>
                              <td className="px-3 py-1.5"><Badge variant="secondary" className="text-[9px] font-bold uppercase">{del.type}</Badge></td>
                              <td className="px-3 py-1.5"><StatusBadge status={del.status} /></td>
                              <td className="px-3 py-1.5 text-xs">{del.forecastDate ? new Date(del.forecastDate).toLocaleDateString() : '—'}</td>
                              <td className="px-3 py-1.5 text-right">
                                <div className="flex items-center justify-end gap-0.5">
                                  {(del.externalLink || del.filePath) && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openInternalViewer(del)} title="Visualizar no portal">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {del.filePath && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(del)} title="Baixar">
                                      <Download className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {del.externalLink && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" asChild title="Link externo (referência)">
                                      <a href={del.externalLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                                    </Button>
                                  )}
                                  {role !== 'client' && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete('deliverable', del.id, del.name)} title="Excluir">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
      <FileViewerDialog item={viewerItem} open={!!viewerItem} onOpenChange={(o) => !o && setViewerItem(null)} allowDownload={role !== 'client' || viewerItem?.downloadEnabled !== false} />
    </MainLayout>
  );
}
