# MultiPost Pro SME v2.3.5

Web app React + TypeScript con backend Express per generare contenuti multicanale per PMI usando il motore editoriale **SME per PMI**.

## Novità v2.3.5

Questa release aggiunge il supporto **multi-provider AI**:

- `AI_PROVIDER=gemini` → usa Gemini API, utile per test gratuiti o a basso costo;
- `AI_PROVIDER=openai` → usa OpenAI Responses API;
- `AI_PROVIDER=local` → usa solo fallback/demo locale;
- `AI_PROVIDER=auto` → usa OpenAI se presente, altrimenti Gemini, altrimenti fallback locale.

La v2.3.5 mantiene:

- React + Vite + TypeScript;
- backend Express;
- endpoint unico `POST /api/campaign`;
- scheda aziendale;
- autosave con debounce;
- protezione `beforeunload`;
- blocco tab durante generazione;
- export Markdown/JSON;
- link ai GPT pubblici;
- fallback locale.

## Avvio locale

```bash
npm install
cp .env.example .env
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

Backend:

```text
http://127.0.0.1:8787
```

Health check:

```text
http://127.0.0.1:8787/api/health
```

## Configurazione gratuita con Gemini

Per testare senza usare OpenAI, crea una chiave in Google AI Studio e configura `.env` così:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=INCOLLA_QUI_LA_TUA_CHIAVE_GEMINI
GEMINI_MODEL=gemini-2.5-flash
PORT=8787
HOST=127.0.0.1
```

Quando funziona, nell'interfaccia vedrai un badge simile a:

```text
AI reale · gemini · gemini-2.5-flash
```

## Configurazione con OpenAI

```env
AI_PROVIDER=openai
OPENAI_API_KEY=INCOLLA_QUI_LA_TUA_CHIAVE_OPENAI
OPENAI_MODEL=gpt-5.5
PORT=8787
HOST=127.0.0.1
```

## Fallback locale

Se mancano chiavi valide, il backend usa il fallback locale. L'app resta dimostrabile, ma l'output non rappresenta la qualità reale del motore AI.

## Architettura

```text
src/App.tsx              UI principale
src/types.ts             Tipi TypeScript
src/config.ts            Config piattaforme, versioni e link GPT
src/lib/api.ts           Chiamata frontend → backend
src/lib/storage.ts       Bozze locali robuste, export/import
server/index.ts          Backend Express + OpenAI/Gemini provider
server/smePrompt.ts      Prompt SME per PMI
```

## Scelte tecniche

1. **Chiavi solo lato server**  
   Le chiavi Gemini/OpenAI non devono mai stare nel frontend.

2. **Provider selezionabile da `.env`**  
   Questo permette test gratuiti con Gemini senza eliminare OpenAI.

3. **Schema dati unico per la UI**  
   Sia OpenAI sia Gemini devono restituire lo stesso oggetto `CampaignResult`, così il frontend non cambia.

4. **Niente API social per ora**  
   Il valore dell'MVP è strategia/copy/export, non pubblicazione diretta.

## Build

```bash
npm run build
```

## Roadmap

- v2.4: chunking della strategia 12 mesi in due chiamate.
- v2.5: profili aziendali multipli salvati.
- v3.0: auth + database cloud.
