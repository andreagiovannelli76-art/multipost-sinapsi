import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { SME_FOR_PMI_PROMPT } from './smePrompt';

const app = express();
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const APP_VERSION = '2.3.8';
const MAX_MASTER_TEXT_CHARS = 15000;

type AiProvider = 'openai' | 'gemini' | 'local';
type TaskType = 'core' | 'strategy';

const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-...');
const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'AIza...');
const configuredProvider = normalizeProvider(process.env.AI_PROVIDER || 'auto');
const activeProvider = resolveActiveProvider(configuredProvider);
const openai = hasOpenAiKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const gemini = hasGeminiKey ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const platformLimits: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  tiktok: 2200,
  x: 280
};

const validFormats = new Set([
  'post-singolo',
  'campagna-completa',
  'carosello',
  'script-video',
  'newsletter-breve',
  'strategia-12-mesi'
]);

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  const aiReady = isAiReady();
  res.json({
    ok: true,
    aiReady,
    provider: aiReady ? activeProvider : 'local',
    configuredProvider,
    model: aiReady ? getActiveModelName() : 'mock-local-fallback',
    engine: 'SME per PMI',
    version: APP_VERSION
  });
});

app.post('/api/campaign', async (req, res) => {
  try {
    const brief = normalizeBrief(req.body);

    if (!brief.masterText) {
      return res.status(400).json({ error: 'Inserisci un testo master prima di generare la campagna.', code: 'EMPTY_MASTER_TEXT' });
    }

    if (!brief.platforms.length) {
      return res.status(400).json({ error: 'Seleziona almeno una piattaforma.', code: 'NO_PLATFORMS' });
    }

    const validationError = validateBrief(brief);
    if (validationError) {
      return res.status(400).json(validationError);
    }

    if (!isAiReady()) {
      return res.json(createFallbackCampaign(brief));
    }

    // IL CHUNKING IN AZIONE: Generiamo prima il CORE, poi la STRATEGIA
    console.log(`[SME v${APP_VERSION}] Avvio generazione per formato: ${brief.format}`);
    const finalCampaign = await generateCampaignWithChunking(brief);
    
    res.json(sanitizeCampaign(finalCampaign, brief.platforms));
  } catch (error) {
    const apiError = classifyGenerationError(error);
    console.error('[SME_GENERATION_ERROR]', apiError, error);
    res.status(apiError.status).json({
      error: apiError.message,
      code: apiError.code,
      details: apiError.details
    });
  }
});

function normalizeProvider(value: string): AiProvider | 'auto' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'openai' || normalized === 'gemini' || normalized === 'local') return normalized;
  return 'auto';
}

function resolveActiveProvider(provider: AiProvider | 'auto'): AiProvider {
  if (provider === 'local') return 'local';
  if (provider === 'openai') return hasOpenAiKey ? 'openai' : 'local';
  if (provider === 'gemini') return hasGeminiKey ? 'gemini' : 'local';
  if (hasOpenAiKey) return 'openai';
  if (hasGeminiKey) return 'gemini';
  return 'local';
}

function isAiReady() {
  return (activeProvider === 'openai' && Boolean(openai)) || (activeProvider === 'gemini' && Boolean(gemini));
}

function getActiveModelName() {
  if (activeProvider === 'gemini') return GEMINI_MODEL;
  if (activeProvider === 'openai') return OPENAI_MODEL;
  return 'mock-local-fallback';
}

// GESTORE DEL CHUNKING
async function generateCampaignWithChunking(brief: ReturnType<typeof normalizeBrief>) {
  console.log(`[SME v${APP_VERSION}] Step 1: Generazione contenuti CORE...`);
  const coreData = activeProvider === 'gemini'
    ? await generateWithGemini(brief, 'core')
    : await generateWithOpenAI(brief, 'core');

  let strategyData = createFallbackAnnualStrategy(brief); // Default di base

  if (brief.format === 'strategia-12-mesi') {
    console.log(`[SME v${APP_VERSION}] Step 2: Generazione STRATEGIA ANNUALE...`);
    strategyData = activeProvider === 'gemini'
      ? await generateWithGemini(brief, 'strategy')
      : await generateWithOpenAI(brief, 'strategy');
  }

  // Uniamo i due pezzi del puzzle
  return {
    ...coreData,
    annualStrategy: strategyData
  };
}

