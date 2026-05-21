# Prompt per Gemini — revisione MultiPost Pro SME v2.3.1

Analizza il progetto MultiPost Pro SME v2.3.1 come senior full-stack developer, ma tieni conto di queste decisioni tecniche già validate:

1. Non sostituire `openai.responses.create` con `openai.chat.completions.create` solo perché il progetto usa Structured Outputs. La documentazione ufficiale OpenAI per SDK TypeScript/JavaScript indica la Responses API come API primaria e mostra `client.responses.create(...)` come uso corretto.
2. Il progetto usa `text.format.type = "json_schema"`, non `json_object`, perché l'obiettivo non è solo ottenere JSON valido, ma output aderente a uno schema.
3. La patch proposta in precedenza con `/api/generate` non è applicabile: l'endpoint reale è `/api/campaign`.
4. I GPT pubblici restano link esterni; il motore operativo interno resta il prompt SME lato backend.
5. La scheda aziendale deve restare nel payload/contesto applicativo come dati dell'utente, non come istruzioni di sistema non filtrate. Evita di elevare input utente a system prompt per non aumentare il rischio di prompt injection.
6. La v2.3.1 aggiunge gestione esplicita di refusal/output incompleto e autosave locale del brief/scheda aziendale.

Compito:
- verifica build TypeScript e Vite;
- controlla `server/index.ts`;
- controlla `src/lib/storage.ts`;
- controlla autosave del brief in `src/App.tsx`;
- proponi solo patch incrementali, senza cambiare architettura;
- prepara eventualmente una roadmap v2.4 basata su chunking della strategia 12 mesi in due chiamate.

Non proporre ancora API social, Supabase o Stripe come patch immediate: sono roadmap, non correzioni della v2.3.1.
