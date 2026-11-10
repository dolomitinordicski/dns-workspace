import baseline from '../data/ai-collaboration-preliminary.json';
import type { DNSWorkspaceLanguage } from '../services/foundation';

const integer = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

/**
 * Manually supplied, unverified planning estimate.
 * Deliberately independent from the GitHub collector and its scenario model.
 * Replacing the JSON after a ChatGPT export review does not rewrite GitHub data.
 */
export function WorkspaceAICollaboration({ language }: { language: DNSWorkspaceLanguage }) {
  const de = language === 'de';
  const t = de ? {
    heading: 'KI-Nutzung bei der Entwicklung',
    warning: 'Vorläufige Schätzungen – Daten noch nicht verifiziert',
    intro: 'Zusammenarbeit von Mensch und KI bei der Entwicklung des DNS Ecosystem. Keine gemessene KI-Rechenzeit.',
    ai: 'Stunden Mensch–KI-Zusammenarbeit',
    traditional: 'Entsprechende Stunden klassischer Entwicklung',
    saved: 'Zeitersparnis',
    energy: 'Energieverbrauch',
    water: 'Wasserverbrauch',
    pending: 'Noch zu ermitteln',
    period: 'Bezugszeitraum',
    days: 'etwa 21 Arbeitstage à 8 Stunden',
    estimate: 'Zentralwert; geschätzte Spanne',
    next: 'Nach der Auswertung des ChatGPT-Exports aktualisierbar. GitHub-Daten sind separat erfasst und bleiben unverändert.',
  } : {
    heading: 'Utilizzo AI nello sviluppo',
    warning: 'Stime preliminari – dati non ancora verificati',
    intro: 'Collaborazione tra persone e intelligenza artificiale nello sviluppo del DNS Ecosystem. Non rappresenta il tempo di calcolo dell’AI.',
    ai: 'Ore di collaborazione uomo–AI',
    traditional: 'Ore equivalenti di sviluppo tradizionale',
    saved: 'Risparmio di tempo',
    energy: 'Energia',
    water: 'Acqua',
    pending: 'Da determinare',
    period: 'Periodo di riferimento',
    days: 'circa 21 giornate lavorative da 8 ore',
    estimate: 'Stima centrale; intervallo preliminare',
    next: 'Valori aggiornabili dopo l’analisi dell’esportazione ChatGPT. I dati GitHub rimangono separati e invariati.',
  };

  const hours = baseline.collaborationHours;
  const date = (v: string) => new Date(`${v}T12:00:00Z`).toLocaleDateString(de ? 'de-DE' : 'it-IT');
  const metrics = [
    {
      label: t.ai,
      value: `${integer.format(hours.central)} h`,
      note: `${t.estimate}: ${integer.format(hours.low)}–${integer.format(hours.high)} h`,
    },
    {
      label: t.traditional,
      value: t.pending,
      note: '',
    },
    {
      label: t.saved,
      value: t.pending,
      note: '',
    },
    {
      label: t.energy,
      value: t.pending,
      note: '',
    },
    {
      label: t.water,
      value: t.pending,
      note: '',
    },
  ];

  return (
    <section className="workspace-dashboard-section" aria-labelledby="workspace-ai-collaboration-title">
      <div className="workspace-dashboard-heading">
        <div>
          <div className="dns-kicker">DNS Ecosystem · AI</div>
          <h2 id="workspace-ai-collaboration-title">{t.heading}</h2>
        </div>
      </div>
      <p className="workspace-source-note"><strong>{t.warning}</strong></p>
      <p className="workspace-source-note">
        {t.intro} {t.period}: {date(baseline.periodStart)} – {date(baseline.periodEnd)}.
      </p>
      <div className="workspace-kpi-grid">
        {metrics.map(metric => (
          <article className="workspace-kpi" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.note && <small>{metric.note}</small>}
          </article>
        ))}
      </div>
      <p className="workspace-source-note">
        {oneDecimal.format(hours.central / baseline.hoursPerWorkday)} {de ? 'Arbeitstage (rechnerisch)' : 'giornate equivalenti (calcolo)'} · {t.days}.
      </p>
      <p className="workspace-source-note">{t.next}</p>
    </section>
  );
}