async function generateWithOpenAI(brief: ReturnType<typeof normalizeBrief>, taskType: TaskType) {
  if (!openai) throw new Error('OPENAI_API_KEY non configurata.');

  const schema = taskType === 'core' ? coreCampaignSchema : annualStrategySchema;
  
  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    instructions: SME_FOR_PMI_PROMPT,
    input: buildUserInput(brief, taskType),
    max_output_tokens: 5000, 
    text: {
      format: {
        type: 'json_schema',
        name: `sme_${taskType}_schema`,
        strict: true,
        schema: schema
      }
    }
  }, { timeout: 90_000 });

  const responseIssue = inspectOpenAIResponseIssue(response);
  if (responseIssue) {
    throw new AiProviderError(responseIssue.message, responseIssue.code, responseIssue.status, responseIssue.details);
  }

  const outputText = response.output_text;
  if (!outputText) throw new Error('AI_EMPTY_OUTPUT: La risposta OpenAI è vuota.');

  return JSON.parse(outputText);
}

async function generateWithGemini(brief: ReturnType<typeof normalizeBrief>, taskType: TaskType) {
  if (!gemini) throw new Error('GEMINI_API_KEY non configurata.');

  const schema = taskType === 'core' ? coreCampaignSchema : annualStrategySchema;

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildUserInput(brief, taskType),
    config: {
      systemInstruction: SME_FOR_PMI_PROMPT,
      maxOutputTokens: 8192,
      temperature: 0.7,
      responseMimeType: 'application/json',
      responseSchema: schema as any
    }
  });

  const outputText = extractGeminiText(response);
  if (!outputText) throw new Error('AI_EMPTY_OUTPUT: La risposta Gemini è vuota.');

  return JSON.parse(stripMarkdownJsonFence(outputText));
}

function extractGeminiText(response: any) {
  if (typeof response?.text === 'string') return response.text;
  if (typeof response?.text === 'function') return response.text();
  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) return parts.map((part: any) => part?.text || '').join('').trim();
  return '';
}

function stripMarkdownJsonFence(text: string) {
  return text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
}

class AiProviderError extends Error {
  code: string; status: number; details: unknown;
  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message); this.name = 'AiProviderError'; this.code = code; this.status = status; this.details = details;
  }
}

function normalizeBrief(body: any) {
  const platforms = Array.isArray(body?.platforms) ? body.platforms.filter((id: string) => platformLimits[id]) : [];
  const formatCandidate = String(body?.format || 'campagna-completa').trim();
  const companyProfile = body?.companyProfile && typeof body.companyProfile === 'object' ? body.companyProfile : {};

  return {
    masterText: safeString(body?.masterText, '', MAX_MASTER_TEXT_CHARS),
    platforms,
    brandName: safeString(body?.brandName, 'Azienda PMI', 120),
    sector: safeString(body?.sector, 'PMI e servizi professionali', 180),
    targetAudience: safeString(body?.targetAudience, 'imprenditori, professionisti e clienti finali', 240),
    objective: safeString(body?.objective, 'autorevolezza', 80),
    tone: safeString(body?.tone, 'competente-vicino', 80),
    format: validFormats.has(formatCandidate) ? formatCandidate : 'campagna-completa',
    callToAction: safeString(body?.callToAction, 'Contattaci per una consulenza iniziale.', 260),
    forbiddenClaims: safeString(body?.forbiddenClaims, 'Promesse assolute, risultati garantiti, guadagni certi.', 400),
    companyProfile: {
      positioning: safeString(companyProfile.positioning, '', 800),
      offer: safeString(companyProfile.offer, '', 800),
      brandVoice: safeString(companyProfile.brandVoice, '', 500),
      wordsToUse: safeString(companyProfile.wordsToUse, '', 400),
      wordsToAvoid: safeString(companyProfile.wordsToAvoid, '', 400),
      websiteOrContact: safeString(companyProfile.websiteOrContact, '', 300)
    }
  };
}

