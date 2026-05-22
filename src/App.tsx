import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Loader2,
  MessageSquareText,
  Paperclip,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wand2
} from 'lucide-react';
import { APP_CONFIG, DEFAULT_PLATFORMS, getPlatform, PLATFORMS } from './config';
import type { CampaignBrief, CampaignObjective, CampaignResult, Draft, FormatMode, PlatformId, Tone } from './types';
import { generateCampaign, checkHealth } from './lib/api';
import { briefStorage, downloadTextFile, draftStorage } from './lib/storage';

const defaultBrief: CampaignBrief = {
  masterText: '',
  platforms: DEFAULT_PLATFORMS,
  brandName: 'Sinapsi Real Estate',
  sector: 'Investimenti immobiliari e valorizzazione',
  targetAudience: 'Investitori immobiliari, imprenditori, proprietari e investitori esteri',
  objective: 'educazione',
  tone: 'premium',
  format: 'campagna-completa',
  callToAction: 'Scrivici per una valutazione iniziale della tua operazione.',
  forbiddenClaims: 'affare sicuro, guadagno garantito, rischio zero, occasione imperdibile, soldi facili',
  companyProfile: {
    positioning: 'Sinapsi Real Estate non vende occasioni immobiliari. Costruisce operazioni immobiliari ragionate, valutando prezzo, rischio, lavori, tempi, mercato e margine prima di decidere.',
    offer: 'Consulenza strategica per investimenti immobiliari, analisi operazioni, ristrutturazione e valorizzazione.',
    brandVoice: 'Professionale, chiaro, concreto, non aggressivo. Linguaggio estremamente prudente sui risultati.',
    wordsToUse: 'operazioni ragionate, maggiore consapevolezza, margine realistic, operazione più controllata, metodo, rischio, valore, analisi, numeri, strategia',
    wordsToAvoid: 'affare sicuro, guadagno garantito, rischio zero, occasione imperdibile, soldi facili, operazioni solide, dormire sonni più tranquilli, potenziale guadagno effettivo, operazione più sicura, è una scienza, il mercato non perdona',
    websiteOrContact: 'www.sinapsirealestatesrl.it | a.giovannelli@sinapsirealestatesrl.it | +39 348 479 1772'
  }
};

const objectives: CampaignObjective[] = ['autorevolezza', 'lead', 'vendita', 'educazione', 'community', 'recruiting'];
const tones: Tone[] = ['competente-vicino', 'istituzionale', 'diretto', 'premium', 'educativo', 'provocatorio-controllato'];
const formats: FormatMode[] = ['post-singolo', 'campagna-completa', 'carosello', 'script-video', 'newsletter-breve', 'strategia-12-mesi'];

const generationSteps = [
  'Analisi del brief aziendale...',
  'Verifica di tono, target e posizionamento...',
  'Costruzione dei pilastri editoriali...',
  'Adattamento dei contenuti ai canali selezionati...',
  'Controllo claim rischiosi e coerenza SME...',
  'Preparazione output strutturato e calendario...'
];

