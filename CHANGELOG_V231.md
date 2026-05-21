# MultiPost Pro SME v2.3.1

## Correzioni

- Confermato uso corretto di `openai.responses.create` con `text.format` e `json_schema`.
- Aggiunta gestione esplicita di refusal e output incompleto per Structured Outputs.
- Aggiunto autosave locale della scheda aziendale/brief attivo.
- Aggiornata versione a 2.3.1.

## Decisione tecnica

Non è stata applicata la patch Gemini che sostituiva Responses API con Chat Completions: la documentazione ufficiale OpenAI indica la Responses API come API primaria e supporta `client.responses.create` nel Node SDK.
