# CHANGELOG v2.3.5

## Obiettivo

Aggiungere una modalità gratuita/low-cost per i test usando Gemini API senza rimuovere OpenAI.

## Modifiche

- Aggiunto `AI_PROVIDER` in `.env` con valori `auto`, `gemini`, `openai`, `local`.
- Aggiunta dipendenza `@google/genai`.
- Aggiunta funzione `generateWithGemini()` nel backend.
- Mantenuta funzione `generateWithOpenAI()` con Responses API + JSON Schema.
- Health check aggiornato con `provider` e `model`.
- UI aggiornata: badge provider reale, non solo OpenAI.
- `.env.example` aggiornato per Gemini API.
- README aggiornato.

## Cosa non è cambiato

- Endpoint principale resta `POST /api/campaign`.
- Il frontend continua a ricevere lo stesso `CampaignResult`.
- Nessuna API social.
- Nessun database cloud.
- Fallback locale mantenuto.

## Uso consigliato

Per test gratuiti:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=INCOLLA_CHIAVE_GEMINI
GEMINI_MODEL=gemini-2.5-flash
```

Per OpenAI:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=INCOLLA_CHIAVE_OPENAI
OPENAI_MODEL=gpt-5.5
```
