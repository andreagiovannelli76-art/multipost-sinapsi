# Changelog v2.3.2

## Obiettivo
Micro-release tecnica basata sulla revisione Gemini successiva al file unico v2.3.1.

## Modifiche applicate
- Aggiunto debounce di 1000 ms sull'autosave della scheda aziendale/brief in `src/App.tsx`.
- Ridotto il rischio di lag durante la digitazione di testi lunghi.
- Mantenuta invariata l'architettura backend: Express + `/api/campaign` + `openai.responses.create` + Structured Outputs con JSON Schema.
- Mantenuti link ai GPT pubblici, scheda aziendale, loader progressivo, fallback locale e gestione refusal/incomplete output.
- Versione applicativa aggiornata a 2.3.2.

## Cosa NON è stato cambiato
- Non è stato fatto downgrade a `chat.completions.create`.
- Non sono state integrate API social.
- Non è stato introdotto database cloud.
- Non è stato implementato ancora il chunking della strategia 12 mesi: resta previsto per v2.4.

## Test
Build verificata con `npm run build`.
