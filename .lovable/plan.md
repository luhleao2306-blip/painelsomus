# Plano - Corrigir e Aprimorar Formulários de Operações

O usuário relatou que "esta parte dos formulários não está funcionando". Com base na investigação, existem dois sistemas de formulários distintos: "Visão de Clientes" (gerenciado via `src/routes/formularios.tsx`) e os "Formulários de Operações" (gerenciados via `src/routes/operacoes.formularios.tsx`). Este último permite criar formulários personalizados, mas carecia de um mecanismo de submissão robusto e sincronização em tempo real das respostas.

## Revisão do Usuário Necessária

> [!IMPORTANT]
> Encontrei duas áreas de formulário separadas no seu sistema. Qual delas exatamente não está funcionando para você?
> 1. A **"Visão de Clientes"** (Formulários estratégicos enviados aos clientes)?
> 2. Os **"Formulários de Operações"** (Formulários personalizados que você mesmo cria)?
>
> Vou prosseguir com a correção dos formulários personalizados em Operações, pois eles parecem não ter o link de submissão em tempo real com o banco de dados.

## Mudanças Propostas

### Banco de Dados e Backend
- Adicionar `client_id`, `contact_name` e `contact_email` na tabela `public_form_submissions` se estiverem faltando (verificado no RPC, mas precisamos checar o esquema da tabela).
- Garantir que `public_form_shares` possa armazenar definições de formulários personalizados.

### Frontend - Formulários de Operações (`src/routes/operacoes.formularios.tsx`)
- Corrigir o `ShareLinkDialog` para gerar e armazenar corretamente os links públicos de compartilhamento no banco de dados.
- Atualizar a lista de submissões para buscar de `public_form_submissions` em tempo real.
- Padronizar a interface para combinar com a estética premium dark/noir da "Somus".

### Frontend - Página de Formulário Público (`src/routes/f.$data.tsx`)
- Garantir que a página lide corretamente com formulários legados (Base64) e baseados em token (Banco de Dados).
- Corrigir a lógica de submissão para usar o RPC `submit_public_form` adequadamente.

## Detalhes Técnicos

- **Correção de RPC**: Garantir que `submit_public_form` lide com todos os campos exigidos pelos formulários de Operações.
- **Sincronização da Store**: Garantir que a `opStore` em `src/lib/operacoes-store.ts` lide corretamente com `formAnswers` e acione a renderização quando novas submissões chegarem.
- **Permissões**: Verificar se usuários `anon` podem realmente executar o RPC de submissão e se o RLS permite que os usuários `authenticated` leiam essas submissões.
