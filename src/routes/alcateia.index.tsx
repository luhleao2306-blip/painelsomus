import { createFileRoute, Link } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Flame, Heart, Eye, Shield, Compass, Crown, Sparkles, Mountain,
  HandshakeIcon, Target, Zap, Users,
} from 'lucide-react';
import heroImg from '@/assets/alcateia-hero.jpg';
import matilhaImg from '@/assets/alcateia-matilha.jpg';
import uivoImg from '@/assets/alcateia-uivo.jpg';
import olharImg from '@/assets/alcateia-olhar.jpg';

export const Route = createFileRoute('/alcateia/')({
  component: AlcateiaPage,
  head: () => ({
    meta: [
      { title: 'A Alcateia — Cultura Somus' },
      { name: 'description', content: 'A cultura dos lobos: os princípios que movem a alcateia Somus.' },
    ],
  }),
});

const pillars = [
  { icon: Heart, title: 'Lealdade à matilha', desc: 'Antes do indivíduo, vem a alcateia. Cobrimos uns aos outros sem hesitação.' },
  { icon: Eye, title: 'Olhar atento', desc: 'Lobos enxergam no escuro. Antecipamos riscos, oportunidades e detalhes que outros perdem.' },
  { icon: Shield, title: 'Coragem para resolver', desc: 'Encaramos o problema de frente. Não terceirizamos a dor — assumimos.' },
  { icon: Flame, title: 'Fogo interno', desc: 'Energia constante. Quem está na alcateia chega para entregar, não para esperar.' },
  { icon: Compass, title: 'Direção clara', desc: 'Toda caçada tem um alvo. Sem objetivo, é só barulho na floresta.' },
  { icon: Crown, title: 'Liderança pelo exemplo', desc: 'O alfa não grita — caminha na frente. Influência se conquista, não se decreta.' },
];

const rituals = [
  { title: 'Uivo de início', desc: 'Toda semana começa alinhada: a alcateia uiva junta antes da caçada.' },
  { title: 'Marcação de território', desc: 'Cada projeto entregue é um marco no nosso território. Comemoramos.' },
  { title: 'Reconhecimento da matilha', desc: 'Estrela do Líder, Pins e Pontos de Caça — quem entrega é visto.' },
  { title: 'Hábitos saudáveis', desc: 'Lobos fortes são lobos saudáveis. Cuidamos do corpo e da mente.' },
];

const code = [
  'Cumpro o que prometo. Sempre.',
  'Trago o problema com a solução, nunca só com a reclamação.',
  'Defendo a alcateia mesmo quando não estou na sala.',
  'Estudo todo dia — um lobo que para de aprender vira presa.',
  'Celebro a vitória do outro como se fosse minha.',
  'Não conta dois — assume.',
];

