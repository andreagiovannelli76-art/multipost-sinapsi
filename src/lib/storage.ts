import { APP_CONFIG } from '../config';
import type { Draft } from '../types';

const isQuotaExceeded = (error: unknown) => {
  return error instanceof DOMException && (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
};

const parseDrafts = (raw: string | null): Draft[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeDrafts = (drafts: Draft[]) => {
  try {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(drafts));
  } catch (error) {
    if (isQuotaExceeded(error)) {
      throw new Error('Spazio locale esaurito. Esporta le bozze in JSON, poi elimina quelle vecchie o passa a un database cloud.');
    }
    throw new Error('Salvataggio locale non riuscito. Controlla permessi del browser o modalità privata.');
  }
};

export const draftStorage = {
  list(): Draft[] {
    try {
      return parseDrafts(localStorage.getItem(APP_CONFIG.storageKey));
    } catch {
      return [];
    }
  },

  save(draft: Draft): Draft[] {
    const drafts = this.list();
    const withoutCurrent = drafts.filter(item => item.id !== draft.id);
    const updated = [draft, ...withoutCurrent].slice(0, 80);
    writeDrafts(updated);
    return updated;
  },

  remove(id: string): Draft[] {
    const updated = this.list().filter(item => item.id !== id);
    writeDrafts(updated);
    return updated;
  },

  clear(): void {
    try {
      localStorage.removeItem(APP_CONFIG.storageKey);
    } catch {
      throw new Error('Non sono riuscito a svuotare l’archivio locale.');
    }
  },

  exportJson(): string {
    return JSON.stringify(this.list(), null, 2);
  },

  importJson(json: string): Draft[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Il file selezionato non contiene JSON valido.');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Il file non contiene una lista di bozze valida.');
    }

    writeDrafts(parsed as Draft[]);
    return parsed as Draft[];
  }
};

export const downloadTextFile = (fileName: string, content: string, mime = 'application/json') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};


export const briefStorage = {
  load<T>(fallback: T): T {
    try {
      const raw = localStorage.getItem(APP_CONFIG.briefStorageKey);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return { ...fallback, ...parsed, companyProfile: { ...(fallback as any).companyProfile, ...(parsed?.companyProfile || {}) } } as T;
    } catch {
      return fallback;
    }
  },

  save<T>(brief: T): void {
    try {
      localStorage.setItem(APP_CONFIG.briefStorageKey, JSON.stringify(brief));
    } catch (error) {
      if (isQuotaExceeded(error)) {
        throw new Error('Spazio locale esaurito: la scheda aziendale non è stata salvata automaticamente.');
      }
      throw new Error('Autosave della scheda aziendale non riuscito.');
    }
  },

  clear(): void {
    localStorage.removeItem(APP_CONFIG.briefStorageKey);
  }
};
