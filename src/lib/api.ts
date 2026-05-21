import type { ApiErrorPayload, CampaignBrief, CampaignResult } from '../types';

export const generateCampaign = async (brief: CampaignBrief): Promise<CampaignResult> => {
  const response = await fetch('/api/campaign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brief)
  });

  const payload = await response.json().catch(() => null) as CampaignResult | ApiErrorPayload | null;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    const message = [errorPayload?.error, errorPayload?.details].filter(Boolean).join(' ');
    throw new Error(message || 'Errore nella generazione della campagna.');
  }

  return payload as CampaignResult;
};

export const checkHealth = async () => {
  const response = await fetch('/api/health');
  if (!response.ok) return { ok: false, aiReady: false };
  return response.json();
};
