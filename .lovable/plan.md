## Plano

1. **Barra lateral** (`src/components/layout/MainLayout.tsx`)  
   Trocar o item "Senhas" (que aponta para `/passwords`) por **"Cofre de Senhas"** apontando para `/operacoes/senhas`. Manter ícone `KeyRound` e papéis internos.

2. **Remover do submenu de Operações** (`src/routes/operacoes.tsx`)  
   Apagar a entrada `{ to: '/operacoes/senhas', label: 'Senhas', ... }` da barra de abas do painel de Operações. A rota `/operacoes/senhas` (cofre por cliente) continua existindo e passa a ser acessada apenas pelo item da barra lateral.

3. **Excluir a rota antiga**  
   - Apagar `src/routes/passwords.tsx`.  
   - Remover qualquer link remanescente para `/passwords` no código.

Sem alterações de banco.
