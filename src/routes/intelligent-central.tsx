import { InDevelopmentNotice } from '@/components/common/InDevelopmentNotice';
import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  Layers, 
  Star, 
  Clock, 
  Users, 
  Settings,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useData, IntelligentCentralItem } from '@/contexts/DataContext';
import { useProfile } from '@/hooks/use-profile';
import { IntelligentCentralCard } from '@/components/intelligent-central/IntelligentCentralCard';
import { IntelligentCentralForm } from '@/components/intelligent-central/IntelligentCentralForm';
import { Separator } from '@/components/ui/separator';

export const Route = createFileRoute('/intelligent-central')({
  component: IntelligentCentralPage,
});

function IntelligentCentralPage() {
  const { role, profile } = useProfile();
  const { 
    filteredIntelligentCentral, 
    addIntelligentCentral, 
    updateIntelligentCentral, 
    deleteIntelligentCentral 
  } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState('Todos');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all-categories');
  const [activeTypeSelect, setActiveTypeSelect] = useState('all-types');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IntelligentCentralItem | null>(null);

  const canManage = role === 'master' || role === 'project_manager';

  // Per-user favorites stored locally (RLS prevents clients from updating shared rows,
  // and favorites should be personal anyway).
  const favoritesKey = `ic_favorites_${profile?.id ?? 'anon'}`;
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = window.localStorage.getItem(favoritesKey);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  const fastFilters = [
    'Todos',
    'Agente GPT',
    'Lovable',
    'Dashboard',
    'Planilha',
    'Documento',
    'Ferramenta',
    'Site',
    'Outro',
  ];

  const handleCreate = async (data: any) => {
    await addIntelligentCentral(data);
  };

  const handleUpdate = async (data: any) => {
    if (editingItem) {
      await updateIntelligentCentral(editingItem.id, data);
    }
  };

  const handleToggleFavorite = async (id: string, _current: boolean) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { window.localStorage.setItem(favoritesKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  };


  const categories = Array.from(new Set(filteredIntelligentCentral.map(i => i.category).filter(Boolean)));
  const types = Array.from(new Set(filteredIntelligentCentral.map(i => i.type)));

  const filteredItems = filteredIntelligentCentral.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFastFilter = activeTypeFilter === 'Todos' || item.type === activeTypeFilter;
    
    const matchesCategorySelect = activeCategoryFilter === 'all-categories' || item.category === activeCategoryFilter;
    const matchesTypeSelect = activeTypeSelect === 'all-types' || item.type === activeTypeSelect;

    return matchesSearch && matchesFastFilter && matchesCategorySelect && matchesTypeSelect;
  });

  const renderGrid = (items: IntelligentCentralItem[]) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-muted/30 p-6 rounded-full mb-4">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold">Nenhum acesso cadastrado ainda.</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Clique em "Novo Acesso" para adicionar o primeiro item à sua Central Inteligente.
          </p>
          {canManage && (
            <Button className="mt-6" onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Acesso
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map(item => (
          <IntelligentCentralCard 
            key={item.id} 
            item={{ ...item, isFavorite: favorites.has(item.id) }}
            canManage={canManage}
            onEdit={(item) => { setEditingItem(item); setIsFormOpen(true); }}
            onDelete={deleteIntelligentCentral}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Central Inteligente</h1>
            <p className="text-muted-foreground mt-1">Acesso rápido a agentes, projetos e ferramentas operacionais</p>
          </div>
          {canManage && (
            <Button size="lg" className="h-12 px-6" onClick={() => { setEditingItem(null); setIsFormOpen(true); }}>
              <Plus className="h-5 w-5 mr-2" />
              Novo Acesso
            </Button>
          )}
        </div>

        {/* Search & Fast Filters */}
        <div className="space-y-4">
          <div className="relative group max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="O que você precisa acessar agora?" 
              className="pl-12 h-14 bg-card border-border/50 text-lg shadow-sm focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {fastFilters.map(filter => (
              <Button 
                key={filter}
                variant={activeTypeFilter === filter ? "default" : "outline"}
                size="sm"
                className="h-9 px-4 rounded-full font-medium transition-all"
                onClick={() => setActiveTypeFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Tabs & Secondary Filters */}
        <Tabs defaultValue="gallery" className="w-full">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="gallery" className="gap-2 px-4 py-2">
                <LayoutGrid className="h-4 w-4" />
                Galeria
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2 px-4 py-2">
                <Layers className="h-4 w-4" />
                Categorias
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-2 px-4 py-2">
                <Star className="h-4 w-4" />
                Favoritos
              </TabsTrigger>
              <TabsTrigger value="recent" className="gap-2 px-4 py-2">
                <Clock className="h-4 w-4" />
                Recentes
              </TabsTrigger>
              <TabsTrigger value="shared" className="gap-2 px-4 py-2">
                <Users className="h-4 w-4" />
                Compartilhados
              </TabsTrigger>
              <TabsTrigger value="config" className="gap-2 px-4 py-2">
                <Settings className="h-4 w-4" />
                Configurações
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3 w-full xl:w-auto">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium whitespace-nowrap">
                <Filter className="h-4 w-4" />
                Filtros:
              </div>
              <Select value={activeCategoryFilter} onValueChange={setActiveCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px] h-10 bg-card border-border/50">
                  <SelectValue placeholder="Todas categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">Todas categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activeTypeSelect} onValueChange={setActiveTypeSelect}>
                <SelectTrigger className="w-full md:w-[200px] h-10 bg-card border-border/50">
                  <SelectValue placeholder="Todos tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-types">Todos tipos</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="gallery" className="mt-0">
            {renderGrid(filteredItems)}
          </TabsContent>
          
          <TabsContent value="categories" className="mt-0">
             <div className="space-y-12">
                {categories.map(category => {
                  const itemsInCategory = filteredItems.filter(i => i.category === category);
                  if (itemsInCategory.length === 0) return null;
                  return (
                    <div key={category} className="space-y-6">
                      <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold tracking-tight px-1 border-l-4 border-primary">{category}</h2>
                        <Badge variant="secondary" className="rounded-full">{itemsInCategory.length}</Badge>
                      </div>
                      {renderGrid(itemsInCategory)}
                    </div>
                  );
                })}
             </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            {renderGrid(filteredItems.filter(i => favorites.has(i.id)))}
          </TabsContent>

          <TabsContent value="recent" className="mt-0">
            {renderGrid([...filteredItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))}
          </TabsContent>

          <TabsContent value="shared" className="mt-0">
            {renderGrid(filteredItems.filter(i => i.visibility !== 'private'))}
          </TabsContent>

          <TabsContent value="config" className="mt-0">
            <div className="max-w-2xl bg-card border border-border/50 rounded-xl p-8 text-center space-y-4">
              <Settings className="h-12 w-12 text-primary mx-auto opacity-20" />
              <h3 className="text-xl font-bold">Configurações da Central</h3>
              <p className="text-muted-foreground">
                Em breve você poderá personalizar as categorias padrões, ícones e layout da sua Central Inteligente.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <IntelligentCentralForm 
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        item={editingItem}
        onSubmit={editingItem ? handleUpdate : handleCreate}
      />
    </MainLayout>
  );
}
