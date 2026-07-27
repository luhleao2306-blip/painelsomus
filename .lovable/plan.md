# Plano: Unificar abas Alcateia e Carreira na sidebar

## Objetivo
Juntar todos os itens da seção "Carreira" dentro da seção "Alcateia" na barra lateral, mantendo rotas e permissões intactas.

## Alterações

### 1. `src/components/layout/MainLayout.tsx`
- **Mesclar itens**: Incluir os links atualmente sob o rótulo `Carreira` (Dashboard, Galeria do Lobo, Pins & Conquistas, Hábitos Saudáveis, Loja da Alcateia, Resgates, Reconhecimentos, Somus Bolão) dentro da seção `Alcateia`.
- **Remover seção separada**: Excluir o bloco `NavSection` com `label: 'Carreira'`.
- **Manter comportamento**: Preservar ícones, hrefs, roles e lógica de destaque/expandir do grupo ativo.

### 2. Validação
- Verificar se a sidebar renderiza sem erros de compilação.
- Confirmar que a seção "Alcateia" exibe todos os itens combinados e que nenhuma seção vazia ou duplicada aparece.

## Resultado esperado
A barra lateral terá uma única seção chamada **Alcateia**, contendo tanto os itens culturais (A Alcateia, Playlist Somus) quanto os itens de carreira/gamificação.