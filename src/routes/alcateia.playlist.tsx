import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, ExternalLink, Headphones } from 'lucide-react';

export const Route = createFileRoute('/alcateia/playlist')({
  component: PlaylistPage,
  head: () => ({
    meta: [
      { title: 'Playlist Somus — A trilha da Alcateia' },
      { name: 'description', content: 'A playlist oficial da Alcateia Somus no Spotify.' },
    ],
  }),
});

const PLAYLIST_ID = '7HaBZAiy0tyJrPXyPlXEv1';
const PLAYLIST_URL = `https://open.spotify.com/playlist/${PLAYLIST_ID}`;
const EMBED_URL = `https://open.spotify.com/embed/playlist/${PLAYLIST_ID}?utm_source=generator&theme=0`;

function PlaylistPage() {
  return (
    <MainLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Hero */}
        <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-[#1DB954]/15 via-card to-card p-8 md:p-10">
          <div className="relative z-10 space-y-3">
            <Badge variant="outline" className="border-[#1DB954]/50 text-[#1DB954] w-fit">
              <Music className="mr-1 h-3 w-3" /> Spotify
            </Badge>
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
              Playlist Somus
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              A trilha sonora da Alcateia. Coloca no fone, abre o jogo e vai pra cima.
              Música é território — quem ouve junto, caça junto.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a href={PLAYLIST_URL} target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#1DB954] text-black hover:bg-[#1DB954]/90">
                  <ExternalLink className="mr-1 h-4 w-4" /> Abrir no Spotify
                </Button>
              </a>
              <Button variant="outline" disabled className="gap-1">
                <Headphones className="h-4 w-4" /> Trilha oficial da matilha
              </Button>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#1DB954]/15 blur-3xl" />
        </Card>

        {/* Embed */}
        <Card className="overflow-hidden border-primary/20 p-2 md:p-3">
          <iframe
            title="Playlist Somus no Spotify"
            src={EMBED_URL}
            width="100%"
            height={600}
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
          />
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Reprodução completa requer login no Spotify. Sem login, o player toca prévias de 30 segundos.
        </p>
      </div>
    </MainLayout>
  );
}
