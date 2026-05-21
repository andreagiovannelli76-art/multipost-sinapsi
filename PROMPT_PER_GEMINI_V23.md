# Prompt per Gemini — Analisi MultiPost Pro SME v2.3

Agisci come senior full-stack developer, product strategist SaaS e revisore tecnico di applicazioni AI.

Ti sto fornendo il progetto **MultiPost Pro SME v2.3**, una web app React + TypeScript con backend Express che genera contenuti multicanale per PMI usando un motore editoriale AI chiamato **SME per PMI**.

## Obiettivo della tua analisi

Non devi riscrivere l'app da zero. Devi analizzarla, verificarla e proporre miglioramenti incrementali, rispettando le scelte tecniche già fatte.

## Contesto importante

Nella versione precedente avevi suggerito alcune correzioni corrette a livello concettuale, ma non tutte erano adatte al codice reale.

In particolare:

1. Avevi suggerito `chat.completions.create()` con `response_format: { type: "json_object" }`.
2. Questa app invece usa già **OpenAI Responses API** con `text.format.type = "json_schema"` e schema rigido.
3. La scelta `json_schema` è intenzionale: non vogliamo solo un JSON genericamente valido, ma un JSON che rispetti esattamente la struttura richiesta dalla UI.
4. L'endpoint reale non è `/api/generate`, ma `/api/campaign`.
5. La pubblicazione diretta sui social non va implementata ora: prima si valida il valore editoriale dell'app.
6. La chiave OpenAI deve restare sempre lato server.
7. I GPT pubblici sono link esterni, non motori API richiamabili direttamente per nome.

## Scelte tecniche della v2.3 da rispettare

### 1. Responses API + JSON Schema

Mantieni questa impostazione:

```ts
openai.responses.create({
  model: MODEL,
  instructions: SME_FOR_PMI_PROMPT,
  input: buildUserInput(brief),
  text: {
    format: {
      type: 'json_schema',
      name: 'sme_multipost_campaign_v23',
      strict: true,
      schema: campaignJsonSchema
    }
  }
})
```

Non sostituirla con `chat.completions` salvo motivazione tecnica forte e documentata.

### 2. Scheda aziendale interna

La v2.3 ha aggiunto una scheda aziendale con:

- posizionamento;
- offerta;
- brand voice;
- parole da usare;
- parole da evitare;
- sito/contatto.

Questa scelta serve perché i Knowledge file del GPT pubblico non sono automaticamente accessibili dentro una web app esterna. La scheda aziendale diventa quindi il sostituto operativo dei Knowledge file.

### 3. GPT pubblici come link esterni

L'app contiene due link:

- SME per PMI:
  https://chatgpt.com/g/g-69fe6ddacd7881919f8cb44139ade390-sistema-comunicazione-ai-per-pmi

- Strategia Editoriale 12 Mesi:
  https://chatgpt.com/g/g-69ff68c3fe408191a87e688fb0510ad6-strategia-editoriale-12-mesi

Questi link devono restare. Servono ad aprire i GPT originali su ChatGPT. Non sono una sostituzione del motore interno API.

### 4. No API social in questa fase

Non implementare ora pubblicazione diretta su LinkedIn, Facebook, Instagram, TikTok o X.

Motivo:

- servono OAuth e token refresh;
- servono permessi e review;
- le API cambiano;
- il rischio di complessità è alto;
- il valore principale da validare è la generazione editoriale, non la pubblicazione automatica.

Suggerisci al massimo integrazioni future via Zapier/Make o social OAuth in roadmap successiva.

### 5. LocalStorage robusto ma temporaneo

La v2.3 ha migliorato la gestione di `localStorage`, ma il localStorage resta una soluzione MVP/demo. Non proporre di usarlo come storage commerciale definitivo. La roadmap corretta è:

1. demo locale;
2. test utenti;
3. Supabase/Firebase/Auth;
4. database cloud;
5. billing;
6. integrazioni esterne.

## Cosa devi fare

Analizza questi file:

- package.json
- README.md
- src/App.tsx
- src/types.ts
- src/config.ts
- src/lib/api.ts
- src/lib/storage.ts
- src/styles.css
- server/index.ts
- server/smePrompt.ts
- .env.example

## Rispondi con questa struttura

1. Diagnosi generale della v2.3
2. Verifica delle scelte tecniche rispetto alla v2.2
3. Controllo architettura frontend/backend
4. Controllo gestione OpenAI Responses API + JSON Schema
5. Controllo gestione errori backend
6. Controllo storage locale
7. Controllo scheda aziendale
8. Bug o rischi trovati
9. Patch prioritarie, file per file
10. Miglioramenti UX consigliati
11. Miglioramenti backend/AI consigliati
12. Roadmap v2.4, v2.5, v3.0
13. Cosa NON fare ancora e perché

## Regole

- Non inventare funzioni già esistenti.
- Non cambiare endpoint senza motivo.
- Non mettere API key nel frontend.
- Non rimuovere i link ai GPT.
- Non rimuovere la modalità Strategia 12 mesi.
- Non promettere pubblicazione automatica sui social.
- Non sostituire Structured Outputs con un JSON generico.
- Proponi patch minime, chiare e testabili.

## Output richiesto

Voglio una valutazione severa, tecnica, utile per far evolvere l'app verso un MVP commerciale, non una riscrittura teorica.