function safeString(value: any, fallback = '', maxLength = 1000) {
  const text = String(value ?? fallback).trim();
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function inspectOpenAIResponseIssue(response: any) {
  if (response?.status === 'incomplete') return { status: 502, code: 'AI_INCOMPLETE', message: 'Risposta troncata.', details: '' };
  return null;
}

function validateBrief(brief: ReturnType<typeof normalizeBrief>) {
  if (brief.masterText.length < 12) return { error: 'Testo master troppo breve.', code: 'INPUT_TOO_SHORT' };
  if (brief.masterText.length > MAX_MASTER_TEXT_CHARS) return { error: 'Testo master troppo lungo.', code: 'INPUT_TOO_LONG' };
  return null;
}

// ISTRUZIONI DINAMICHE PER IL CHUNKING
function buildUserInput(brief: ReturnType<typeof normalizeBrief>, taskType: TaskType) {
  const taskDescription = taskType === 'core' 
    ? 'Sei nello Step 1 (CORE). Genera SOLO la sintesi, gli avvisi, i ganci, i post per i canali e il calendario a breve termine. IGNORA la strategia 12 mesi.'
    : 'Sei nello Step 2 (STRATEGIA). Ignora i post singoli. Genera SOLO la strategia editoriale di 12 mesi (Diagnosi, trimestri e mesi) basata su questo brief.';

  return JSON.stringify({
    task: taskDescription,
    brief,
    requiredPlatforms: brief.platforms.map((platform: string) => ({
      id: platform,
      maxChars: platformLimits[platform]
    })),
    outputRules: [
      'Rispetta i limiti caratteri.',
      'Produci contenuti pubblicabili in italiano.',
      'Se il masterText contiene claim rischiosi, correggili e aggiungi warning.',
      'REGOLA CRITICA DI COMPLIANCE: Adotta un linguaggio prudente e fattuale. È VIETATO usare termini promissori o assoluti come "profittevole", "successo", "garantito", o espressioni come "proteggere l\'investimento", a meno che non siano supportati da dati inconfutabili forniti nel brief. Sostituisci questi termini con concetti basati su metodo, analisi e potenziale. Non fare mai promesse sui ritorni.',
      'PRECISIONE NUMERICA: Rispetta SEMPRE le liste e i numeri espliciti presenti nel brief. Se l\'utente indica 7 aspetti, 7 errori o 7 punti, ogni adattamento multicanale deve mantenere esattamente 7 punti, senza comprimerli, riassumerli o tagliarli autonomamente per motivi di formato.',
      'DATI QUANTITATIVI: Evita formule quantitative non supportate da dati (es. "può raddoppiare l\'investimento", "aumenta del 30%"). Preferisci formule prudenti come "può incidere molto", "può modificare il margine", o "può rendere l\'operazione meno sostenibile".'
    ]
  });
}

// SCHEMA 1: SOLO I CONTENUTI
const coreCampaignSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['engine', 'summary', 'warnings', 'hooks', 'posts', 'calendar'],
  properties: {
    engine: { type: 'string', enum: ['SME per PMI'] },
    summary: { type: 'string' },
    warnings: { type: 'array', items: { type: 'string' } },
    hooks: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 8 },
    posts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['platform', 'title', 'content', 'charCount', 'maxChars', 'hashtags', 'cta', 'assetIdea', 'riskLevel', 'notes'],
        properties: {
          platform: { type: 'string', enum: ['linkedin', 'instagram', 'facebook', 'tiktok', 'x'] },
          title: { type: 'string' },
          content: { type: 'string' },
          charCount: { type: 'number' },
          maxChars: { type: 'number' },
          hashtags: { type: 'array', items: { type: 'string' } },
          cta: { type: 'string' },
          assetIdea: { type: 'string' },
          riskLevel: { type: 'string', enum: ['basso', 'medio', 'alto'] },
          notes: { type: 'string' }
        }
      }
    },
    calendar: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'channel', 'format', 'topic', 'objective'],
        properties: {
          day: { type: 'string' },
          channel: { type: 'string', enum: ['linkedin', 'instagram', 'facebook', 'tiktok', 'x'] },
          format: { type: 'string' },
          topic: { type: 'string' },
          objective: { type: 'string' }
        }
      }
    }
  }
} as const;

