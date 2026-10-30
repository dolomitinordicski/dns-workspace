import { useEffect, useState } from 'react';
import { doc, getDoc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { passAuth } from '../services/digitalPassApi';
import type { DNSWorkspaceLanguage } from '../services/foundation';

const SEASON = '2026-27';
const docRef = () => doc(getFirestore(passAuth.app), 'orderDeadlines', SEASON);

export function WorkspaceOrderDeadline({ language }: { language: DNSWorkspaceLanguage }) {
  const de = language === 'de';
  const [dateValue, setDateValue] = useState('');
  const [status, setStatus] = useState('loading');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let alive = true;
    getDoc(docRef()).then(snapshot => {
      if (!alive) return;
      const date = snapshot.data()?.deadlineAt?.toDate?.();
      setDateValue(date instanceof Date && !Number.isNaN(date.getTime())
        ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        : '');
      setStatus(snapshot.exists() ? 'ready' : 'not-configured');
    }).catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, []);
  async function save() {
    const date = new Date(dateValue);
    if (!dateValue || Number.isNaN(date.getTime())) { setStatus('invalid'); return; }
    setSaving(true);
    try {
      await setDoc(docRef(), {
        seasonId: SEASON, enabled: true, deadlineAt: Timestamp.fromDate(date),
        updatedAt: Timestamp.now(),
      }, { merge: true });
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally { setSaving(false); }
  }
  return <section className="space-y-3">
    <h3 className="font-semibold">{de ? 'Bestellfrist' : 'Scadenza inserimento ordini'} · {SEASON}</h3>
    <p className="text-sm text-dns-muted">{de
      ? 'Nach Fristablauf dürfen Gebiete Bestellungen nur noch lesen. DNS Admin kann weiterhin korrigieren.'
      : 'Dopo il termine le aree potranno solo consultare gli ordini. DNS Admin potrà ancora correggerli.'}</p>
    <label className="block space-y-1"><span className="text-sm">{de ? 'Datum und Uhrzeit (lokal)' : 'Data e ora (locale)'}</span>
      <input type="datetime-local" className="dns-input w-full" value={dateValue}
        onChange={event => setDateValue(event.target.value)} />
    </label>
    <button type="button" className="dns-button" disabled={saving || !dateValue || status === 'loading'}
      onClick={() => void save()}>{saving ? '…' : de ? 'Frist speichern' : 'Salva scadenza'}</button>
    <p className="text-sm" role="status">{({
      loading: de ? 'Wird geladen…' : 'Caricamento…',
      ready: de ? 'Frist geladen.' : 'Scadenza caricata.',
      saved: de ? 'Frist gespeichert.' : 'Scadenza salvata.',
      'not-configured': de ? 'Noch keine Frist konfiguriert: Änderungen sind noch möglich.' : 'Scadenza non impostata: le modifiche sono ancora possibili.',
      error: de ? 'Laden oder Speichern fehlgeschlagen.' : 'Caricamento o salvataggio fallito.',
      invalid: de ? 'Ungültiges Datum.' : 'Data non valida.',
    } as Record<string,string>)[status] ?? ''}</p>
  </section>;
}
