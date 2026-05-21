# Prompt per Gemini — MultiPost Pro SME v2.3.4

Analizza il progetto MultiPost Pro SME v2.3.4 come senior full-stack developer e product strategist SaaS.

Questa versione è una release di stabilizzazione UX.

Mantieni obbligatoriamente:

- React + Vite + TypeScript;
- backend Express;
- endpoint `POST /api/campaign`;
- OpenAI Responses API con `openai.responses.create`;
- Structured Outputs tramite `text.format.type = "json_schema"` e `strict: true`;
- scheda aziendale come contesto operativo;
- fallback locale se manca `OPENAI_API_KEY`;
- autosave con debounce;
- `beforeunload` durante generazione attiva;
- blocco navigazione interna durante `isGenerating`;
- link ai GPT pubblici;
- niente API social native in questa fase;
- niente Supabase/Firebase/Auth per ora.

Non proporre:

- downgrade a `chat.completions.create`;
- `json_object` al posto di JSON Schema;
- cambio endpoint da `/api/campaign`;
- pubblicazione nativa su social;
- database cloud prima dei test utenti.

Valuta solo:

1. bug certi;
2. rischi UX concreti;
3. patch minime coerenti con il codice;
4. roadmap v2.4 focalizzata sul chunking della Strategia 12 Mesi;
5. eventuali test manuali prima della beta.

Restituisci la risposta con questa struttura:

1. Diagnosi tecnica v2.3.4
2. Bug certi
3. Rischi residui
4. Patch consigliate file per file
5. Cosa non cambiare
6. Roadmap v2.4
7. Checklist beta test
