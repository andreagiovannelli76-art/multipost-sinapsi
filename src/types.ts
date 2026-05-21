export type PlatformId = 'linkedin' | 'instagram' | 'facebook' | 'tiktok' | 'x';

export type CampaignObjective =
  | 'autorevolezza'
  | 'lead'
  | 'vendita'
  | 'educazione'
  | 'community'
  | 'recruiting';

export type Tone =
  | 'competente-vicino'
  | 'istituzionale'
  | 'diretto'
  | 'premium'
  | 'educativo'
  | 'provocatorio-controllato';

export type FormatMode =
  | 'post-singolo'
  | 'campagna-completa'
  | 'carosello'
  | 'script-video'
  | 'newsletter-breve'
  | 'strategia-12-mesi';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  shortName: string;
  maxChars: number;
  description: string;
}

export interface CompanyProfile {
  positioning: string;
  offer: string;
  brandVoice: string;
  wordsToUse: string;
  wordsToAvoid: string;
  websiteOrContact: string;
}

export interface CampaignBrief {
  masterText: string;
  platforms: PlatformId[];
  brandName: string;
  sector: string;
  targetAudience: string;
  objective: CampaignObjective;
  tone: Tone;
  format: FormatMode;
  callToAction: string;
  forbiddenClaims: string;
  companyProfile: CompanyProfile;
}

export interface GeneratedPost {
  platform: PlatformId;
  title: string;
  content: string;
  charCount: number;
  maxChars: number;
  hashtags: string[];
  cta: string;
  assetIdea: string;
  riskLevel: 'basso' | 'medio' | 'alto';
  notes: string;
}

export interface CalendarItem {
  day: string;
  channel: PlatformId;
  format: string;
  topic: string;
  objective: string;
}

export interface QuarterlyPlanItem {
  quarter: string;
  focus: string;
  objectives: string[];
  contentThemes: string[];
}

export interface MonthlyThemeItem {
  month: string;
  theme: string;
  campaignIdea: string;
  mainKpi: string;
}

export interface AnnualStrategy {
  positioningDiagnosis: string;
  annualObjectives: string[];
  editorialPillars: string[];
  quarterlyPlan: QuarterlyPlanItem[];
  monthlyThemes: MonthlyThemeItem[];
  sustainableCadence: string;
  kpis: string[];
  reviewProcess: string;
}

export interface CampaignResult {
  engine: 'SME per PMI';
  summary: string;
  warnings: string[];
  hooks: string[];
  posts: GeneratedPost[];
  calendar: CalendarItem[];
  annualStrategy: AnnualStrategy;
}

export interface Draft {
  id: string;
  createdAt: string;
  brief: CampaignBrief;
  result: CampaignResult | null;
}

export interface ApiErrorPayload {
  error: string;
  code?: string;
  details?: string;
  fallbackData?: CampaignResult;
}
