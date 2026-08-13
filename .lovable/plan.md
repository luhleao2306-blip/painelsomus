# Plano: Implementação do Teste DISC Somus

Este plano descreve a criação do teste de personalidade DISC completo, com 40 questões reais, sistema de pontuação, captura de leads e um relatório detalhado com a identidade visual da Somus.

## Alterações Propostas

### 1. Novo Arquivo de Dados e Lógica DISC
- Criar `src/lib/disc-data.ts`:
  - Contém as 40 perguntas e o mapeamento DISC (Dominância, Influência, Estabilidade, Conformidade).
  - Define os 16 perfis comportamentais com descrições, pontos fortes, desafios, etc., em português.
  - Função de shuffle determinístico para as alternativas baseada no índice da questão.
  - Lógica de cálculo de percentuais e identificação de perfil primário/secundário.

### 2. Novas Rotas
- `src/routes/disc.tsx`:
  - Interface do teste com barra de progresso.
  - Exibição de uma pergunta por vez.
  - Seleção automática da próxima questão ao clicar.
  - Formulário de captura de leads (Nome, E-mail, Telefone, Empresa) após a questão 40.
- `src/routes/disc-resultado.tsx`:
  - Exibição do relatório completo.
  - Layout premium inspirado na Somus (gradientes, tipografia Instrument Serif).
  - Gráfico comportamental animado com barras de progresso DISC.
  - Botão para download de PDF.

### 3. Integração e Persistência
- Salvar leads e resultados no `localStorage` sob a chave `somus-disc-leads`.
- Garantir que o resultado persista para consulta posterior no mesmo navegador.

## Detalhes Técnicos
- **Shuffle Determinístico**: Utilizar o índice da questão como semente para garantir que a ordem D-I-S-C das alternativas seja embaralhada de forma consistente.
- **Identidade Visual**: Uso de `Instrument Serif` para títulos, gradientes suaves e cores DISC padronizadas (D: Vermelho/Rosa, I: Amarelo/Laranja, S: Verde, C: Azul).
- **Cálculo DISC**: Percentuais arredondados que somam 100%. Regra para perfil puro (>55% primário com vantagem significativa).
- **Componentes UI**: Reutilização de componentes `Card`, `Badge` e `Progress` do projeto.

## Próximos Passos
1. Criar `src/lib/disc-data.ts` com todo o conteúdo das perguntas e perfis.
2. Implementar a rota de teste `src/routes/disc.tsx`.
3. Implementar a rota de resultado `src/routes/disc-resultado.tsx`.
4. Verificar o fluxo completo e a captura de leads.
