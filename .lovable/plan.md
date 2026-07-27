## Objetivo

Fazer a aba lateral do portal continuar visível ao entrar em `/operacoes` (e sub-rotas), com o mesmo visual claro/branco das outras páginas. Hoje `src/routes/operacoes.tsx` renderiza um layout próprio de tela cheia (dark) que substitui o `MainLayout`, escondendo a sidebar.

## Mudanças

### 1. `src/routes/operacoes.tsx`
- Envolver o conteúdo em `<MainLayout>` para reaproveitar a sidebar branca, header, busca e notificações do portal.
- Remover o wrapper `op-scope`, a classe `op-light` e o toggle de tema dark/light (o portal já controla o tema global).
- Remover o header próprio de tela cheia (logo Somus, botão "Portal", bloco "Operações / Alcateia · Interno" e botão dark/light).
- Manter apenas a barra de sub-navegação (`NAV`: Visão Geral, Projetos, Modelos, Formulários, Performance) e o badge de status "Ao vivo / Salvando / Erro ao salvar", restilizados no padrão claro do portal (borda `border-border`, texto `text-muted-foreground`, ativo `text-foreground` com sublinhado `bg-foreground`).
- Manter o guard de acesso por role e o `<Outlet />`.

### 2. Sub-rotas de Operações (visual claro)
As páginas abaixo assumem fundo escuro porque estavam dentro do `op-scope`. Ajustar containers de topo para usar tokens neutros (`bg-background text-foreground`) em vez de cores fixas escuras, sem mexer em lógica:
- `src/routes/operacoes.index.tsx`
- `src/routes/operacoes.projetos.tsx`
- `src/routes/operacoes.modelos.tsx`
- `src/routes/operacoes.formularios.tsx`
- `src/routes/operacoes.performance.tsx`
- `src/routes/operacoes.senhas.tsx`
- `src/routes/operacoes.minhas-demandas.tsx`

Escopo restrito: apenas trocar classes de cor/gradiente hardcoded (`bg-[#0a0a0a]`, `text-white`, `bg-black`, gradientes escuros) por tokens do design system (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `text-muted-foreground`). Sem mudar estrutura, dados ou comportamento.

### 3. Sidebar
Sem mudança — `Painel de Operações` já aparece na seção "Operação" e continuará destacado via `isActive` quando estivermos em `/operacoes*`.

## Fora de escopo
- Não alterar lógica de sync, permissões, store ou dados.
- Não mexer nos diálogos internos (edição de tarefa, modelos, etc.) além de eventual cor de fundo herdada.
- Não reintroduzir toggle dark/light dentro de Operações (o portal já tem o tema unificado).
