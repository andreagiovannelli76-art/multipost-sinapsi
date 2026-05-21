# Changelog v2.3.3 — Protezione sessione attiva

## Modifica principale

Aggiunta una protezione `beforeunload` in `src/App.tsx` durante le generazioni AI.

Quando `isGenerating` è attivo e l’utente tenta di ricaricare, chiudere la scheda o uscire dalla pagina, il browser mostra il prompt nativo di conferma. Questo riduce il rischio di perdere una richiesta lunga, soprattutto in modalità **Strategia Editoriale 12 Mesi**.

## Perché è stata aggiunta

La v2.3.2 aveva già debounce dell’autosave, storage robusto e gestione errori. Gemini ha correttamente segnalato che una generazione lunga può essere persa se l’utente preme F5 o chiude accidentalmente la tab.

## Cosa NON è cambiato

- Nessun cambio di architettura.
- Nessun downgrade a `chat.completions`.
- Nessun cambio endpoint: resta `POST /api/campaign`.
- Nessuna integrazione API social.
- Nessun database cloud.
- Nessun chunking ancora: sarà v2.4.

## Build

Verificata con:

```bash
npm run build
```
