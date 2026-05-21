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
  Save,
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

// 1. DATI SINAPSI HARDCODATI QUI
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
    brandVoice: 'Professionale, chiaro, concreto, non aggressivo.',
    wordsToUse: 'metodo, rischio, margine, valore, operazione, analisi, controllo, ristrutturazione, valorizzazione, numeri, strategia',
    wordsToAvoid: 'affare sicuro, guadagno garantito, rischio zero, occasione imperdibile, soldi facili',
    websiteOrContact: '[Inserisci qui Link o Email Sinapsi]'
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
  
  // 2. MODIFICA TATTICA: Disabilitato il caricamento dalla memoria locale 
  // in modo che ricarichi SEMPRE i default di Sinapsi ad ogni avvio.
  const [brief, setBrief] = useState<CampaignBrief>(defaultBrief);
  
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [generationMessageIndex, setGenerationMessageIndex] = useState(0);
  const [apiStatus, setApiStatus] = useState<{ ok: boolean; aiReady: boolean; provider?: string; model?: string } | null>(null);

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
      companyProfile: {
        ...prev.companyProfile,
        [key]: value
      }
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
      showToast('Copia non riuscita. Seleziona e copia manualmente il testo.');
    }
  };

  const handleSaveDraft = () => {
    const draft: Draft = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      brief,
      result
    };

    try {
      const updated = draftStorage.save(draft);
      setDrafts(updated);
      showToast('Bozza salvata.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Salvataggio non riuscito.');
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
      showToast(error instanceof Error ? error.message : 'Eliminazione non riuscita.');
    }
  };

  const exportDrafts = () => {
    const fileName = `multipost-pro-sme-backup-${new Date().toISOString().slice(0, 10)}.json`;
    downloadTextFile(fileName, draftStorage.exportJson());
  };

  const exportMarkdown = () => {
    if (!result) return;
    const markdown = toMarkdown(brief, result);
    downloadTextFile(`campagna-sme-${new Date().toISOString().slice(0, 10)}.md`, markdown, 'text/markdown');
  };

  const importDrafts = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const imported = draftStorage.importJson(text);
      setDrafts(imported);
      showToast('Bozze importate.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Import non riuscito.');
    }
  };

  const clearAllDrafts = () => {
    const ok = window.confirm('Vuoi eliminare tutte le bozze locali?');
    if (!ok) return;

    try {
      draftStorage.clear();
      setDrafts([]);
      showToast('Archivio locale svuotato.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Operazione non riuscita.');
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-icon"><Wand2 size={22} /></div>
          <div>
            <h1>{APP_CONFIG.name}</h1>
            <p>{APP_CONFIG.payoff}</p>
          </div>
        </div>
        <div className="status-pills">
          <span className="pill strong"><Sparkles size={14} /> {APP_CONFIG.engineName}</span>
          <span className={`pill ${apiStatus?.aiReady ? 'ok' : 'warn'}`}>
            <Gauge size={14} /> {apiStatus?.aiReady ? `AI reale · ${apiStatus.provider || 'provider'} · ${apiStatus.model}` : 'Fallback locale'}
          </span>
          <a className="pill link-pill" href={APP_CONFIG.smeGptUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} /> GPT originale
          </a>
          <a className="pill link-pill" href={APP_CONFIG.strategy12GptUrl} target="_blank" rel="noopener noreferrer">
            <CalendarDays size={14} /> Strategia 12 mesi
          </a>
        </div>
      </header>

      <nav className="tabs" aria-label="Navigazione principale">
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
                <div>
                  <h2>Brief editoriale</h2>
                  <p>Parti da un'idea e lascia che SME per PMI la trasformi in contenuti per ogni canale.</p>
                </div>
                <div className="inline-actions">
                  <a className="secondary-action" href={APP_CONFIG.smeGptUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={18} /> GPT originale
                  </a>
                  <a className="secondary-action" href={APP_CONFIG.strategy12GptUrl} target="_blank" rel="noopener noreferrer">
                    <CalendarDays size={18} /> Strategia 12 mesi
                  </a>
                  <button className="secondary-action" onClick={() => { briefStorage.clear(); setBrief(defaultBrief); }}>Reset</button>
                </div>
              </div>

              <label className="field full">
                <span>Testo master</span>
                <textarea
                  value={brief.masterText}
                  onChange={event => updateBrief('masterText', event.target.value)}
                  placeholder="Esempio: prezzo basso non significa buon affare. Nel business immobiliare serve leggere tutta l'operazione, non solo il prezzo iniziale..."
                  rows={7}
                />
              </label>

              {briefQualityWarnings.length > 0 && (
                <div className="input-quality-box">
                  <strong>Brief migliorabile</strong>
                  <ul>{briefQualityWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
                </div>
              )}

              <div className="grid two">
                <label className="field">
                  <span>Brand</span>
                  <input value={brief.brandName} onChange={event => updateBrief('brandName', event.target.value)} />
                </label>
                <label className="field">
                  <span>Settore</span>
                  <input value={brief.sector} onChange={event => updateBrief('sector', event.target.value)} />
                </label>
              </div>

              <label className="field full">
                <span>Target</span>
                <input value={brief.targetAudience} onChange={event => updateBrief('targetAudience', event.target.value)} />
              </label>

              <div className="company-profile-box">
                <div className="mini-section-title">
                  <strong>Scheda aziendale</strong>
                  <span>Sostituisce i Knowledge file del GPT quando lavori dentro l’app.</span>
                </div>
                <div className="grid two">
                  <label className="field">
                    <span>Posizionamento</span>
                    <input value={brief.companyProfile.positioning} onChange={event => updateCompanyProfile('positioning', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Offerta / servizi</span>
                    <input value={brief.companyProfile.offer} onChange={event => updateCompanyProfile('offer', event.target.value)} />
                  </label>
                </div>
                <div className="grid two">
                  <label className="field">
                    <span>Brand voice</span>
                    <input value={brief.companyProfile.brandVoice} onChange={event => updateCompanyProfile('brandVoice', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Sito / contatto</span>
                    <input value={brief.companyProfile.websiteOrContact} onChange={event => updateCompanyProfile('websiteOrContact', event.target.value)} />
                  </label>
                </div>
                <div className="grid two">
                  <label className="field">
                    <span>Parole da usare</span>
                    <input value={brief.companyProfile.wordsToUse} onChange={event => updateCompanyProfile('wordsToUse', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Parole da evitare</span>
                    <input value={brief.companyProfile.wordsToAvoid} onChange={event => updateCompanyProfile('wordsToAvoid', event.target.value)} />
                  </label>
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

              {brief.format === 'strategia-12-mesi' && (
                <div className="annual-mode-box">
                  <strong>Modalità Strategia Editoriale 12 Mesi attiva</strong>
                  <p>Il motore SME genererà diagnosi, obiettivi annuali, pilastri editoriali, trimestri, temi mensili, calendario sostenibile, KPI e processo di revisione.</p>
                </div>
              )}

              <div className="platform-grid">
                {PLATFORMS.map(platform => {
                  const selected = brief.platforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      className={`platform-card ${selected ? 'selected' : ''}`}
                      onClick={() => togglePlatform(platform.id)}
                      type="button"
                    >
                      <strong>{platform.shortName}</strong>
                      <span>{platform.description}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid two">
                <label className="field">
                  <span>CTA preferita</span>
                  <input value={brief.callToAction} onChange={event => updateBrief('callToAction', event.target.value)} />
                </label>
                <label className="field">
                  <span>Claim da evitare</span>
                  <input value={brief.forbiddenClaims} onChange={event => updateBrief('forbiddenClaims', event.target.value)} />
                </label>
              </div>

              <div className="action-row">
                <button className="primary-action" disabled={!canGenerate} onClick={handleGenerate}>
                  {isGenerating ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                  {isGenerating ? 'Generazione in corso...' : 'Genera con SME per PMI'}
                </button>
                <button className="secondary-action" onClick={handleSaveDraft}><Save size={18} /> Salva bozza</button>
              </div>
            </section>

            <section className="panel output-panel">
              <div className="section-title">
                <div>
                  <h2>Output multicanale</h2>
                  <p>{result ? `${selectedPostCount} contenuti generati · ${riskCount} avvisi da controllare` : 'Qui compariranno testi, hook, note e asset consigliati.'}</p>
                </div>
                <button className="secondary-action" disabled={!result} onClick={exportMarkdown}><Download size={18} /> MD</button>
              </div>

              {isGenerating && (
                <div className="generation-state">
                  <Loader2 className="spin" size={34} />
                  <h3>{generationSteps[generationMessageIndex]}</h3>
                  <p>La strategia 12 mesi può richiedere più tempo: stiamo mantenendo output strutturato e controlli di coerenza.</p>
                  <div className="progress-track"><span style={{ width: `${((generationMessageIndex + 1) / generationSteps.length) * 100}%` }} /></div>
                </div>
              )}

              {!result && !isGenerating && (
                <div className="empty-state">
                  <Sparkles size={42} />
                  <h3>Nessuna campagna generata</h3>
                  <p>Compila il brief e genera una campagna per vedere le versioni adattate.</p>
                </div>
              )}

              {result && (
                <div className="result-stack">
                  <div className="summary-box">
                    <strong>Sintesi strategica</strong>
                    <p>{result.summary}</p>
                  </div>

                  {result.warnings.length > 0 && (
                    <div className="warning-box">
                      <AlertTriangle size={18} />
                      <div>
                        <strong>Controlli consigliati</strong>
                        <ul>{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
                      </div>
                    </div>
                  )}

                  <div className="hooks-box">
                    <strong>Hook alternativi</strong>
                    <div className="hook-list">
                      {result.hooks.map((hook, index) => <span key={index}>{hook}</span>)}
                    </div>
                  </div>

                  <AnnualStrategyPanel strategy={result.annualStrategy} compact={brief.format !== 'strategia-12-mesi'} />

                  {result.posts.map(post => {
                    const platform = getPlatform(post.platform);
                    const overLimit = post.charCount > post.maxChars;
                    const copyId = `${post.platform}-${post.title}`;
                    return (
                      <article className="post-card" key={copyId}>
                        <div className="post-head">
                          <div>
                            <span className="channel-label">{platform.name}</span>
                            <h3>{post.title}</h3>
                          </div>
                          <span className={`char-count ${overLimit ? 'danger' : ''}`}>{post.charCount}/{post.maxChars}</span>
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
                          rows={platform.id === 'tiktok' ? 10 : 8}
                        />

                        <div className="post-meta">
                          <span><strong>CTA:</strong> {post.cta}</span>
                          <span><strong>Asset:</strong> {post.assetIdea}</span>
                          <span><strong>Rischio:</strong> {post.riskLevel}</span>
                          <span><strong>Note:</strong> {post.notes}</span>
                          {post.hashtags.length > 0 && <span><strong>Hashtag:</strong> {post.hashtags.join(' ')}</span>}
                        </div>

                        <div className="post-actions">
                          <button className="secondary-action" onClick={() => handleCopy(copyId, post.content)}>
                            {copiedId === copyId ? <Check size={18} /> : <Copy size={18} />}
                            {copiedId === copyId ? 'Copiato' : 'Copia'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'calendar' && (
          <section className="panel full-panel">
            <div className="section-title">
              <div>
                <h2>Calendario editoriale</h2>
                <p>Sequenza consigliata per pubblicare senza sovraccaricare i canali.</p>
              </div>
              <BarChart3 size={24} />
            </div>
            {!result?.calendar.length ? (
              <div className="empty-state"><CalendarDays size={42} /><h3>Calendario non ancora disponibile</h3><p>Genera prima una campagna.</p></div>
            ) : (
              <div className="calendar-list">
                {result.calendar.map((item, index) => (
                  <div className="calendar-item" key={`${item.day}-${index}`}>
                    <strong>{item.day}</strong>
                    <span>{getPlatform(item.channel).name}</span>
                    <p>{item.topic}</p>
                    <small>{item.format} · {item.objective}</small>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'drafts' && (
          <section className="panel full-panel">
            <div className="section-title">
              <div>
                <h2>Bozze locali</h2>
                <p>Salvate sul dispositivo. Per produzione reale conviene passare a database cloud.</p>
              </div>
              <div className="inline-actions">
                <button className="secondary-action" onClick={exportDrafts}><Download size={18} /> Backup</button>
                <button className="danger-action" onClick={clearAllDrafts}><Trash2 size={18} /> Svuota</button>
              </div>
            </div>

            {drafts.length === 0 ? (
              <div className="empty-state"><FileText size={42} /><h3>Nessuna bozza</h3><p>Salva una campagna per ritrovarla qui.</p></div>
            ) : (
              <div className="draft-list">
                {drafts.map(draft => (
                  <article className="draft-card" key={draft.id}>
                    <div>
                      <strong>{draft.brief.brandName}</strong>
                      <p>{draft.brief.masterText || 'Bozza senza testo master'}</p>
                      <small>{new Date(draft.createdAt).toLocaleString('it-IT')} · {draft.brief.platforms.map(getPlatform).map(p => p.shortName).join(', ')}</small>
                    </div>
                    <div className="inline-actions">
                      <button className="secondary-action" onClick={() => handleLoadDraft(draft)}>Apri</button>
                      <button className="danger-action" onClick={() => handleDeleteDraft(draft.id)}><Trash2 size={18} /></button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'settings' && (
          <section className="panel full-panel">
            <div className="section-title">
              <div>
                <h2>Dati, privacy e integrazione SME</h2>
                <p>Versione 2.3.5: gestione provider OpenAI/Gemini, scheda aziendale, loader progressivo e storage locale più robusto.</p>
              </div>
              <ShieldCheck size={24} />
            </div>

            <div className="settings-grid">
              <div className="settings-card">
                <h3>Motore AI interno</h3>
                <p><strong>{APP_CONFIG.engineName}</strong></p>
                <p>Il prompt è in <code>server/smePrompt.ts</code>. Incolla lì le istruzioni esatte del tuo GPT personalizzato per allineare il comportamento.</p>
              </div>
              <div className="settings-card highlight-card">
                <h3>GPT originale su ChatGPT</h3>
                <p>Collegamento diretto al GPT pubblico che hai condiviso: utile per aprire la versione originale dentro ChatGPT.</p>
                <a className="primary-action standalone-link" href={APP_CONFIG.smeGptUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={18} /> {APP_CONFIG.smeGptLabel}
                </a>
              </div>
              <div className="settings-card highlight-card">
                <h3>GPT Strategia Editoriale 12 Mesi</h3>
                <p>Risorsa esterna aggiunta come confronto e modulo specialistico per piani editoriali annuali.</p>
                <a className="primary-action standalone-link" href={APP_CONFIG.strategy12GptUrl} target="_blank" rel="noopener noreferrer">
                  <CalendarDays size={18} /> {APP_CONFIG.strategy12GptLabel}
                </a>
              </div>
              <div className="settings-card">
                <h3>Stato API</h3>
                <p>{apiStatus?.aiReady ? `AI reale attiva con ${apiStatus.provider || 'provider'} · modello ${apiStatus.model}` : 'Nessuna chiave API valida: fallback locale attivo.'}</p>
                <p>Le chiavi Gemini/OpenAI restano lato server, mai nel browser. Per test gratuiti usa AI_PROVIDER=gemini.</p>
              </div>
              <div className="settings-card">
                <h3>Portabilità</h3>
                <p>Puoi esportare/importare bozze locali in JSON.</p>
                <div className="inline-actions">
                  <button className="secondary-action" onClick={exportDrafts}><Download size={18} /> Esporta</button>
                  <label className="file-button"><Upload size={18} /> Importa<input type="file" accept="application/json" onChange={event => importDrafts(event.target.files?.[0] ?? null)} /></label>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function AnnualStrategyPanel({ strategy, compact }: { strategy: CampaignResult['annualStrategy']; compact: boolean }) {
  if (!strategy) return null;

  return (
    <section className={`annual-strategy-panel ${compact ? 'compact' : ''}`}>
      <div className="annual-header">
        <div>
          <span className="channel-label">Strategia Editoriale 12 Mesi</span>
          <h3>Piano annuale strutturato</h3>
        </div>
        <CalendarDays size={22} />
      </div>

      <div className="annual-block">
        <strong>Diagnosi di posizionamento</strong>
        <p>{strategy.positioningDiagnosis}</p>
      </div>

      <div className="annual-columns">
        <div>
          <strong>Obiettivi annuali</strong>
          <ul>{strategy.annualObjectives.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
        <div>
          <strong>Pilastri editoriali</strong>
          <ul>{strategy.editorialPillars.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
      </div>

      {!compact && (
        <>
          <div className="quarter-grid">
            {strategy.quarterlyPlan.map(item => (
              <article key={item.quarter}>
                <strong>{item.quarter}</strong>
                <p>{item.focus}</p>
                <small>Obiettivi: {item.objectives.join(', ')}</small>
                <small>Temi: {item.contentThemes.join(', ')}</small>
              </article>
            ))}
          </div>

          <div className="month-grid">
            {strategy.monthlyThemes.map(item => (
              <article key={item.month}>
                <strong>{item.month}</strong>
                <p>{item.theme}</p>
                <small>{item.campaignIdea}</small>
                <small>KPI: {item.mainKpi}</small>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="annual-columns">
        <div>
          <strong>Cadenza sostenibile</strong>
          <p>{strategy.sustainableCadence}</p>
        </div>
        <div>
          <strong>KPI</strong>
          <ul>{strategy.kpis.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
      </div>

      <div className="annual-block">
        <strong>Processo di revisione</strong>
        <p>{strategy.reviewProcess}</p>
      </div>
    </section>
  );
}

function getBriefQualityWarnings(brief: CampaignBrief) {
  const warnings: string[] = [];
  if (brief.masterText.trim().length > 0 && brief.masterText.trim().length < 120) {
    warnings.push('Il testo master è breve: il motore potrà procedere, ma farà più assunzioni.');
  }
  if (!brief.companyProfile.positioning.trim()) warnings.push('Manca il posizionamento aziendale.');
  if (!brief.companyProfile.offer.trim()) warnings.push('Manca una descrizione chiara dell’offerta.');
  if (!brief.companyProfile.brandVoice.trim()) warnings.push('Manca il tono di voce aziendale.');
  if (/garantito|sicuro|certo|senza rischi|risultato assicurato/i.test(brief.masterText)) {
    warnings.push('Il testo contiene claim assoluti: SME li renderà più prudenti.');
  }
  return warnings.slice(0, 5);
}

function labelize(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function toMarkdown(brief: CampaignBrief, result: CampaignResult) {
  const posts = result.posts.map(post => `## ${getPlatform(post.platform).name}\n\n### ${post.title}\n\n${post.content}\n\n**CTA:** ${post.cta}\n\n**Asset:** ${post.assetIdea}\n\n**Note:** ${post.notes}\n`).join('\n---\n\n');
  const calendar = result.calendar.map(item => `- **${item.day}** · ${getPlatform(item.channel).name} · ${item.format}: ${item.topic} (${item.objective})`).join('\n');
  const hooks = result.hooks.map(hook => `- ${hook}`).join('\n');
  const warnings = result.warnings.map(warning => `- ${warning}`).join('\n');
  const annual = result.annualStrategy;
  const quarters = annual.quarterlyPlan.map(item => `- **${item.quarter}:** ${item.focus}. Obiettivi: ${item.objectives.join(', ')}. Temi: ${item.contentThemes.join(', ')}`).join('\n');
  const months = annual.monthlyThemes.map(item => `- **${item.month}:** ${item.theme} — ${item.campaignIdea}. KPI: ${item.mainKpi}`).join('\n');

  return `# Campagna ${result.engine}\n\n**Brand:** ${brief.brandName}\n**Settore:** ${brief.sector}\n**Target:** ${brief.targetAudience}\n**Obiettivo:** ${brief.objective}\n**Tono:** ${brief.tone}\n**Formato:** ${brief.format}\n**Posizionamento:** ${brief.companyProfile.positioning || 'Non specificato'}\n**Offerta:** ${brief.companyProfile.offer || 'Non specificata'}\n**Brand voice:** ${brief.companyProfile.brandVoice || 'Non specificato'}\n**Contatto/Sito:** ${brief.companyProfile.websiteOrContact || '[LINK/CONTATTO]'}\n\n## Sintesi\n\n${result.summary}\n\n## Avvisi\n\n${warnings || '- Nessun avviso.'}\n\n## Hook\n\n${hooks}\n\n## Strategia Editoriale 12 Mesi\n\n### Diagnosi\n\n${annual.positioningDiagnosis}\n\n### Obiettivi annuali\n\n${annual.annualObjectives.map(item => `- ${item}`).join('\n')}\n\n### Pilastri editoriali\n\n${annual.editorialPillars.map(item => `- ${item}`).join('\n')}\n\n### Trimestri\n\n${quarters}\n\n### Temi mensili\n\n${months}\n\n### Cadenza sostenibile\n\n${annual.sustainableCadence}\n\n### KPI\n\n${annual.kpis.map(item => `- ${item}`).join('\n')}\n\n### Revisione\n\n${annual.reviewProcess}\n\n${posts}\n\n## Calendario consigliato\n\n${calendar || '- Non disponibile.'}\n`;
}