type Tab = 'create' | 'calendar' | 'drafts' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('create');
  const [brief, setBrief] = useState<CampaignBrief>(defaultBrief);
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [generationMessageIndex, setGenerationMessageIndex] = useState(0);
  const [apiStatus, setApiStatus] = useState<{ ok: boolean; aiReady: boolean; provider?: string; model?: string } | null>(null);

  // STATO PER GLI ALLEGATI (Mappati per ID del post)
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});

  const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/1dhnn57w47bjq1wel62rphamo2bhnebo';

  useEffect(() => {
    setDrafts(draftStorage.list());
    checkHealth().then(setApiStatus).catch(() => setApiStatus({ ok: false, aiReady: false }));
  }, []);

  useEffect(() => {
    const autosaveTimer = window.setTimeout(() => {
      try {
        briefStorage.save(brief);
      } catch (error) {
        console.warn('[BRIEF_AUTOSAVE_ERROR]', error);
      }
    }, 1000);
    return () => window.clearTimeout(autosaveTimer);
  }, [brief]);

  useEffect(() => {
    if (!isGenerating) {
      setGenerationMessageIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setGenerationMessageIndex(index => Math.min(index + 1, generationSteps.length - 1));
    }, 2600);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGenerating]);

  const selectedPostCount = result?.posts.length ?? 0;
  const canGenerate = brief.masterText.trim().length > 5 && brief.platforms.length > 0 && !isGenerating;
  const briefQualityWarnings = getBriefQualityWarnings(brief);

  const riskCount = useMemo(() => {
    if (!result) return 0;
    return result.posts.filter(post => post.riskLevel !== 'basso').length + result.warnings.length;
  }, [result]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const updateBrief = <K extends keyof CampaignBrief>(key: K, value: CampaignBrief[K]) => {
    setBrief(prev => ({ ...prev, [key]: value }));
  };

  const updateCompanyProfile = <K extends keyof CampaignBrief['companyProfile']>(key: K, value: CampaignBrief['companyProfile'][K]) => {
    setBrief(prev => ({
      ...prev,
      companyProfile: { ...prev.companyProfile, [key]: value }
    }));
  };

  const togglePlatform = (platform: PlatformId) => {
    updateBrief(
      'platforms',
      brief.platforms.includes(platform)
        ? brief.platforms.filter(item => item !== platform)
        : [...brief.platforms, platform]
    );
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setResult(null);
    setCopiedId(null);
    setSelectedFiles({}); // Resetta gli allegati precedenti

    try {
      const campaign = await generateCampaign(brief);
      setResult(campaign);
      setTab('create');
      showToast('Campagna generata con SME per PMI.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Errore nella generazione.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      showToast('Testo copiato negli appunti.');
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      showToast('Copia non riuscita.');
    }
  };

  const handleFileChange = (postId: string, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [postId]: file }));
    if (file) showToast(`File "${file.name}" pronto per l'invio.`);
  };

  // FUNZIONE AUSILIARIA PER TRASFORMARE IL FILE IN BASE64 (ORA PULITA PER MAKE)
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  // FUNZIONE SPEDIZIONE AVANZATA (TESTO + ALLEGATO OMNI)
  const handleSendToMake = async (post: any) => {
    const copyId = `${post.platform}-${post.title}`;
    const attachedFile = selectedFiles[copyId];

    try {
      showToast('Preparazione pacchetto in corso...');
      
      let filePayload = null;

      if (attachedFile) {
        showToast('Conversione allegato in testo (Base64)...');
        const base64Data = await convertFileToBase64(attachedFile);
        filePayload = {
          base64: base64Data,
          name: attachedFile.name,
          type: attachedFile.type,
          size: attachedFile.size
        };
      }

      showToast('Spedizione a Make...');
      const payload = {
        brand: brief.brandName,
        platform: post.platform,
        title: post.title,
        content: post.content,
        cta: post.cta,
        assetIdea: post.assetIdea,
        notes: post.notes,
        timestamp: new Date().toISOString(),
        file: filePayload
      };

      const res = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('🚀 Post e Allegato inviati con successo a Make!');
      } else {
        showToast('Errore durante l\'invio del pacchetto.');
      }
    } catch (error) {
      showToast('Errore di connessione o conversione file.');
      console.error(error);
    }
  };

  const handleSaveDraft = () => {
    const draft: Draft = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), brief, result };
    try {
      const updated = draftStorage.save(draft);
      setDrafts(updated);
      showToast('Bozza salvata.');
    } catch (error) {
      showToast('Salvataggio non riuscito.');
    }
  };

  const handleLoadDraft = (draft: Draft) => {
    setBrief(draft.brief);
    setResult(draft.result);
    setTab('create');
    showToast('Bozza caricata.');
  };

  const handleDeleteDraft = (id: string) => {
    try {
      const updated = draftStorage.remove(id);
      setDrafts(updated);
      showToast('Bozza eliminata.');
    } catch (error) {
      showToast('Eliminazione non riuscita.');
    }
  };

  const exportDrafts = () => {
    downloadTextFile(`multipost-pro-sme-backup-${new Date().toISOString().slice(0, 10)}.json`, draftStorage.exportJson());
  };

  const exportMarkdown = () => {
    if (!result) return;
    const isStrategyFallback = result.annualStrategy?.positioningDiagnosis?.includes('Fallback');
    const markdown = toMarkdown(brief, result, isStrategyFallback);
    downloadTextFile(`campagna-sme-${new Date().toISOString().slice(0, 10)}.md`, markdown, 'text/markdown');
  };

  const importDrafts = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      setDrafts(draftStorage.importJson(text));
      showToast('Bozze importate.');
    } catch (error) {
      showToast('Import non riuscito.');
    }
  };

  const clearAllDrafts = () => {
    if (!window.confirm('Vuoi eliminare tutte le bozze locali?')) return;
    draftStorage.clear();
    setDrafts([]);
    showToast('Archivio locale svuotato.');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-icon"><Wand2 size={22} /></div>
          <div>
            <h1>{APP_CONFIG.name} v2.5.0 (Omni-Attachment)</h1>
            <p>{APP_CONFIG.payoff}</p>
          </div>
        </div>
        <div className="status-pills">
          <span className="pill strong"><Sparkles size={14} /> {APP_CONFIG.engineName}</span>
          <span className={`pill ${apiStatus?.aiReady ? 'ok' : 'warn'}`}>
            <Gauge size={14} /> {apiStatus?.aiReady ? `AI reale · ${apiStatus.provider} · ${apiStatus.model}` : 'Fallback locale'}
          </span>
          <a className="pill link-pill" href={APP_CONFIG.smeGptUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> GPT originale</a>
        </div>
      </header>

      <nav className="tabs">
        <button disabled={isGenerating} className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}><MessageSquareText size={18} /> Crea</button>
        <button disabled={isGenerating} className={tab === 'calendar' ? 'active' : ''} onClick={() => setTab('calendar')}><CalendarDays size={18} /> Calendario</button>
        <button disabled={isGenerating} className={tab === 'drafts' ? 'active' : ''} onClick={() => setTab('drafts')}><FileText size={18} /> Bozze</button>
        <button disabled={isGenerating} className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings size={18} /> Dati</button>
      </nav>

      <main className="layout">
        {tab === 'create' && (
          <>
            <section className="panel brief-panel">
              <div className="section-title">
                <h2>Brief editoriale</h2>
                <button className="secondary-action" onClick={() => { briefStorage.clear(); setBrief(defaultBrief); }}>Reset</button>
              </div>

              <label className="field full">
                <span>Testo master</span>
                <textarea value={brief.masterText} onChange={event => updateBrief('masterText', event.target.value)} placeholder="Scrivi l'idea..." rows={7} />
              </label>

              {briefQualityWarnings.length > 0 && (
                <div className="input-quality-box">
                  <strong>Brief migliorabile</strong>
                  <ul>{briefQualityWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
                </div>
              )}

              <div className="grid two">
                <label className="field"><span>Brand</span><input value={brief.brandName} onChange={event => updateBrief('brandName', event.target.value)} /></label>
                <label className="field"><span>Settore</span><input value={brief.sector} onChange={event => updateBrief('sector', event.target.value)} /></label>
              </div>
              <label className="field full"><span>Target</span><input value={brief.targetAudience} onChange={event => updateBrief('targetAudience', event.target.value)} /></label>

              <div className="company-profile-box">
                <div className="grid two">
                  <label className="field"><span>Posizionamento</span><input value={brief.companyProfile.positioning} onChange={event => updateCompanyProfile('positioning', event.target.value)} /></label>
                  <label className="field"><span>Offerta</span><input value={brief.companyProfile.offer} onChange={event => updateCompanyProfile('offer', event.target.value)} /></label>
                </div>
                <div className="grid two">
                  <label className="field"><span>Brand voice</span><input value={brief.companyProfile.brandVoice} onChange={event => updateCompanyProfile('brandVoice', event.target.value)} /></label>
                  <label className="field"><span>Contatti</span><input value={brief.companyProfile.websiteOrContact} onChange={event => updateCompanyProfile('websiteOrContact', event.target.value)} /></label>
                </div>
              </div>

              <div className="grid three">
                <label className="field">
                  <span>Obiettivo</span>
                  <select value={brief.objective} onChange={event => updateBrief('objective', event.target.value as CampaignObjective)}>
                    {objectives.map(item => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Tono</span>
                  <select value={brief.tone} onChange={event => updateBrief('tone', event.target.value as Tone)}>
                    {tones.map(item => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Formato</span>
                  <select value={brief.format} onChange={event => updateBrief('format', event.target.value as FormatMode)}>
                    {formats.map(item => <option key={item} value={item}>{labelize(item)}</option>)}
                  </select>
                </label>
              </div>

              <div className="platform-grid">
                {PLATFORMS.map(platform => {
                  const selected = brief.platforms.includes(platform.id);
                  return (
                    <button key={platform.id} className={`platform-card ${selected ? 'selected' : ''}`} onClick={() => togglePlatform(platform.id)} type="button">
                      <strong>{platform.shortName}</strong>
                    </button>
                  );
                })}
              </div>

              <div className="action-row">
                <button className="primary-action" disabled={!canGenerate} onClick={handleGenerate}>
                  {isGenerating ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />} Genera
                </button>
                <button className="secondary-action" onClick={handleSaveDraft}><Save size={18} /> Salva bozza</button>
              </div>
            </section>

            <section className="panel output-panel">
              <div className="section-title">
                <h2>Output multicanale</h2>
                <button className="secondary-action" disabled={!result} onClick={exportMarkdown}><Download size={18} /> MD</button>
              </div>

              {isGenerating && (
                <div className="generation-state">
                  <Loader2 className="spin" size={34} />
                  <h3>{generationSteps[generationMessageIndex]}</h3>
                </div>
              )}

              {!result && !isGenerating && (
                <div className="empty-state"><Sparkles size={42} /><h3>Nessuna campagna</h3></div>
              )}

              {result && (
                <div className="result-stack">
                  <div className="summary-box"><strong>Sintesi</strong><p>{result.summary}</p></div>
                  <AnnualStrategyPanel strategy={result.annualStrategy} compact={brief.format !== 'strategia-12-mesi'} />

                  {result.posts.map(post => {
                    const platform = getPlatform(post.platform);
                    const copyId = `${post.platform}-${post.title}`;
                    const attachedFile = selectedFiles[copyId];

                    return (
                      <article className="post-card" key={copyId}>
                        <div className="post-head">
                          <h3>{platform.name} - {post.title}</h3>
                        </div>

                        <textarea
                          value={post.content}
                          onChange={event => {
                            const nextContent = event.target.value;
                            setResult(prev => !prev ? prev : {
                              ...prev,
                              posts: prev.posts.map(item => item.platform === post.platform ? { ...item, content: nextContent, charCount: nextContent.length } : item)
                            });
                          }}
                          rows={8}
                        />

                        {/* ROW COLLAFA FILE INTEGRATA */}
                        <div className="file-upload-zone" style={{ margin: '12px 0', padding: '8px', background: '#f8fafc', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <label className="secondary-action" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0, fontSize: '13px' }}>
                            <Paperclip size={16} />
                            {attachedFile ? 'Cambia File' : 'Collega qualsiasi file...'}
                            <input type="file" style={{ display: 'none' }} onChange={e => handleFileChange(copyId, e.target.files?.[0] || null)} />
                          </label>
                          {attachedFile && (
                            <span style={{ fontSize: '13px', color: '#334155', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              📁 {attachedFile.name} ({Math.round(attachedFile.size / 1024)} KB)
                              <Trash2 size={14} style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => handleFileChange(copyId, null)} />
                            </span>
                          )}
                        </div>

                        <div className="post-actions">
                          <button className="secondary-action" onClick={() => handleSendToMake(post)}><Send size={18} /> Invia a Make</button>
                          <button className="secondary-action" onClick={() => handleCopy(copyId, post.content)}><Check size={18} /> Copia</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'calendar' && <section className="panel full-panel"><h2>Calendario</h2></section>}
        {tab === 'drafts' && <section className="panel full-panel"><h2>Bozze</h2></section>}
        {tab === 'settings' && <section className="panel full-panel"><h2>Impostazioni</h2></section>}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function AnnualStrategyPanel({ strategy, compact }: { strategy: any; compact: boolean }) {
  if (!strategy || strategy.positioningDiagnosis === 'Fallback...') return null;
  return (
    <section className="annual-strategy-panel">
      <h3>Piano Annuale</h3>
      <p>{strategy.positioningDiagnosis}</p>
    </section>
  );
}

function getBriefQualityWarnings(brief: CampaignBrief) {
  return [];
}
function labelize(value: string) {
  return value.toUpperCase();
}
function toMarkdown(brief: any, result: any, fb: boolean) {
  return '';
}