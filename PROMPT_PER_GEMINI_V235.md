# Prompt per Gemini — MultiPost Pro SME v2.3.5

Analizza questo progetto come senior full-stack developer e product strategist SaaS.

Il progetto è **MultiPost Pro SME v2.3.5**, una web app React + Vite + TypeScript con backend Express per generare contenuti multicanale per PMI usando il motore editoriale SME per PMI.

## Contesto della v2.3.5

La v2.3.5 aggiunge un sistema multi-provider:

- `AI_PROVIDER=gemini` usa Gemini API, consigliato per test gratuiti o low-cost;
- `AI_PROVIDER=openai` usa OpenAI Responses API;
- `AI_PROVIDER=local` usa fallback/demo locale;
- `AI_PROVIDER=auto` sceglie OpenAI se presente, altrimenti Gemini, altrimenti fallback.

Questa scelta è stata fatta perché l'utente vuole testare l'app senza costi OpenAI. Non eliminare OpenAI: Gemini serve come provider alternativo.

## Paletti da rispettare

Non riscrivere tutto da zero.

Mantieni:

- React + Vite + TypeScript;
- backend Express;
- endpoint unico `POST /api/campaign`;
- provider selezionabile da `.env`;
- scheda aziendale;
- autosave con debounce;
- protezione `beforeunload`;
- blocco tab durante generazione;
- fallback locale;
- link ai GPT pubblici;
- niente API social native per ora;
- niente Supabase/Firebase/Auth per ora.

## Cosa devi controllare

1. Verifica che `AI_PROVIDER=gemini` usi correttamente `@google/genai`.
2. Verifica che `AI_PROVIDER=openai` continui a usare `openai.responses.create`.
3. Verifica che il frontend riceva sempre lo stesso `CampaignResult` indipendentemente dal provider.
4. Verifica che `/api/health` restituisca provider e modello corretti.
5. Verifica che il fallback locale parta solo se mancano chiavi valide o se `AI_PROVIDER=local`.
6. Verifica che le chiavi API non siano mai nel frontend.
7. Verifica se lo schema JSON è troppo complesso per Gemini e, se necessario, proponi una patch minimale senza rompere la UI.

## Output richiesto

Rispondi con:

1. diagnosi v2.3.5;
2. bug certi;
3. rischi concreti;
4. patch file per file, solo se davvero necessarie;
5. cosa non cambiare;
6. istruzioni precise per configurare Gemini API;
7. roadmap v2.4 con chunking della strategia 12 mesi.

Non proporre integrazioni social OAuth ora.
Non proporre database cloud ora.
Non rimuovere OpenAI.
Non rimuovere Gemini.
Non rimuovere il fallback locale.
