# Prompt per Gemini — MultiPost Pro SME v2.3.3

Analizza il progetto MultiPost Pro SME v2.3.3 come senior full-stack developer e product strategist SaaS.

Questa versione deriva dalla v2.3.2 e aggiunge una sola patch UX importante: protezione `beforeunload` durante la generazione AI, per evitare che l’utente perda una generazione lunga se ricarica o chiude la pagina.

## Paletti tecnici da rispettare

Mantieni:

- React + Vite + TypeScript;
- backend Express;
- endpoint `POST /api/campaign`;
- OpenAI Responses API con `openai.responses.create`;
- Structured Outputs tramite `text.format.type = "json_schema"` e `strict: true`;
- scheda aziendale;
- fallback locale;
- gestione refusal/incomplete output;
- autosave con debounce;
- protezione `beforeunload` durante `isGenerating`;
- link ai GPT pubblici.

Non proporre:

- sostituzione con `chat.completions.create`;
- ritorno a `json_object` semplice;
- cambio endpoint da `/api/campaign`;
- integrazione social OAuth in questa fase;
- database cloud prima dei test utenti;
- riscrittura totale del progetto.

## Cosa valutare

1. Verifica che la patch `beforeunload` sia corretta e non crei memory leak.
2. Verifica che il debounce autosave resti attivo.
3. Verifica che la generazione AI non venga interrotta da cambi di tab interni all’app.
4. Individua solo bug reali.
5. Proponi patch minime, file per file.
6. Prepara la roadmap v2.4.

## Roadmap attesa

La v2.4 dovrà concentrarsi sul chunking della Strategia Editoriale 12 Mesi:

- prima chiamata: diagnosi, pilastri, contenuti principali, calendario breve;
- seconda chiamata: espansione annuale con trimestri, 12 temi mensili e KPI.

Obiettivo: ridurre timeout, token output e rischio di generazioni incomplete.

## Output richiesto

Rispondi con:

1. diagnosi tecnica;
2. bug certi;
3. rischi residui;
4. patch consigliate;
5. cosa non cambiare;
6. roadmap v2.4;
7. checklist test utenti.
