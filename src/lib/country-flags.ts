// Maps country/team name (PT-BR or EN) to ISO 3166-1 alpha-2 code for flagcdn.com
const MAP: Record<string, string> = {
  // Sul-América
  'brasil': 'br', 'brazil': 'br',
  'argentina': 'ar',
  'uruguai': 'uy', 'uruguay': 'uy',
  'chile': 'cl',
  'paraguai': 'py', 'paraguay': 'py',
  'colombia': 'co', 'colômbia': 'co',
  'equador': 'ec', 'ecuador': 'ec',
  'peru': 'pe', 'perú': 'pe',
  'venezuela': 've',
  'bolivia': 'bo', 'bolívia': 'bo',
  // Europa
  'portugal': 'pt',
  'espanha': 'es', 'spain': 'es',
  'franca': 'fr', 'frança': 'fr', 'france': 'fr',
  'alemanha': 'de', 'germany': 'de',
  'italia': 'it', 'itália': 'it', 'italy': 'it',
  'inglaterra': 'gb-eng', 'england': 'gb-eng',
  'escocia': 'gb-sct', 'escócia': 'gb-sct', 'scotland': 'gb-sct',
  'pais de gales': 'gb-wls', 'país de gales': 'gb-wls', 'wales': 'gb-wls',
  'reino unido': 'gb',
  'irlanda': 'ie',
  'holanda': 'nl', 'paises baixos': 'nl', 'países baixos': 'nl', 'netherlands': 'nl',
  'belgica': 'be', 'bélgica': 'be', 'belgium': 'be',
  'suica': 'ch', 'suíça': 'ch', 'switzerland': 'ch',
  'austria': 'at', 'áustria': 'at',
  'polonia': 'pl', 'polônia': 'pl', 'poland': 'pl',
  'croacia': 'hr', 'croácia': 'hr', 'croatia': 'hr',
  'servia': 'rs', 'sérvia': 'rs', 'serbia': 'rs',
  'dinamarca': 'dk', 'denmark': 'dk',
  'suecia': 'se', 'suécia': 'se', 'sweden': 'se',
  'noruega': 'no', 'norway': 'no',
  'turquia': 'tr', 'türkiye': 'tr', 'turkey': 'tr',
  'grecia': 'gr', 'grécia': 'gr', 'greece': 'gr',
  'russia': 'ru', 'rússia': 'ru',
  'ucrania': 'ua', 'ucrânia': 'ua', 'ukraine': 'ua',
  'republica tcheca': 'cz', 'república tcheca': 'cz', 'czech republic': 'cz', 'tchequia': 'cz', 'chéquia': 'cz',
  'eslovaquia': 'sk', 'eslováquia': 'sk',
  'hungria': 'hu',
  'romenia': 'ro', 'romênia': 'ro',
  'bulgaria': 'bg', 'bulgária': 'bg',
  'albania': 'al', 'albânia': 'al',
  'bosnia': 'ba', 'bósnia': 'ba',
  // Américas
  'mexico': 'mx', 'méxico': 'mx',
  'estados unidos': 'us', 'eua': 'us', 'usa': 'us', 'united states': 'us',
  'canada': 'ca', 'canadá': 'ca',
  'costa rica': 'cr',
  'panama': 'pa', 'panamá': 'pa',
  'honduras': 'hn',
  'jamaica': 'jm',
  // África
  'marrocos': 'ma', 'morocco': 'ma',
  'senegal': 'sn',
  'tunisia': 'tn', 'tunísia': 'tn',
  'gana': 'gh', 'ghana': 'gh',
  'camaroes': 'cm', 'camarões': 'cm', 'cameroon': 'cm',
  'nigeria': 'ng', 'nigéria': 'ng',
  'argelia': 'dz', 'argélia': 'dz',
  'egito': 'eg', 'egypt': 'eg',
  'africa do sul': 'za', 'áfrica do sul': 'za', 'south africa': 'za',
  'costa do marfim': 'ci',
  // Ásia/Oceania
  'japao': 'jp', 'japão': 'jp', 'japan': 'jp',
  'coreia do sul': 'kr', 'coréia do sul': 'kr', 'south korea': 'kr',
  'australia': 'au', 'austrália': 'au',
  'arabia saudita': 'sa', 'arábia saudita': 'sa', 'saudi arabia': 'sa',
  'ira': 'ir', 'irã': 'ir', 'iran': 'ir',
  'iraque': 'iq', 'iraq': 'iq',
  'catar': 'qa', 'qatar': 'qa',
  'china': 'cn',
  'india': 'in', 'índia': 'in',
  'nova zelandia': 'nz', 'nova zelândia': 'nz', 'new zealand': 'nz',
};

const normalize = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, ' ');

export function getCountryCode(name: string): string | null {
  if (!name) return null;
  return MAP[normalize(name)] ?? null;
}

export function getFlagUrl(name: string): string | null {
  const code = getCountryCode(name);
  if (!code) return null;
  return `https://flagcdn.com/w80/${code}.png`;
}
