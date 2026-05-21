import type { PlatformConfig, PlatformId } from './types';

export const APP_CONFIG = {
  name: 'MultiPost Pro SME',
  payoff: 'Scrivi una volta. Genera una campagna PMI multicanale.',
  version: '2.3.5',
  engineName: 'SME per PMI',
  smeGptUrl: 'https://chatgpt.com/g/g-69fe6ddacd7881919f8cb44139ade390-sistema-comunicazione-ai-per-pmi',
  smeGptLabel: 'Apri SME per PMI su ChatGPT',
  strategy12GptUrl: 'https://chatgpt.com/g/g-69ff68c3fe408191a87e688fb0510ad6-strategia-editoriale-12-mesi',
  strategy12GptLabel: 'Apri Strategia Editoriale 12 Mesi',
  storageKey: 'multipost_pro_sme_v23_drafts',
  briefStorageKey: 'multipost_pro_sme_v23_active_brief',
  defaultBrand: 'Sinapsi',
  defaultSector: 'PMI, consulenza, immobiliare, automotive e servizi professionali'
};

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    shortName: 'LinkedIn',
    maxChars: 3000,
    description: 'Autorevolezza, metodo, network professionale, lead B2B.'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    shortName: 'IG',
    maxChars: 2200,
    description: 'Sintesi visiva, caroselli, storytelling e salvataggi.'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    shortName: 'FB',
    maxChars: 63206,
    description: 'Comunità locale, fiducia, spiegazioni accessibili.'
  },
  {
    id: 'tiktok',
    name: 'TikTok / Reel',
    shortName: 'Video',
    maxChars: 2200,
    description: 'Script breve, hook forte, ritmo, chiarezza immediata.'
  },
  {
    id: 'x',
    name: 'X',
    shortName: 'X',
    maxChars: 280,
    description: 'Sintesi, opinione netta, frase ad alta densità.'
  }
];

export const DEFAULT_PLATFORMS: PlatformId[] = ['linkedin', 'instagram', 'facebook'];

export const getPlatform = (id: PlatformId) => PLATFORMS.find(platform => platform.id === id)!;
