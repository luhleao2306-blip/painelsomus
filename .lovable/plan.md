## Objetivo

Transformar a área do cliente em uma experiência separada (sem nada de lobo/gamificação) e adicionar quatro novas seções: Agentes IA disponibilizados, Trilhas de Aprendizagem, Glossário de Gestão e Metas Estratégicas do negócio.

## 1. Avatar do cliente (iniciais)

- Criar componente `src/components/client/ClientAvatar.tsx` que renderiza um círculo com as iniciais do `full_name` em gradiente neutro (sem ilustração de lobo).
- Substituir todos os usos de `WolfAvatar` / `AvatarWolf` dentro de rotas e componentes acessados pelo `role = 'client'` (header em `MainLayout`, dashboard do cliente, página `/settings`) pelo novo componente.
- Garantir que clientes nunca caiam em telas de seleção/edição de avatar de lobo (já parcialmente feito; auditar e fechar).

## 2. Banco de dados (uma migração)

Quatro tabelas novas — todas com GRANTs, RLS e políticas escopadas por `client_id` via `get_my_client_id()`. Master/PM administram; cliente apenas lê.

- `client_agents` — agentes IA curados disponibilizados por cliente
  - campos de negócio: `client_id`, `name`, `description`, `category`, `icon`, `external_url`, `is_active`, `display_order`
- `client_learning_tracks` — trilhas de aprendizagem
  - `client_id`, `title`, `description`, `cover_url`, `category`, `display_order`, `is_published`
- `client_learning_items` — conteúdos dentro de uma trilha
  - `track_id`, `title`, `content_type` (`video|article|pdf|link`), `url`, `description`, `duration_minutes`, `display_order`
- `client_glossary_terms` — glossário de gestão
  - `client_id`, `term`, `definition`, `category`, `examples`
- `client_strategic_goals` — metas estratégicas definidas pela Somus
  - `client_id`, `title`, `description`, `metric`, `target_value`, `current_value`, `unit`, `period_start`, `period_end`, `status` (`on_track|at_risk|achieved|missed`), `display_order`

Políticas:
- SELECT: `auth.uid()` master/PM/consultor (interno) OU `client_id = get_my_client_id()`.
- INSERT/UPDATE/DELETE: apenas `is_collab_admin()`.

## 3. Rotas e UI do cliente

Estrutura de navegação dedicada para `role = 'client'` em `MainLayout.tsx` (grupo "Meu Espaço"):

- `/cliente/agentes` — grade de cards de agentes disponíveis (ícone, descrição, botão "Abrir" → external_url em nova aba).
- `/cliente/trilhas` — lista de trilhas com capa; `/cliente/trilhas/$trackId` mostra os itens (vídeo embed, artigo, PDF, link).
- `/cliente/glossario` — busca + lista alfabética agrupada por categoria, com expandir para definição/exemplos.
- `/cliente/metas` — cards de metas com barra de progresso (`current_value / target_value`), status colorido e período.

Todas as páginas usam loader + `useSuspenseQuery` via `createServerFn` com `requireSupabaseAuth`, ficam sob `_authenticated/`, e seguem o visual atual do portal do cliente (sem referências ao lobo, frases de negócios).

## 4. Administração (Master/PM)

Aba "Portal do Cliente" dentro da página do cliente (`/clients/$clientId`) com 4 sub-tabs (Agentes, Trilhas, Glossário, Metas) para CRUD inline — formulário/dialog simples reaproveitando os componentes shadcn já em uso.

## Detalhes técnicos

- Server functions em `src/lib/client-portal.functions.ts` (list/upsert/delete por tabela), todas com `requireSupabaseAuth` + checagem de role para mutations.
- Rotas TanStack file-based: `src/routes/_authenticated/cliente.agentes.tsx`, `cliente.trilhas.tsx`, `cliente.trilhas.$trackId.tsx`, `cliente.glossario.tsx`, `cliente.metas.tsx`.
- `ClientAvatar` usa `hash(full_name)` para escolher gradiente determinístico do design system (sem cores hardcoded — tokens semânticos).
- Sidebar: ao detectar `role === 'client'`, esconder grupos internos (Operação, Alcateia, Bolão, Playlist) e mostrar apenas: Painel, Projetos, Cronograma, Atas, Agentes, Trilhas, Glossário, Metas.
- Não tocar em rotas/UI dos colaboradores — todas as novas tabelas e telas são adicionais.

## Fora do escopo (confirmar depois se quiser)

- Upload de arquivos para trilhas (por enquanto só URL externa).
- Chat integrado com agentes (ficou "lista curada" — link externo apenas).
- Histórico/edição colaborativa de metas pelo cliente.
