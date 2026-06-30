import { useMemo } from 'react';
import { Quote } from 'lucide-react';

const QUOTES: { text: string; author: string }[] = [
  { text: 'A melhor maneira de prever o futuro é criá-lo.', author: 'Peter Drucker' },
  { text: 'Estratégia sem execução é alucinação.', author: 'Thomas Edison' },
  { text: 'O sucesso nos negócios exige treinamento, disciplina e trabalho duro.', author: 'David Rockefeller' },
  { text: 'Não é o mais forte que sobrevive, mas o que melhor se adapta à mudança.', author: 'Charles Darwin' },
  { text: 'Qualidade nunca é um acidente; é sempre o resultado de um esforço inteligente.', author: 'John Ruskin' },
  { text: 'Comece fazendo o necessário, depois o possível, e de repente estará fazendo o impossível.', author: 'São Francisco de Assis' },
  { text: 'O risco vem de não saber o que se está fazendo.', author: 'Warren Buffett' },
  { text: 'A inovação distingue um líder de um seguidor.', author: 'Steve Jobs' },
  { text: 'Seu cliente mais insatisfeito é sua maior fonte de aprendizado.', author: 'Bill Gates' },
  { text: 'Liderança é a capacidade de transformar visão em realidade.', author: 'Warren Bennis' },
  { text: 'Faça hoje o que os outros não querem, faça amanhã o que os outros não podem.', author: 'Jerry Rice' },
  { text: 'Quem não mede, não gerencia. Quem não gerencia, não melhora.', author: 'William Edwards Deming' },
  { text: 'O preço é o que você paga. O valor é o que você leva.', author: 'Warren Buffett' },
  { text: 'Não tenha medo de desistir do bom para perseguir o ótimo.', author: 'John D. Rockefeller' },
  { text: 'A oportunidade está geralmente disfarçada de trabalho duro, por isso muitos não a reconhecem.', author: 'Ann Landers' },
];

export function BusinessQuoteBanner() {
  const quote = useMemo(() => {
    const day = Math.floor(Date.now() / 86400000);
    return QUOTES[day % QUOTES.length];
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-sm">
      <Quote className="absolute right-4 top-4 h-16 w-16 text-primary/10" />
      <div className="relative max-w-3xl">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Inspiração de negócios</span>
        <p className="mt-2 font-display text-xl font-semibold leading-snug text-foreground sm:text-2xl">
          “{quote.text}”
        </p>
        <p className="mt-2 text-sm font-medium text-muted-foreground">— {quote.author}</p>
      </div>
    </div>
  );
}