// SCHEMA 2: SOLO LA STRATEGIA
const annualStrategySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['positioningDiagnosis', 'annualObjectives', 'editorialPillars', 'quarterlyPlan', 'monthlyThemes', 'sustainableCadence', 'kpis', 'reviewProcess'],
  properties: {
    positioningDiagnosis: { type: 'string' },
    annualObjectives: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 7 },
    editorialPillars: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 7 },
    quarterlyPlan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['quarter', 'focus', 'objectives', 'contentThemes'],
        properties: {
          quarter: { type: 'string' }, focus: { type: 'string' },
          objectives: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
          contentThemes: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 }
        }
      }
    },
    monthlyThemes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['month', 'theme', 'campaignIdea', 'mainKpi'],
        properties: {
          month: { type: 'string' }, theme: { type: 'string' },
          campaignIdea: { type: 'string' }, mainKpi: { type: 'string' }
        }
      }
    },
    sustainableCadence: { type: 'string' },
    kpis: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 8 },
    reviewProcess: { type: 'string' }
  }
} as const;

function classifyGenerationError(error: unknown) {
  if (error instanceof AiProviderError) return { status: error.status, code: error.code, message: error.message, details: error.details };
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes('timeout')) return { status: 504, code: 'AI_TIMEOUT', message: 'La generazione ha richiesto troppo tempo.', details: 'Riprova.' };
  if (lower.includes('schema') || lower.includes('parse')) return { status: 502, code: 'AI_SCHEMA_ERROR', message: 'Errore schema AI.', details: message };
  return { status: 500, code: 'AI_GENERATION_ERROR', message: 'Errore interno.', details: message };
}

function sanitizeCampaign(campaign: any, requestedPlatforms: string[]) {
  const posts = Array.isArray(campaign.posts) ? campaign.posts : [];
  const sanitizedPosts = posts
    .filter((post: any) => requestedPlatforms.includes(post.platform))
    .map((post: any) => ({
      ...post,
      content: String(post.content || ''),
      maxChars: platformLimits[post.platform] || Number(post.maxChars || 0),
      charCount: String(post.content || '').length,
      hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
      riskLevel: ['basso', 'medio', 'alto'].includes(post.riskLevel) ? post.riskLevel : 'medio'
    }));

  return {
    engine: 'SME per PMI',
    summary: String(campaign.summary || ''),
    warnings: Array.isArray(campaign.warnings) ? campaign.warnings.map(String) : [],
    hooks: Array.isArray(campaign.hooks) ? campaign.hooks.map(String) : [],
    posts: sanitizedPosts,
    calendar: sanitizeCalendar(campaign.calendar, requestedPlatforms),
    annualStrategy: sanitizeAnnualStrategy(campaign.annualStrategy)
  };
}

function sanitizeCalendar(calendar: any, requestedPlatforms: string[]) {
  if (!Array.isArray(calendar)) return [];
  return calendar.filter((item: any) => requestedPlatforms.includes(item?.channel)).map((item: any) => ({
    day: String(item.day || ''), channel: item.channel, format: String(item.format || ''), topic: String(item.topic || ''), objective: String(item.objective || '')
  }));
}

function sanitizeAnnualStrategy(strategy: any) {
  const fallback = createFallbackAnnualStrategy({} as any);
  if (!strategy || typeof strategy !== 'object') return fallback;
  return {
    positioningDiagnosis: String(strategy.positioningDiagnosis || ''),
    annualObjectives: Array.isArray(strategy.annualObjectives) ? strategy.annualObjectives.map(String) : [],
    editorialPillars: Array.isArray(strategy.editorialPillars) ? strategy.editorialPillars.map(String) : [],
    quarterlyPlan: Array.isArray(strategy.quarterlyPlan) ? strategy.quarterlyPlan : [],
    monthlyThemes: Array.isArray(strategy.monthlyThemes) ? strategy.monthlyThemes : [],
    sustainableCadence: String(strategy.sustainableCadence || ''),
    kpis: Array.isArray(strategy.kpis) ? strategy.kpis.map(String) : [],
    reviewProcess: String(strategy.reviewProcess || '')
  };
}

function createFallbackCampaign(brief: any) {
  return {
    engine: 'SME per PMI',
    summary: 'Campagna fallback locale.',
    warnings: [], hooks: [], posts: [], calendar: [],
    annualStrategy: createFallbackAnnualStrategy(brief)
  };
}

function createFallbackAnnualStrategy(brief: any) {
  return {
    positioningDiagnosis: 'Fallback...', annualObjectives: [], editorialPillars: [],
    quarterlyPlan: [], monthlyThemes: [], sustainableCadence: '', kpis: [], reviewProcess: ''
  };
}

app.listen(PORT, HOST, () => {
  console.log(`MultiPost Pro SME backend v${APP_VERSION} running on http://${HOST}:${PORT}`);
});