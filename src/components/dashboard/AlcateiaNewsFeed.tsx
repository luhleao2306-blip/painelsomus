import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WolfAvatar } from '@/components/WolfAvatar';
import { useProfile } from '@/hooks/use-profile';
import {
  Heart, MessageCircle, Award, Crown, Flame, Target, Newspaper, Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type News = {
  id: string;
  actor_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  metadata: any;
  created_at: string;
  actor?: { full_name: string | null; avatar_key: string | null } | null;
};
type Comment = {
  id: string;
  news_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { full_name: string | null; avatar_key: string | null } | null;
};

const ICON_MAP: Record<string, any> = {
  Award, Crown, Flame, Target, Sparkles,
};
const COLOR_MAP: Record<string, string> = {
  amber: 'from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300',
  yellow: 'from-yellow-500/20 to-amber-500/20 text-yellow-700 dark:text-yellow-300',
  orange: 'from-orange-500/20 to-red-500/20 text-orange-700 dark:text-orange-300',
  emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-700 dark:text-emerald-300',
};

type NewsRarity = 'bronze' | 'silver' | 'gold' | 'legendary';

const isNewsRarity = (value: unknown): value is NewsRarity =>
  value === 'bronze' || value === 'silver' || value === 'gold' || value === 'legendary';

const NEWS_STAR_THEME: Record<NewsRarity, { c1: string; c2: string; c3: string; ring: string; text: string }> = {
  bronze: { c1: '#fde68a', c2: '#f59e0b', c3: '#b45309', ring: '#92400e', text: 'text-amber-950' },
  silver: { c1: '#f8fafc', c2: '#cbd5e1', c3: '#64748b', ring: '#475569', text: 'text-slate-900' },
  gold: { c1: '#fef9c3', c2: '#facc15', c3: '#ca8a04', ring: '#854d0e', text: 'text-yellow-950' },
  legendary: { c1: '#fbcfe8', c2: '#c084fc', c3: '#7c3aed', ring: '#6d28d9', text: 'text-purple-50' },
};

export function AlcateiaNewsFeed() {
  const { profile } = useProfile();
  const me = profile?.id;
  const [news, setNews] = useState<News[]>([]);
  const [likes, setLikes] = useState<Record<string, { count: number; mine: boolean }>>({});
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadNews = async () => {
    const { data } = await supabase
      .from('alcateia_news')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    const raw = (data ?? []) as any[];

    const actorIds = Array.from(new Set(raw.map(r => r.actor_id).filter(Boolean))) as string[];
    const actorMap: Record<string, { full_name: string | null; avatar_key: string | null }> = {};
    if (actorIds.length) {
      const { data: ps } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_key')
        .in('id', actorIds);
      (ps ?? []).forEach((p: any) => {
        actorMap[p.id] = { full_name: p.full_name, avatar_key: p.avatar_key };
      });
    }
    const list: News[] = raw.map(r => ({ ...r, actor: r.actor_id ? actorMap[r.actor_id] ?? null : null }));
    setNews(list);

    if (list.length) {
      const ids = list.map(n => n.id);
      const { data: lk } = await supabase
        .from('alcateia_news_likes')
        .select('news_id, user_id')
        .in('news_id', ids);
      const acc: Record<string, { count: number; mine: boolean }> = {};
      for (const id of ids) acc[id] = { count: 0, mine: false };
      (lk ?? []).forEach((r: any) => {
        acc[r.news_id].count += 1;
        if (r.user_id === me) acc[r.news_id].mine = true;
      });
      setLikes(acc);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNews();
    const ch = supabase
      .channel('alcateia_news_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alcateia_news' }, loadNews)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alcateia_news_likes' }, loadNews)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const toggleLike = async (newsId: string) => {
    if (!me) return;
    const cur = likes[newsId];
    if (cur?.mine) {
      await supabase.from('alcateia_news_likes').delete().eq('news_id', newsId).eq('user_id', me);
      setLikes(p => ({ ...p, [newsId]: { count: Math.max(0, (p[newsId]?.count ?? 1) - 1), mine: false } }));
    } else {
      await supabase.from('alcateia_news_likes').insert({ news_id: newsId, user_id: me });
      setLikes(p => ({ ...p, [newsId]: { count: (p[newsId]?.count ?? 0) + 1, mine: true } }));
    }
  };

  const loadComments = async (newsId: string) => {
    const { data } = await supabase
      .from('alcateia_news_comments')
      .select('*')
      .eq('news_id', newsId)
      .order('created_at', { ascending: true });
    const raw = (data ?? []) as any[];
    const userIds = Array.from(new Set(raw.map(r => r.user_id))) as string[];
    const authorMap: Record<string, { full_name: string | null; avatar_key: string | null }> = {};
    if (userIds.length) {
      const { data: ps } = await supabase
        .from('profiles').select('id, full_name, avatar_key').in('id', userIds);
      (ps ?? []).forEach((p: any) => {
        authorMap[p.id] = { full_name: p.full_name, avatar_key: p.avatar_key };
      });
    }
    const list: Comment[] = raw.map(r => ({ ...r, author: authorMap[r.user_id] ?? null }));
    setComments(p => ({ ...p, [newsId]: list }));
  };

  const toggleComments = (newsId: string) => {
    setCommentsOpen(p => ({ ...p, [newsId]: !p[newsId] }));
    if (!comments[newsId]) loadComments(newsId);
  };

  const submitComment = async (newsId: string) => {
    if (!me) return;
    const content = (draft[newsId] ?? '').trim();
    if (!content) return;
    await supabase.from('alcateia_news_comments').insert({ news_id: newsId, user_id: me, content });
    setDraft(p => ({ ...p, [newsId]: '' }));
    loadComments(newsId);
  };

  return (
    <Card className="border-2 border-amber-200/50 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-yellow-50/50 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-yellow-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Newspaper className="h-5 w-5" />
            </div>
            <span>Alcateia News</span>
          </CardTitle>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            Mural da Alcateia
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
        {loading && <div className="text-sm text-muted-foreground py-6 text-center">Carregando…</div>}
        {!loading && news.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma novidade ainda. As próximas conquistas aparecerão aqui!
          </div>
        )}
        {news.map(item => {
          const Icon = ICON_MAP[item.icon ?? ''] ?? Sparkles;
          const colorClass = COLOR_MAP[item.color ?? ''] ?? COLOR_MAP.amber;
          const lk = likes[item.id] ?? { count: 0, mine: false };
          const cs = comments[item.id] ?? [];
          const starRarity = isNewsRarity(item.metadata?.rarity) ? item.metadata.rarity : null;
          const starBonus = typeof item.metadata?.bonus_stars === 'number' ? item.metadata.bonus_stars : null;
          const isLeaderStar = item.event_type === 'leader_star' && starRarity !== null && starBonus !== null;
          return (
            <div key={item.id} className="rounded-xl border bg-card p-3 space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex shrink-0 items-center gap-1.5">
                  <WolfAvatar
                    avatarKey={item.actor?.avatar_key ?? null}
                    seed={item.actor_id ?? item.id}
                    name={item.actor?.full_name ?? 'Lobo'}
                    size="md"
                    className={isLeaderStar ? 'ring-2 ring-background shadow-sm' : undefined}
                  />
                  {isLeaderStar && starRarity && starBonus !== null && <NewsHeroStar rarity={starRarity} bonus={starBonus} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isLeaderStar && (
                      <div className={`p-1.5 rounded-md bg-gradient-to-br ${colorClass}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div className="text-sm font-semibold">{item.title}</div>
                  </div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t">
                <Button
                  variant="ghost" size="sm"
                  className={`h-7 px-2 gap-1 ${lk.mine ? 'text-rose-600' : ''}`}
                  onClick={() => toggleLike(item.id)}
                >
                  <Heart className={`h-3.5 w-3.5 ${lk.mine ? 'fill-current' : ''}`} />
                  <span className="text-xs">{lk.count}</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => toggleComments(item.id)}>
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="text-xs">Comentar</span>
                </Button>
              </div>

              {commentsOpen[item.id] && (
                <div className="space-y-2 pt-2 border-t">
                  {cs.map(c => (
                    <div key={c.id} className="flex items-start gap-2">
                      <WolfAvatar
                        avatarKey={c.author?.avatar_key ?? null}
                        seed={c.user_id}
                        name={c.author?.full_name ?? 'Lobo'}
                        size="sm"
                      />
                      <div className="flex-1 bg-muted/50 rounded-lg px-2 py-1">
                        <div className="text-[11px] font-semibold">{c.author?.full_name ?? 'Lobo'}</div>
                        <div className="text-xs">{c.content}</div>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Textarea
                      value={draft[item.id] ?? ''}
                      onChange={e => setDraft(p => ({ ...p, [item.id]: e.target.value }))}
                      placeholder="Escreva um comentário…"
                      className="min-h-[36px] text-xs"
                      rows={1}
                    />
                    <Button size="sm" onClick={() => submitComment(item.id)} disabled={!(draft[item.id] ?? '').trim()}>
                      Enviar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function NewsHeroStar({ rarity, bonus }: { rarity: NewsRarity; bonus: number }) {
  const t = NEWS_STAR_THEME[rarity];

  return (
    <div className="relative -ml-1 flex h-12 w-12 shrink-0 items-center justify-center" title={`${rarity} +${bonus}`}>
      <div
        className="absolute -inset-2 rounded-full blur-xl opacity-70"
        style={{ background: `radial-gradient(circle, ${t.c2} 0%, transparent 72%)` }}
      />
      <div className="absolute inset-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-px w-5 origin-left rounded-full opacity-70"
            style={{
              transform: `translateY(-50%) rotate(${i * 36}deg)`,
              background: `linear-gradient(to right, ${t.c2}, transparent)`,
            }}
          />
        ))}
      </div>
      <svg width="48" height="48" viewBox="0 0 100 100" className="relative drop-shadow-lg">
        <defs>
          <radialGradient id={`news-star-${rarity}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={t.c1} />
            <stop offset="55%" stopColor={t.c2} />
            <stop offset="100%" stopColor={t.c3} />
          </radialGradient>
          <linearGradient id={`news-star-shine-${rarity}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="62%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points="50,4 61,38 96,38 67,59 78,93 50,72 22,93 33,59 4,38 39,38"
          fill={`url(#news-star-${rarity})`}
          stroke={t.ring}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="52" r="15" fill={t.c1} opacity="0.94" stroke={t.ring} strokeWidth="1.4" />
        <polygon
          points="50,4 61,38 96,38 67,59 78,93 50,72 22,93 33,59 4,38 39,38"
          fill={`url(#news-star-shine-${rarity})`}
          opacity="0.6"
        />
      </svg>
      <span className={`absolute mt-0.5 font-display text-[10px] font-black leading-none ${t.text}`}>
        +{bonus}
      </span>
    </div>
  );
}
