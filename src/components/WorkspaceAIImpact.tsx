import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { identityAuth } from '../services/identityFirebase';
import type { DNSWorkspaceLanguage } from '../services/foundation';
import collaboration from '../data/ai-collaboration-preliminary.json';

type Snapshot = {
  schemaVersion: 1;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  observed: { repositories: number; commits: number; pullRequests: number; actionsMinutes: number | null; actionsRuns?: number; actionsElapsedHours?: number | null; actionsElapsedCoverage?: number | null };
  estimated: {
    aiHours: number | null;
    humanEquivalentHours: number | null;
    electricityKwh: { low: number; central: number; high: number } | null;
    waterLitres: { low: number; central: number; high: number } | null;
  };
  environmentModel?: { label: string; modelId: string; benchmarkUrl?: string } | null;
  developmentActivity?: { sessions: number; estimateHours: { low: number; central: number; high: number }; methodology: string } | null;
  methodologyUrl?: string;
};

const integer = new Intl.NumberFormat('it-IT');
const decimal = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
function validNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function validRange(value: unknown): value is { low: number; central: number; high: number } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return validNumber(v.low) && validNumber(v.central) && validNumber(v.high)
    && v.low <= v.central && v.central <= v.high;
}
function parseSnapshot(raw: unknown): Snapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<Snapshot>;
  if (s.schemaVersion !== 1 || !s.observed || !s.estimated ||
      typeof s.generatedAt !== 'string' || Number.isNaN(Date.parse(s.generatedAt)) ||
      typeof s.periodStart !== 'string' || typeof s.periodEnd !== 'string' ||
      !validNumber(s.observed.repositories) || !validNumber(s.observed.commits) ||
      !validNumber(s.observed.pullRequests) ||
      !(s.observed.actionsMinutes === null || validNumber(s.observed.actionsMinutes))) return null;
  const e = s.estimated;
  if (![e.aiHours, e.humanEquivalentHours].every(v => v === null || validNumber(v))) return null;
  if (![e.electricityKwh, e.waterLitres].every(v => v === null || validRange(v))) return null;
  return s as Snapshot;
}

