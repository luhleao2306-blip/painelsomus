text
# Próximo passo: implementar o portal do cliente

Esse projeto já tem um plano detalhado para transformar a área do cliente em uma experiência separada, sem lobo/gamificação, e adicionar quatro novas seções. A seguir, resumo o que será feito e como.

## O que será entregue

1. **Avatar do cliente com iniciais**
   - Novo componente `src/components/client/ClientAvatar.tsx` com gradiente neutro determinístico baseado no `full_name`.
   - Substituição de todos os usos de `WolfAvatar` / `AvatarWolf` em rotas/componentes acessados por clientes.
   - Auditoria para garantir que clientes nunca caiam em telas de seleção/edição de avatar de lobo.

2. **Banco de dados (uma migração)**
   Quatro tabelas novas no `public`, todas com GRANTs, RLS e políticas escopadas por `client_id` via `get_my_client_id()`:
   - `client_agents` — agentes IA curados disponibilizados por cliente.
   - `client_learning_tracks` + `client_learning_items` — trilhas de aprendizagem e seus conteúdos.
   - `client_glossary_terms` — glossário de gestão.
   - `client_strategic_goals` — metas estratégicas definidas pela Somus.

   Regras: leitura para clientes; criação/edição/exclusão apenas para `is_collab_admin()` (master/PM).

3. **Rotas e UI do cliente**
   Novo grupo de navegação "Meu Espaço" para `role = 'client'`:
   - `/cliente/agentes` — cards de agentes com link externo.
   - `/cliente/trilhas` e `/cliente/trilhas/$trackId` — lista de trilhas e detalhe de conteúdos.
   - `/cliente/glossario` — busca, lista alfabética por categoria, expansão de definição/exemplos.
   - `/cliente/metas` — cards de metas com barra de progresso, status colorido e período.

   Todas as páginas usam loader + `useSuspenseQuery` via `createServerFn` com `requireSupabaseAuth`, ficam sob `_authenticated/` e seguem o visual atual do portal do cliente (sem referências ao lobo).

4. **Administração (Master/PM)**
   - Nova aba "Portal do Cliente" dentro da página `/clients/$clientId` com 4 sub-tabs (Agentes, Trilhas, Glossário, Metas) para CRUD inline.

## Detalhes técnicos

- Server functions: `src/lib/client-portal.functions.ts` (list/upsert/delete por tabela), com `requireSupabaseAuth` + checagem de role para mutations.
- Rotas TanStack file-based: `cliente.agentes.tsx`, `cliente.trilhas.tsx`, `cliente.trilhas.$trackId.tsx`, `cliente.glossario.tsx`, `cliente.metas.tsx`.
- Sidebar: ao detectar `role === 'client'`, esconder grupos internos (Operação, Alcateia, Bolão, Playlist) e mostrar apenas Painel, Projetos, Cronograma, Atas, Agentes, Trilhas, Glossário, Metas.
- Visual: seguir design system atual, sem cores hardcoded, usando tokens semânticos.

## Fora do escopo (confirmado)

- Upload de arquivos para trilhas (apenas URL externa).
- Chat integrado com agentes (lista curada com link externo).
- Histórico/edição colaborativa de metas pelo cliente.

## Sugestão de execução

Implementar na seguinte ordem para reduzir risco e permitir testes parciais:

1. Migração do banco + funções `get_my_client_id()` e `is_collab_admin()` se ainda não existirem.
2. Server functions em `client-portal.functions.ts`.
3. Componente `ClientAvatar` e substituição nos lugares de cliente.
4. Rotas do cliente (`/cliente/*`) e ajuste da sidebar.
5. Aba de administração em `/clients/$clientId`.

## Próxima decisão

Posso começar a implementação completa agora. Há alguma preferência sobre a ordem ou algum item do escopo que deva ser ajustado antes de prosseguir?