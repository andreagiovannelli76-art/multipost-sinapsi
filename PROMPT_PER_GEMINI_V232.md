# Prompt per Gemini — MultiPost Pro SME v2.3.2

Analizza il progetto MultiPost Pro SME v2.3.2 come senior full-stack developer e product strategist SaaS.

Contesto importante:
- La v2.3.2 è una micro-release tecnica basata sulla tua revisione precedente.
- È stato applicato il debounce di 1000 ms sull'autosave del brief/scheda aziendale in `src/App.tsx`.
- L'architettura corretta rimane: React + Vite + TypeScript frontend, Express backend, endpoint `POST /api/campaign`.
- Il backend deve continuare a usare `openai.responses.create` con Structured Outputs e `text.format.type = "json_schema"`.
- Non proporre di sostituire la Responses API con `chat.completions.create` salvo bug reale dimostrabile sul codice eseguito.
- Non proporre `json_object`: lo schema JSON rigido è una scelta intenzionale.
- I GPT pubblici restano link esterni; il motore SME interno resta server-side.
- La scheda aziendale è il sostituto operativo dei Knowledge file del GPT pubblico dentro l'app.

Cosa devi controllare:
1. Verifica che il debounce autosave non introduca perdita dati significativa.
2. Verifica se la build compila correttamente.
3. Controlla eventuali bug reali in `src/App.tsx`, `src/lib/storage.ts`, `server/index.ts`, `server/smePrompt.ts`.
4. Valuta se la strategia 12 mesi è ancora troppo pesante per una singola chiamata.
5. Proponi la roadmap v2.4 concentrata sul chunking della strategia annuale.
6. Non proporre database cloud o API social come patch immediate: vanno considerate roadmap futura.

Output richiesto:
- Diagnosi sintetica v2.3.2.
- Bug certi, se presenti.
- Patch prioritarie file per file.
- Cosa non cambiare.
- Roadmap v2.4.
- Checklist test utente.
