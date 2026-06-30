import w01 from '@/assets/wolves/w01.jpg';
import w02 from '@/assets/wolves/w02.jpg';
import w03 from '@/assets/wolves/w03.jpg';
import w04 from '@/assets/wolves/w04.jpg';
import w05 from '@/assets/wolves/w05.jpg';
import w06 from '@/assets/wolves/w06.jpg';
import w07 from '@/assets/wolves/w07.jpg';
import w08 from '@/assets/wolves/w08.jpg';
import w09 from '@/assets/wolves/w09.jpg';
import w10 from '@/assets/wolves/w10.jpg';
import w11 from '@/assets/wolves/w11.jpg';
import w12 from '@/assets/wolves/w12.jpg';
import w13 from '@/assets/wolves/w13.jpg';
import w14 from '@/assets/wolves/w14.jpg';
import w15 from '@/assets/wolves/w15.jpg';
import w16 from '@/assets/wolves/w16.jpg';
import w17 from '@/assets/wolves/w17.jpg';
import w18 from '@/assets/wolves/w18.jpg';
import w19 from '@/assets/wolves/w19.jpg';
import w20 from '@/assets/wolves/w20.jpg';
import w21 from '@/assets/wolves/w21.jpg';
import w22 from '@/assets/wolves/w22.jpg';
import w23 from '@/assets/wolves/w23.jpg';
import w24 from '@/assets/wolves/w24.jpg';
import w25 from '@/assets/wolves/w25.jpg';
import w26 from '@/assets/wolves/w26.jpg';
import w27 from '@/assets/wolves/w27.jpg';
import w28 from '@/assets/wolves/w28.jpg';
import w29 from '@/assets/wolves/w29.jpg';
import w30 from '@/assets/wolves/w30.jpg';
import w31 from '@/assets/wolves/w31.jpg';
import w32 from '@/assets/wolves/w32.jpg';
import w33 from '@/assets/wolves/w33.jpg';
import w34 from '@/assets/wolves/w34.jpg';
import w35 from '@/assets/wolves/w35.jpg';
import w36 from '@/assets/wolves/w36.jpg';
import w37 from '@/assets/wolves/w37.jpg';
import w38 from '@/assets/wolves/w38.jpg';
import w39 from '@/assets/wolves/w39.jpg';
import w40 from '@/assets/wolves/w40.jpg';
import w41 from '@/assets/wolves/w41.jpg';
import w42 from '@/assets/wolves/w42.jpg';
import w43 from '@/assets/wolves/w43.jpg';
import w44 from '@/assets/wolves/w44.jpg';
import w45 from '@/assets/wolves/w45.jpg';
import w46 from '@/assets/wolves/w46.jpg';
import w47 from '@/assets/wolves/w47.jpg';
import w48 from '@/assets/wolves/w48.jpg';
import w49 from '@/assets/wolves/w49.jpg';
import w50 from '@/assets/wolves/w50.jpg';

export type WolfGender = 'm' | 'f';

export interface WolfAvatar {
  key: string;
  label: string;
  gender?: WolfGender;
  src: string;
}

export const WOLF_AVATARS: WolfAvatar[] = [
  { key: 'wolf-shadow-stripe', label: 'Sombra Ritual', src: w01 },
  { key: 'wolf-arctic', label: 'Lobo Ártico', src: w02 },
  { key: 'wolf-luna', label: 'Luar Prateado', src: w03 },
  { key: 'wolf-cosmic', label: 'Lobo Cósmico', src: w04 },
  { key: 'wolf-inferno', label: 'Inferno', src: w05 },
  { key: 'wolf-timber', label: 'Floresta Verde', src: w06 },
  { key: 'wolf-king', label: 'Rei Coroado', src: w07 },
  { key: 'wolf-queen', label: 'Rainha de Prata', src: w08 },
  { key: 'wolf-samurai', label: 'Samurai Oni', src: w09 },
  { key: 'wolf-cyber', label: 'Cyberpunk', src: w10 },
  { key: 'wolf-viking', label: 'Viking', src: w11 },
  { key: 'wolf-knight', label: 'Cavaleiro', src: w12 },
  { key: 'wolf-mage', label: 'Mago Sombrio', src: w13 },
  { key: 'wolf-shaman', label: 'Xamã', src: w14 },
  { key: 'wolf-pirate', label: 'Pirata', src: w15 },
  { key: 'wolf-monk', label: 'Monge', src: w16 },
  { key: 'wolf-ninja', label: 'Ninja', src: w17 },
  { key: 'wolf-chef', label: 'Chef', src: w18 },
  { key: 'wolf-gamer', label: 'Gamer RGB', src: w19 },
  { key: 'wolf-dj', label: 'DJ Neon', src: w20 },
  { key: 'wolf-gold-shades', label: 'Estilo Ouro', src: w21 },
  { key: 'wolf-scholar', label: 'Erudito', src: w22 },
  { key: 'wolf-executive', label: 'Executivo', src: w23 },
  { key: 'wolf-explorer', label: 'Explorador', src: w24 },
  { key: 'wolf-blood-runes', label: 'Runas de Sangue', src: w25 },
  { key: 'wolf-arcane', label: 'Arcano Azul', src: w26 },
  { key: 'wolf-solar', label: 'Solar Dourado', src: w27 },
  { key: 'wolf-autumn', label: 'Outono', src: w28 },
  { key: 'wolf-albino', label: 'Albino', src: w29 },
  { key: 'wolf-yinyang', label: 'Yin Yang', src: w30 },
  { key: 'wolf-lava', label: 'Lava', src: w31 },
  { key: 'wolf-crystal', label: 'Cristal de Gelo', src: w32 },
  { key: 'wolf-steampunk', label: 'Steampunk', src: w33 },
  { key: 'wolf-demon', label: 'Demônio', src: w34 },
  { key: 'wolf-celestial', label: 'Celestial', src: w35 },
  { key: 'wolf-shadow-smoke', label: 'Sombra', src: w36 },
  { key: 'wolf-storm', label: 'Tempestade', src: w37 },
  { key: 'wolf-sakura', label: 'Sakura', src: w38 },
  { key: 'wolf-tribal', label: 'Tribal', src: w39 },
  { key: 'wolf-chief', label: 'Cacique', src: w40 },
  { key: 'wolf-anubis', label: 'Anubis', src: w41 },
  { key: 'wolf-gladiator', label: 'Gladiador', src: w42 },
  { key: 'wolf-spartan', label: 'Espartano', src: w43 },
  { key: 'wolf-coach', label: 'Treinador', src: w44 },
  { key: 'wolf-detective', label: 'Detetive', src: w45 },
  { key: 'wolf-doctor', label: 'Doutor', src: w46 },
  { key: 'wolf-astronaut', label: 'Astronauta', src: w47 },
  { key: 'wolf-mecha', label: 'Mecha', src: w48 },
  { key: 'wolf-toxic', label: 'Tóxico', src: w49 },
  { key: 'wolf-emperor', label: 'Imperador', src: w50 },
];

const WOLF_BY_KEY = new Map(WOLF_AVATARS.map((w) => [w.key, w]));

export function getWolfAvatar(key?: string | null): WolfAvatar | null {
  if (!key) return null;
  return WOLF_BY_KEY.get(key) ?? null;
}

// Fallback determinístico: dado um identificador estável (id ou email),
// retorna um avatar do catálogo. Útil para usuários que ainda não escolheram.
export function pickDefaultWolfAvatar(seed?: string | null): WolfAvatar {
  const s = (seed ?? '').trim() || 'default';
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return WOLF_AVATARS[hash % WOLF_AVATARS.length];
}