function AlcateiaPage() {
  return (
    <MainLayout>
      <div className="space-y-12">
        {/* Hero cinematográfico */}
        <section className="relative overflow-hidden rounded-2xl border border-primary/30">
          <img
            src={heroImg}
            alt="Lobo alfa no topo da montanha ao amanhecer"
            width={1920}
            height={1080}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 max-w-2xl space-y-5 p-8 md:p-14 lg:p-16 min-h-[420px] md:min-h-[560px] flex flex-col justify-end">
            <Badge variant="outline" className="border-primary/50 bg-background/60 backdrop-blur text-primary w-fit">
              <Mountain className="mr-1 h-3 w-3" /> Cultura Somus
            </Badge>
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight drop-shadow-lg">
              A Alcateia
            </h1>
            <p className="text-lg md:text-xl text-foreground/90 leading-relaxed max-w-xl">
              Não somos uma empresa. Somos uma matilha. Caçamos juntos, cuidamos uns dos
              outros e não deixamos ninguém para trás.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to="/gamificacao">
                <Button size="lg"><Sparkles className="mr-1 h-4 w-4" /> Galeria do Lobo</Button>
              </Link>
              <Link to="/gamificacao/habitos">
                <Button size="lg" variant="outline" className="bg-background/60 backdrop-blur">
                  <Target className="mr-1 h-4 w-4" /> Hábitos da matilha
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Manifesto com imagem */}
        <section className="grid gap-6 md:grid-cols-2 items-stretch">
          <Card className="relative overflow-hidden border-primary/20 min-h-[320px]">
            <img
              src={olharImg}
              alt="Olhar penetrante de lobo"
              width={1024}
              height={1024}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-background/90 via-background/30 to-transparent" />
            <div className="relative z-10 p-6 flex h-full items-end">
              <Badge variant="outline" className="border-primary/50 bg-background/60 backdrop-blur text-primary">
                <Eye className="mr-1 h-3 w-3" /> Olhar de lobo
              </Badge>
            </div>
          </Card>
          <div className="flex flex-col justify-center space-y-4">
            <Badge variant="secondary" className="w-fit">Manifesto</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              O lobo não pede licença para existir.
            </h2>
            <div className="space-y-3 text-base leading-relaxed text-muted-foreground">
              <p>
                Onde o mundo vê dificuldade, a alcateia vê caça. Onde o mundo desiste,
                a gente acelera. Lobo não negocia com a inverno — ele atravessa.
              </p>
              <p>
                Cada cliente é um território a defender. Cada projeto, uma caçada coletiva.
              </p>
              <p className="text-foreground font-medium">
                Aqui ninguém caça sozinho. E ninguém come sozinho.
              </p>
            </div>
          </div>
        </section>

        {/* Pilares */}
        <section className="space-y-5">
          <div>
            <Badge variant="secondary" className="mb-2">Pilares</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              Os 6 princípios da matilha
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pillars.map((p) => (
              <Card key={p.title} className="group relative overflow-hidden p-6 hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/15 transition-colors" />
                <div className="relative">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Banner matilha */}
        <section className="relative overflow-hidden rounded-2xl border border-primary/30 min-h-[280px] md:min-h-[360px]">
          <img
            src={matilhaImg}
            alt="Matilha correndo unida pela floresta nevada"
            width={1920}
            height={1080}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
          <div className="relative z-10 flex h-full min-h-[280px] md:min-h-[360px] items-end p-6 md:p-10">
            <div className="max-w-2xl space-y-2">
              <Badge variant="outline" className="border-primary/50 bg-background/60 backdrop-blur text-primary">
                <Users className="mr-1 h-3 w-3" /> Juntos somos mais
              </Badge>
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight drop-shadow-lg">
                A força não está no lobo. Está na matilha.
              </h2>
            </div>
          </div>
        </section>

        {/* Código do Lobo */}
        <section>
          <Card className="overflow-hidden border-primary/30">
            <div className="border-b border-border bg-gradient-to-r from-primary/10 via-card to-card p-6">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">O Código do Lobo</h2>
                  <p className="text-sm text-muted-foreground">As promessas que cada um da alcateia faz a si mesmo.</p>
                </div>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {code.map((line, i) => (
                <li key={i} className="flex items-start gap-4 p-5 hover:bg-primary/5 transition-colors">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-bold text-primary-foreground shadow-md shadow-primary/30">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-base leading-relaxed pt-1">{line}</p>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Rituais com imagem do uivo */}
        <section className="grid gap-6 md:grid-cols-[1fr,1.5fr] items-stretch">
          <Card className="relative overflow-hidden border-primary/20 min-h-[360px]">
            <img
              src={uivoImg}
              alt="Lobo uivando para a lua cheia"
              width={1024}
              height={1024}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <div className="relative z-10 p-6 flex h-full items-end">
              <div>
                <Badge variant="outline" className="border-primary/50 bg-background/60 backdrop-blur text-primary mb-2">
                  Uivo
                </Badge>
                <p className="font-display text-xl font-semibold drop-shadow">
                  O uivo é o chamado. Quem ouve, responde.
                </p>
              </div>
            </div>
          </Card>
          <div className="space-y-4">
            <div>
              <Badge variant="secondary" className="mb-2">Rituais</Badge>
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
                O que mantém a alcateia viva
              </h2>
            </div>
            <div className="grid gap-3">
              {rituals.map((r) => (
                <Card key={r.title} className="p-5 hover:border-primary/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <HandshakeIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{r.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <Card className="relative overflow-hidden border-primary/30 p-10 md:p-14 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative z-10 space-y-3">
            <Users className="mx-auto h-10 w-10 text-primary" />
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
              Você está na alcateia.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Agora caça com a gente. Marca território. Reconhece os teus. E nunca esquece:
            </p>
            <p className="text-foreground font-display text-xl md:text-2xl font-semibold pt-1">
              O lobo solitário morre. A matilha sobrevive.
            </p>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