export function WorkspaceAIImpact({ language, isAdmin }: { language: DNSWorkspaceLanguage; isAdmin: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setState('loading');
    async function load() {
      let parsed: Snapshot | null = null;
      let hadError = false;
      // Firestore remains authoritative for admin-only details.
      if (isAdmin) {
        try {
          const result = await getDoc(doc(getFirestore(identityAuth.app), 'adminAiImpactSnapshots', 'latest'));
          parsed = result.exists() ? parseSnapshot(result.data()) : null;
        } catch { hadError = true; }
      }
      // Publicly shareable aggregates are intentionally distinct from private telemetry.
      if (!parsed) {
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}ai-impact/latest.json`, { cache: 'no-store' });
          if (!response.ok) throw new Error('PUBLIC_SUMMARY_UNAVAILABLE');
          parsed = parseSnapshot(await response.json());
        } catch { hadError = true; }
      }
      if (!parsed && !isAdmin) {
        try {
          const result = await getDoc(doc(getFirestore(identityAuth.app), 'memberAiImpactSnapshots', 'latest'));
          parsed = result.exists() ? parseSnapshot(result.data()) : null;
        } catch { hadError = true; }
      }
      if (!active) return;
      setSnapshot(parsed);
      setState(parsed ? 'ready' : hadError ? 'error' : 'missing');
    }
    void load();
    return () => { active = false; };
  }, [revision, isAdmin]);

  const de = language === 'de';
  const empty = de ? 'Noch keine verifizierten Daten' : 'Dati verificati non ancora disponibili';
  const format = (n: number | null | undefined, suffix = '') =>
    n == null ? '—' : `${decimal.format(n)}${suffix}`;

  const revisions = collaboration.futureRevisions as Array<{ periodEnd: string; collaborationHours: { low: number; central: number; high: number } }>;
  const currentRevision = revisions.length ? revisions[revisions.length - 1] : null;
  const hours = currentRevision?.collaborationHours ?? collaboration.collaborationHours;
  const periodEnd = new Date(`${currentRevision?.periodEnd ?? collaboration.periodEnd}T12:00:00Z`).toLocaleDateString(de ? 'de-DE' : 'it-IT');
  const numbers = [
    { name: de ? 'Klassische Entwicklungszeit' : 'Sviluppo tradizionale' },
    { name: de ? 'Zeitersparnis' : 'Risparmio di tempo' },
    { name: de ? 'Energie' : 'Energia' },
    { name: de ? 'Wasser' : 'Acqua' },
  ];
  const notVerified = de ? 'Zu überprüfen' : 'Da verificare';
  return (
    <section className="workspace-dashboard-section" aria-labelledby="workspace-ai-impact-title">
      <div className="workspace-dashboard-heading">
        <div>
          <div className="dns-kicker">DNS Ecosystem</div>
          <h2 id="workspace-ai-impact-title">AI &amp; Sustainability</h2>
        </div>
        <button type="button" className="dns-button" data-variant="secondary"
          onClick={refresh} disabled={state === 'loading'}>
          {de ? 'Aktualisieren' : 'Aggiorna'}
        </button>
      </div>
      <p className="workspace-source-note">
        <strong>{de ? 'Vorläufige Schätzungen – Daten noch nicht verifiziert'
          : 'Stime preliminari – dati non ancora verificati'}</strong>
        {' · '}{de ? 'Stand' : 'Riferite al'} {periodEnd}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <article className="workspace-kpi">
          <span>{de ? 'Zusammenarbeit Mensch–KI' : 'Collaborazione uomo–AI'}</span>
          <strong>{integer.format(hours.central)} h</strong>
          <meter min={hours.low} max={hours.high} value={hours.central}
            aria-label={de ? 'Zentralwert der geschätzten Stunden' : 'Valore centrale delle ore stimate'}
            className="w-full" />
          <small>{hours.low}–{hours.high} h · {de ? 'etwa' : 'circa'} {Math.round(hours.central / collaboration.hoursPerWorkday)}
            {' '}{de ? 'Arbeitstage à 8 Stunden' : 'giornate da 8 ore'}</small>
        </article>
        <article className="workspace-kpi">
          <span>{de ? 'GitHub-Entwicklungsaktivität' : 'Attività di sviluppo GitHub'}</span>
          <strong>{snapshot ? integer.format(snapshot.observed.commits) : '—'} <small>commit</small></strong>
          <small>{snapshot
            ? `${integer.format(snapshot.observed.pullRequests)} PR · ${snapshot.periodStart} – ${snapshot.periodEnd}`
            : empty}</small>
          <small>{de ? 'Beobachtete Daten, keine Stundenschätzung' : 'Dati osservati, non una stima delle ore'}</small>
        </article>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {numbers.map(item => (
          <div className="workspace-source-note" key={item.name}>
            <strong>{item.name}</strong>
            <div>{notVerified}</div>
          </div>
        ))}
      </div>
      <details>
        <summary className="workspace-source-note">
          {de ? 'Technische Details und Methodik' : 'Dettagli tecnici e metodologia'}
        </summary>
        <div className="workspace-source-note">
          <p>{de ? 'GitHub-Commit-Sitzungen (heuristische Stundenschätzung)' : 'Sessioni da commit GitHub (stima euristica)'}:
            {' '}{format(snapshot?.developmentActivity?.estimateHours.central, ' h')}</p>
          <p>{de ? 'Kumulierte GitHub-Actions-Laufzeit (nicht Arbeitsstunden)' : 'Tempo cumulativo GitHub Actions (non ore di lavoro)'}:
            {' '}{format(snapshot?.observed.actionsElapsedHours, ' h')}</p>
          <p>{de ? 'Mensch–KI-Stunden werden bei einer neuen begründeten Schätzung aktualisiert; sie wachsen nicht automatisch mit Commits.'
            : 'Le ore uomo–AI si aggiornano quando viene formulata una nuova stima motivata, non automaticamente in base ai commit.'}</p>
          {isAdmin && <p>{de ? 'Admin: KI-Rechenstunden und traditioneller Entwicklungsaufwand sind noch nicht quantifiziert.'
            : 'Admin: ore di calcolo AI e sviluppo tradizionale non ancora quantificati.'}</p>}
        </div>
      </details>
      <p className="workspace-source-note" role="status">
        {state === 'loading' ? (de ? 'GitHub-Daten werden geladen…' : 'Caricamento dati GitHub…')
          : state === 'error' ? (de ? 'GitHub-Daten nicht zugänglich.' : 'Dati GitHub non accessibili.')
          : state === 'missing' ? empty
          : `${de ? 'GitHub aktualisiert' : 'GitHub aggiornato'}: ${new Date(snapshot!.generatedAt).toLocaleString(de ? 'de-DE' : 'it-IT')}`}
      </p>
    </section>
  );
}
