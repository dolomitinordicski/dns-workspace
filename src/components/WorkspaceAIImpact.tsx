import type { DNSWorkspaceLanguage } from '../services/foundation';
import { currentCollaborationEstimate } from '../ai-impact/collaboration';
import { useAIImpactSnapshot } from '../ai-impact/useAIImpactSnapshot';

const integer = new Intl.NumberFormat('it-IT');
const decimal = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

/** View only. Loading, validation and estimate history live in src/ai-impact/. */
export function WorkspaceAIImpact({ language, isAdmin }: { language: DNSWorkspaceLanguage; isAdmin: boolean }) {
  const { snapshot, state, refresh } = useAIImpactSnapshot(isAdmin);
  const de = language === 'de';
  const empty = de ? 'Noch keine verifizierten Daten' : 'Dati verificati non ancora disponibili';
  const format = (n: number | null | undefined, suffix = '') =>
    n == null ? '—' : `${decimal.format(n)}${suffix}`;

  const collaboration = currentCollaborationEstimate();
  const hours = collaboration.hours;
  const periodEnd = new Date(`${collaboration.periodEnd}T12:00:00Z`).toLocaleDateString(de ? 'de-DE' : 'it-IT');
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
