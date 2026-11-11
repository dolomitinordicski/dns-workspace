import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { identityAuth } from '../services/identityFirebase';
import type { AIImpactSnapshot, ImpactRange } from './types';

const nonNegative = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const range = (value: unknown): value is ImpactRange => {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<ImpactRange>;
  return nonNegative(r.low) && nonNegative(r.central) && nonNegative(r.high)
    && r.low <= r.central && r.central <= r.high;
};

/** Reject malformed payloads rather than showing misleading metrics. */
export function parseAIImpactSnapshot(raw: unknown): AIImpactSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<AIImpactSnapshot>;
  if (s.schemaVersion !== 1 || !s.observed || !s.estimated ||
    typeof s.generatedAt !== 'string' || Number.isNaN(Date.parse(s.generatedAt)) ||
    typeof s.periodStart !== 'string' || typeof s.periodEnd !== 'string' ||
    !nonNegative(s.observed.repositories) || !nonNegative(s.observed.commits) ||
    !nonNegative(s.observed.pullRequests) ||
    !(s.observed.actionsMinutes === null || nonNegative(s.observed.actionsMinutes))) return null;
  const e = s.estimated;
  if (![e.aiHours, e.humanEquivalentHours].every(v => v === null || nonNegative(v))) return null;
  if (![e.electricityKwh, e.waterLitres].every(v => v === null || range(v))) return null;
  return s as AIImpactSnapshot;
}

/**
 * Preserve existing access boundaries:
 * admin private snapshot first; public aggregate fallback;
 * member Firestore snapshot only for non-admin accounts.
 */
export async function loadAIImpactSnapshot(isAdmin: boolean): Promise<AIImpactSnapshot | null> {
  if (isAdmin) {
    try {
      const result = await getDoc(doc(getFirestore(identityAuth.app), 'adminAiImpactSnapshots', 'latest'));
      const parsed = result.exists() ? parseAIImpactSnapshot(result.data()) : null;
      if (parsed) return parsed;
    } catch { /* Fallback to public aggregate, never leak private data. */ }
  }
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}ai-impact/latest.json`, { cache: 'no-store' });
    if (!response.ok) throw Error('PUBLIC_SUMMARY_UNAVAILABLE');
    const parsed = parseAIImpactSnapshot(await response.json());
    if (parsed) return parsed;
  } catch { /* Existing Firestore fallback below. */ }
  if (!isAdmin) {
    try {
      const result = await getDoc(doc(getFirestore(identityAuth.app), 'memberAiImpactSnapshots', 'latest'));
      return result.exists() ? parseAIImpactSnapshot(result.data()) : null;
    } catch { /* Fail closed. */ }
  }
  return null;
}
