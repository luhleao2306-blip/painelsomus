## Objetivo
Na TV (`/tv`), substituir o painel **Carga por responsável** por **Demandas gerais**.

## Mudança
- `src/routes/tv.tsx`: remover o bloco de leaderboard por responsável e no lugar exibir uma lista de **Demandas gerais** — todas as demandas ativas (não concluídas), ordenadas por prazo (mais próximas primeiro), mostrando: título, cliente, projeto, responsável e data (com destaque para atrasadas/hoje).
- Manter a mesma identidade visual (fundo branco, Inter Tight / Instrument Serif, tokens semânticos) e o auto-refresh de 30s.

## Detalhes técnicos
- Fonte de dados continua `useOpStore` (mesmas tarefas já usadas nos buckets).
- Lista rolável dentro do card para caber na TV; limitar a ~20-30 itens visíveis para legibilidade.
- Badges de status de prazo reutilizando as cores dos buckets (vermelho = atrasada, âmbar = hoje, azul = amanhã, neutro = futura).