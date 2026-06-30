import { createServerFn } from '@tanstack/react-start';
import { generateText, Output } from 'ai';
import { z } from 'zod';

const InputSchema = z.object({
  notes: z.string().min(10, 'Notas muito curtas'),
  clientName: z.string().optional(),
  projectName: z.string().optional(),
  collaborators: z.array(z.string()).optional(),
});

const AtaSchema = z.object({
  title: z.string().describe('Título objetivo da reunião'),
  agenda: z.string().describe('Pauta resumida em tópicos com hífen'),
  decisions: z.string().describe('Decisões tomadas em tópicos com hífen'),
  clientPending: z.string().describe('Pendências do cliente em tópicos'),
  teamPending: z.string().describe('Pendências do time em tópicos'),
  nextSteps: z.string().describe('Próximos passos em tópicos'),
  attendees: z.string().describe('Lista de participantes separada por vírgula'),
});

export const generateAtaFromNotes = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      throw new Error('LOVABLE_API_KEY ausente no servidor.');
    }

    const { createLovableAiGatewayProvider } = await import('./ai-gateway.server');
    const gateway = createLovableAiGatewayProvider(key);

    const collaboratorsList = (data.collaborators ?? [])
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    const context = [
      data.clientName ? `Cliente: ${data.clientName}` : null,
      data.projectName ? `Projeto: ${data.projectName}` : null,
      collaboratorsList.length
        ? `Colaboradores do time (nomes completos oficiais):\n- ${collaboratorsList.join('\n- ')}`
        : null,
    ].filter(Boolean).join('\n');

    const { experimental_output: output } = await generateText({
      model: gateway('google/gemini-3-flash-preview'),
      experimental_output: Output.object({ schema: AtaSchema }),
      system: [
        'Você é um assistente especialista em organizar atas de reunião em português do Brasil.',
        'Receba anotações brutas (estilo Notion, bullets, texto corrido) e estruture em uma ata limpa.',
        'Use frases curtas e diretas. Cada item começa com "- ".',
        'Se uma seção não aparecer nas notas, retorne string vazia ("").',
        'Não invente decisões ou pendências que não estejam nas notas.',
        'IMPORTANTE — vale para TODOS os colaboradores da lista, sem exceção:',
        'sempre que uma pessoa for citada apenas pelo primeiro nome, apelido ou forma curta',
        '(ex.: "Wilson", "Lucas", "Heloísa", "Jasmine", "Lu", "Gui", "Hel"),',
        'localize o colaborador correspondente na lista "Colaboradores do time" e substitua pelo NOME COMPLETO oficial',
        '(ex.: "Wilson" → "Wilson Camargo", "Lucas" → "Lucas Silva", etc).',
        'Aplique essa substituição em participantes, decisões, pendências do time, pendências do cliente e próximos passos.',
        'Só mantenha o nome original quando houver ambiguidade real (dois colaboradores com o mesmo primeiro nome) ou quando a pessoa não estiver na lista.',
      ].join(' '),
      prompt: [
        context && `Contexto:\n${context}`,
        'Anotações brutas da reunião:',
        data.notes,
      ].filter(Boolean).join('\n\n'),
    });

    return output;
  });

