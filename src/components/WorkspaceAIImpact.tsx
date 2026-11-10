import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { identityAuth } from '../services/identityFirebase';
import type { DNSWorkspaceLanguage } from '../services/foundation';

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

  const summary = !isAdmin;
  return (
    <section className="workspace-dashboard-section" aria-labelledby="workspace-ai-impact-title">
      <div className="workspace-dashboard-heading">
        <div>
          <div className="dns-kicker">DNS Ecosystem</div>
          <h2 id="workspace-ai-impact-title">AI &amp; Sustainability</h2>
        </div>
        <button type="button" className="dns-button" data-variant="secondary"
          onClick={refresh} disabled={state === 'loading'}>
          {de ? 'Aktualisieren' : 'Aggiorna vista'}
        </button>
      </div>
      <p className="workspace-source-note">
        {summary
          ? (de ? 'So wächst das gemeinsame DNS Ecosystem: dokumentierte Entwicklung auf GitHub. KI- und Umweltwerte werden erst nach methodischer Prüfung veröffentlicht.'
                : 'Come cresce il DNS Ecosystem: attività di sviluppo documentata su GitHub. Le stime AI e ambientali saranno condivise dopo la validazione metodologica.')
          : (de ? 'Beobachtete GitHub-Daten und getrennt ausgewiesene Schätzungen.'
                : 'Attività GitHub osservata e stime ambientali esplicitamente distinte.')}
      </p>
      <div className="workspace-kpi-grid">
        <article className="workspace-kpi">
          <span>{de ? 'Commits erfasst' : 'Commit rilevati'}</span>
          <strong>{snapshot ? integer.format(snapshot.observed.commits) : '—'}</strong>
          <small>{snapshot ? `${snapshot.observed.repositories} repository` : empty}</small>
        </article>
        <article className="workspace-kpi">
          <span>{de ? 'Entwicklungsaktivität (Schätzung)' : 'Attività di sviluppo (stima)'}</span>
          <strong>{snapshot?.developmentActivity?.estimateHours ? `${format(snapshot.developmentActivity.estimateHours.central)} h` : '—'}</strong>
          <small>{snapshot?.developmentActivity?.estimateHours
            ? `${format(snapshot.developmentActivity.estimateHours.low)}–${format(snapshot.developmentActivity.estimateHours.high)} h · ${snapshot.developmentActivity.sessions} ${de ? 'Sitzungen' : 'sessioni'}`
            : (de ? 'Nicht verfügbar' : 'Non disponibile')}</small>
        </article>
        <article className="workspace-kpi">
          <span>{de ? 'Actions-Laufzeit (beobachtet)' : 'Tempo workflow (rilevato)'}</span>
          <strong>{format(snapshot?.observed.actionsElapsedHours, ' h')}</strong>
          <small>{de ? 'Verstrichene Zeit, keine abrechenbaren Minuten' : 'Tempo trascorso, non minuti fatturabili'}
            {snapshot?.observed.actionsElapsedCoverage != null ? ` · ${snapshot.observed.actionsElapsedCoverage}%` : ''}
          </small>
        </article>
        {summary ? <article className="workspace-kpi">
          <span>{de ? 'Pull Requests' : 'Pull request'}</span>
          <strong>{snapshot ? integer.format(snapshot.observed.pullRequests) : '—'}</strong>
          <small>{de ? 'Änderungen und Verbesserungen' : 'Modifiche e miglioramenti'}</small>
        </article> : <article className="workspace-kpi">
          <span>{de ? 'KI-Stunden (Schätzung)' : 'Ore AI (stima)'}</span>
          <strong>{format(snapshot?.estimated.aiHours, ' h')}</strong>
          <small>{de ? 'Keine Ableitung aus Commits allein' : 'Non deducibili dai soli commit'}</small>
        </article>}
        <article className="workspace-kpi">
          <span>{de ? 'Energie' : 'Energia'}</span>
          <strong>{de ? 'Zu überprüfen' : 'Da verificare'}</strong>
          <small>{de ? 'Nicht validierte Schätzungen werden ausgeblendet.' : 'Stime non validate temporaneamente nascoste.'}</small>
        </article>
        <article className="workspace-kpi">
          <span>{de ? 'Wasser' : 'Acqua'}</span>
          <strong>{de ? 'Zu überprüfen' : 'Da verificare'}</strong>
          <small>{de ? 'Nicht validierte Schätzungen werden ausgeblendet.' : 'Stime non validate temporaneamente nascoste.'}</small>
        </article>
      </div>
      <p className="workspace-source-note">
        {de ? 'Zeitwerte sind Heuristiken aus GitHub-Zeitstempeln, keine gemessenen KI- oder Arbeitsstunden.'
          : 'Le ore di attività derivano dagli orari GitHub: non sono ore AI né ore umane misurate.'}
      </p>
      <p className="workspace-source-note" role="status">
        {state === 'loading' ? (de ? 'Daten werden geladen…' : 'Caricamento dati…')
          : state === 'error' ? (de ? 'Daten nicht zugänglich; Berechtigungen prüfen.' : 'Dati non accessibili: verificare i permessi.')
          : state === 'missing' ? empty
          : `${de ? 'Stand' : 'Aggiornato'}: ${new Date(snapshot!.generatedAt).toLocaleString(de ? 'de-DE' : 'it-IT')}`}
        {snapshot ? ` · ${snapshot.periodStart} – ${snapshot.periodEnd} · ${summary ? '' : `${snapshot.observed.pullRequests} PR · ${format(snapshot.observed.actionsMinutes)} CI min`}` : ''}
      </p>
      {snapshot?.methodologyUrl?.startsWith('https://') &&
        <p className="workspace-source-note"><a href={snapshot.methodologyUrl} target="_blank" rel="noopener noreferrer">
          {de ? 'Methodik und Quellen' : 'Metodologia e fonti'}</a></p>}
    </section>
  );
}
