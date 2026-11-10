import { useEffect, useMemo, useState } from 'react';
import { loadDNSReleases, type DNSRelease } from '../services/dnsReleases';
import type { DNSIdentity } from '../services/dnsIdentity';
import { organizationName, type DNSWorkspaceOrganization } from '../services/dnsOrganizations';
import { signOutDNS } from '../services/dnsIdentity';
import { canUseOrganization } from '../workspace/access';
import type { WorkspaceTool } from '../workspace/registry';
import type { DNSWorkspaceLanguage } from '../services/foundation';
import { loadWorkspaceDashboardData, type WorkspaceDashboardData } from '../services/workspaceDashboardData';
import { DNS_QUALITY_MILESTONES } from '../workspace/qualityMilestones';
import { DigitalPassOperator } from './DigitalPassOperator';

type Props = { language: DNSWorkspaceLanguage; identity: DNSIdentity;
  organization: DNSWorkspaceOrganization; organizations: DNSWorkspaceOrganization[];
  tools: WorkspaceTool[]; onOrganizationChange: (id: string) => void };

const integer = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
const money = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const km = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function trailTone(percent: number | null) {
  if (percent === null) return 'neutral';
  if (percent >= 70) return 'green';
  if (percent >= 35) return 'yellow';
  return 'red';
}

function donutColor(tone: ReturnType<typeof trailTone>) {
  if (tone === 'green') return '#2E8B57';
  if (tone === 'yellow') return '#D89A19';
  if (tone === 'red') return '#C84B3A';
  return '#A9B8BD';
}

export function WorkspaceCockpit(props: Props) {
  const { language, identity, organization, organizations, tools, onOrganizationChange } = props;
  const isAdmin = identity.state === 'active' && identity.profile.globalRoles.includes('dns-admin');
  const [showAllNews, setShowAllNews] = useState(false);
  const [passExpanded, setPassExpanded] = useState(false);
  const [releases, setReleases] = useState<DNSRelease[]>([]);
  const [newsError, setNewsError] = useState(false);
  const [pulse, setPulse] = useState<WorkspaceDashboardData | null>(null);
  const [pulseLoading, setPulseLoading] = useState(true);
  const allowedIds = tools.map(tool => tool.id).join(',');
  const news = releases.filter(item => item.type !== 'technical');
  const urgent = news.filter(item => item.type === 'urgent');

  useEffect(() => {
    if (identity.state !== 'active') return;
    let active = true;
    setNewsError(false);
    loadDNSReleases(isAdmin, tools.map(tool => tool.id))
      .then(items => { if (active) setReleases(items); })
      .catch(() => { if (active) setNewsError(true); });
    return () => { active = false; };
  }, [identity.state, isAdmin, allowedIds]);

  useEffect(() => {
    let active = true;
    setPulseLoading(true);
    loadWorkspaceDashboardData(organization)
      .then(data => { if (active) setPulse(data); })
      .finally(() => { if (active) setPulseLoading(false); });
    return () => { active = false; };
  }, [organization.id]);

  if (identity.state !== 'active') return null;
  const eligible = organizations.filter(org => canUseOrganization(identity, org));
  const isNetwork = organization.id === 'dolomiti-nordicski';
  const trailPct = pulse?.trails?.totalKm ? Math.round((pulse.trails.openKm / pulse.trails.totalKm) * 100) : null;
  const tone = trailTone(trailPct);
  const avgTicket = pulse?.performance?.tickets
    ? pulse.performance.revenue / pulse.performance.tickets
    : null;
  const deadlineDays = pulse?.deadline?.enabled ? daysUntil(pulse.deadline.deadlineAt) : null;

  const quality = DNS_QUALITY_MILESTONES;
  const areaTargetKm = quality.december08.minimumPreparedKm;
  const networkAreasKnown = pulse?.areaTrails.length ?? 0;
  const networkAreasPassed = pulse?.areaTrails.filter(row => row.openKm >= areaTargetKm).length ?? 0;
  const milestoneProgress = isNetwork
    ? (networkAreasKnown ? Math.round((networkAreasPassed / 8) * 100) : 0)
    : Math.min(100, Math.round(((pulse?.trails?.openKm ?? 0) / areaTargetKm) * 100));
  const milestoneTone = trailTone(milestoneProgress);

  const attention = useMemo(() => {
    const rows: Array<{ id: string; title: string; body: string; urgent?: boolean }> = [];
    if (pulse?.submission && pulse.submission.completed < pulse.submission.total) {
      rows.push({
        id: 'submission',
        title: language === 'de' ? 'Data Entry noch nicht vollständig' : 'Data Entry non ancora completo',
        body: language === 'de'
          ? `${pulse.submission.completed} von ${pulse.submission.total} Meldungen abgeschlossen.`
          : `${pulse.submission.completed} di ${pulse.submission.total} flussi completati.`,
      });
    }
    if (pulse?.deadline?.enabled && deadlineDays !== null && deadlineDays <= 14) {
      rows.push({
        id: 'deadline',
        urgent: deadlineDays < 0,
        title: deadlineDays < 0
          ? (language === 'de' ? 'Bestellfrist abgelaufen' : 'Scadenza ordini superata')
          : (language === 'de' ? 'Bestellfrist nähert sich' : 'Scadenza ordini in avvicinamento'),
        body: pulse.deadline.deadlineAt.toLocaleString(language === 'de' ? 'de-DE' : 'it-IT', {
          dateStyle: 'medium', timeStyle: 'short',
        }),
      });
    }
    urgent.slice(0, 3).forEach(item => rows.push({
      id: item.id, urgent: true, title: item.title[language], body: item.description[language],
    }));
    return rows;
  }, [pulse, deadlineDays, urgent, language]);

  const c = language === 'de' ? {
    title: isNetwork ? 'DNS Netzwerk' : 'Gebiet im Überblick',
    subtitle: 'Operative Übersicht',
    context: 'Organisation', signOut: 'Abmelden',
    admin: 'DNS-Administrator', user: 'Organisationsmitglied',
    pulse: 'Heute', trails: 'Loipen geöffnet', tickets: 'Tickets', revenue: 'Umsatz',
    dataEntry: 'Data Entry', unavailable: 'Nicht verfügbar',
    season: 'Saison 2025/26', todo: 'Zu tun / beachten',
    noActions: 'Aktuell keine dringenden Punkte.',
    trailsToday: 'Loipen heute', performance: 'Performance',
    avgTicket: 'Ø Ticketwert', deadline: 'Nächste Frist',
    updated: 'Stand', news: 'Neuigkeiten', all: 'Alle anzeigen', close: 'Schließen',
    noNews: 'Noch keine veröffentlichten Neuigkeiten.',
    quality: 'Qualitäts-Meilensteine',
  } : {
    title: isNetwork ? 'Rete DNS' : 'Area in sintesi',
    subtitle: 'Panoramica operativa',
    context: 'Organizzazione', signOut: 'Esci',
    admin: 'Amministratore DNS', user: 'Membro dell’organizzazione',
    pulse: 'Oggi', trails: 'Piste aperte', tickets: 'Ticket', revenue: 'Fatturato',
    dataEntry: 'Data Entry', unavailable: 'Non disponibile',
    season: 'Stagione 2025/26', todo: 'Da fare / attenzione',
    noActions: 'Nessun punto urgente al momento.',
    trailsToday: 'Piste oggi', performance: 'Performance',
    avgTicket: 'Valore medio ticket', deadline: 'Prossima scadenza',
    updated: 'Aggiornato', news: 'Novità', all: 'Vedi tutte', close: 'Chiudi',
    noNews: 'Nessuna novità pubblicata al momento.',
    quality: 'Milestone qualità',
  };

  return (
    <div className="workspace-cockpit-layout py-4">
      <div className="workspace-cockpit-content">
        <section className="workspace-digital-pass-panel">
          <button type="button" className="workspace-digital-pass-launcher" onClick={() => setPassExpanded(value => !value)}
            aria-expanded={passExpanded} aria-controls="workspace-digital-pass-content"
            aria-label={language === 'de' ? 'Saisonkartenverkauf bestätigen' : 'Conferma vendita stagionale'}>
            <span className="workspace-digital-pass-launcher-icon" aria-hidden="true"><svg width="33" height="33" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="7" width="22" height="18" rx="3"/><path d="M9 12h14M9 17h7M20 17h3v4h-3z"/></svg></span>
            <span className="workspace-digital-pass-launcher-copy">
              <span className="dns-kicker">DNS DIGITAL PASS · 2026/27</span>
              <strong>{language === 'de' ? 'Saisonkartenverkauf bestätigen' : 'Conferma vendita stagionale'}</strong>
              <small>{language === 'de' ? 'Kartennummer eingeben und Verkauf bestätigen · Pilotphase' : 'Inserisci il numero della tessera e conferma la vendita · Fase pilota'}</small>
            </span>
            <span className="workspace-digital-pass-launcher-arrow" aria-hidden="true">{passExpanded ? '⌃' : '⌄'}</span>
          </button>
          {passExpanded && <div id="workspace-digital-pass-content" className="workspace-digital-pass-content">
            <DigitalPassOperator language={language} inline />
          </div>}
        </section>

        <section className="workspace-home-hero">
          <div className="workspace-home-identity">
            <div className="dns-kicker">{c.subtitle}</div>
            <h1>{c.title}</h1>
            <p>{organizationName(organization, language)} · {identity.email} · {isAdmin ? c.admin : c.user}</p>
          </div>
          <div className="workspace-home-actions">
            {isAdmin && <label className="workspace-org-switcher">
              <span>{c.context}</span>
              <select className="dns-input" value={organization.id}
                onChange={e => onOrganizationChange(e.target.value)}>
                {eligible.map(org => <option key={org.id} value={org.id}>{organizationName(org, language)}</option>)}
              </select>
            </label>}
            <button className="workspace-signout-link" type="button"
              onClick={() => void signOutDNS()}>{c.signOut}</button>
          </div>
        </section>

        <section className="workspace-dashboard-section" aria-labelledby="workspace-pulse-title">
          <div className="workspace-dashboard-heading">
            <div>
              <div className="dns-kicker">{organizationName(organization, language)}</div>
              <h2 id="workspace-pulse-title">{c.pulse}</h2>
            </div>
            <span className="workspace-status-pill">WS 2026/27</span>
          </div>

          <div className="workspace-kpi-grid">
            <article className="workspace-kpi">
              <span>{c.trails}</span>
              <strong>{pulseLoading ? '…' : pulse?.trails ? `${km.format(pulse.trails.openKm)} km` : '—'}</strong>
              <small>{pulse?.trails ? `${km.format(pulse.trails.totalKm)} km · ${trailPct}%` : c.unavailable}</small>
            </article>
            <article className="workspace-kpi">
              <span>{c.tickets}</span>
              <strong>{pulseLoading ? '…' : pulse?.performance ? integer.format(pulse.performance.tickets) : '—'}</strong>
              <small>{pulse?.performance?.seasonId ?? c.season}</small>
            </article>
            <article className="workspace-kpi">
              <span>{c.revenue}</span>
              <strong>{pulseLoading ? '…' : pulse?.performance ? money.format(pulse.performance.revenue) : '—'}</strong>
              <small>{pulse?.performance?.seasonId ?? c.season}</small>
            </article>
            <article className={['workspace-kpi', pulse?.submission && pulse.submission.completed < pulse.submission.total ? 'is-attention' : ''].filter(Boolean).join(' ')}>
              <span>{c.dataEntry}</span>
              <strong>{pulseLoading ? '…' : pulse?.submission ? `${pulse.submission.completed}/${pulse.submission.total}` : '—'}</strong>
              <small>{pulse?.submission ? (language === 'de' ? 'Meldungen abgeschlossen' : 'flussi completati') : c.unavailable}</small>
            </article>
          </div>
        </section>

        <section className="workspace-domain-grid">
          <article className="workspace-domain-card workspace-visual-card">
            <div className="workspace-domain-card-head">
              <div><div className="dns-kicker">WS 2026/27</div><h2>{c.trailsToday}</h2></div>
            </div>
            <div className="workspace-donut-row">
              <div className={`workspace-donut is-${tone}`}
                style={{ background: `conic-gradient(${donutColor(tone)} ${trailPct ?? 0}%, #E7EEF0 0)` }}
                role="img" aria-label={trailPct === null ? c.unavailable : `${trailPct}%`}>
                <div><strong>{trailPct !== null ? `${trailPct}%` : '—'}</strong><span>{language === 'de' ? 'offen' : 'aperte'}</span></div>
              </div>
              <div className="workspace-donut-copy">
                <strong>{pulse?.trails ? `${km.format(pulse.trails.openKm)} km` : '—'}</strong>
                <span>{language === 'de' ? 'von' : 'su'} {pulse?.trails ? `${km.format(pulse.trails.totalKm)} km` : '—'}</span>
                {pulse?.trails?.observedAt && <small>{c.updated}: {new Date(pulse.trails.observedAt).toLocaleString(language === 'de' ? 'de-DE' : 'it-IT', { dateStyle: 'medium', timeStyle: 'short' })}</small>}
              </div>
            </div>
          </article>

          <article className="workspace-domain-card">
            <div className="workspace-domain-card-head">
              <div><div className="dns-kicker">{c.season}</div><h2>{c.performance}</h2></div>
            </div>
            <div className="workspace-domain-stats workspace-domain-stats-three">
              <div><span>{c.tickets}</span><strong>{pulse?.performance ? integer.format(pulse.performance.tickets) : '—'}</strong></div>
              <div><span>{c.revenue}</span><strong>{pulse?.performance ? money.format(pulse.performance.revenue) : '—'}</strong></div>
              <div><span>{c.avgTicket}</span><strong>{avgTicket !== null ? money.format(avgTicket) : '—'}</strong></div>
            </div>
            <p className="workspace-source-note">Analytics · {pulse?.performance?.seasonId ?? '2025-26'}</p>
          </article>

          <article className="workspace-domain-card workspace-milestone-card">
            <div className="workspace-domain-card-head">
              <div><div className="dns-kicker">DNS Quality</div><h2>{c.quality}</h2></div>
            </div>
            <div className="workspace-milestone-primary">
              <span className={`workspace-milestone-status is-${milestoneTone}`} />
              <div>
                <strong>08/12 · {quality.december08.label[language]}</strong>
                <p>{isNetwork
                  ? `${networkAreasPassed}/8 ${language === 'de' ? 'Gebiete mit mindestens 5 km' : 'aree con almeno 5 km'}`
                  : `${km.format(pulse?.trails?.openKm ?? 0)} / ${areaTargetKm} km`}</p>
              </div>
            </div>
            <div className="workspace-milestone-secondary">
              <span>23/12</span>
              <div><strong>{quality.december23.label[language]}</strong><small>{quality.december23.note[language]}</small></div>
            </div>
            {isNetwork && networkAreasKnown < 8 && <p className="workspace-source-note">{language === 'de' ? `${networkAreasKnown}/8 Gebietsdaten verfügbar` : `${networkAreasKnown}/8 dati area disponibili`}</p>}
          </article>

        </section>

        <section className="workspace-action-section" aria-labelledby="workspace-actions-title">
          <div className="workspace-dashboard-heading">
            <h2 id="workspace-actions-title">{c.todo}</h2>
            {pulse?.deadline?.enabled && <span className="workspace-deadline-chip">{c.deadline}: {pulse.deadline.deadlineAt.toLocaleDateString(language === 'de' ? 'de-DE' : 'it-IT')}</span>}
          </div>
          {attention.length ? <div className="workspace-action-list">
            {attention.map(item => <article key={item.id} className={['workspace-action-item', item.urgent ? 'is-urgent' : 'is-warning'].join(' ')}>
              <span className="workspace-action-dot" aria-hidden="true" />
              <div><strong>{item.title}</strong><p>{item.body}</p></div>
            </article>)}
          </div> : <div className="workspace-empty-state">
            <span aria-hidden="true">✓</span>
            <div><strong>{c.noActions}</strong>
              <p>{language === 'de' ? 'Der operative Status ist aktuell ohne dringende Hinweise.' : 'Lo stato operativo non presenta avvisi urgenti.'}</p></div>
          </div>}
        </section>
      </div>

      <aside className="workspace-cockpit-sidebar" aria-label={c.news}>
        <section className="workspace-news-section space-y-3" aria-labelledby="workspace-news-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="workspace-news-title" className="workspace-news-title">{c.news}</h2>
            <button type="button" className="dns-button" data-variant="secondary"
              aria-expanded={showAllNews} onClick={() => setShowAllNews(value => !value)}>
              {showAllNews ? c.close : c.all}
            </button>
          </div>
          {newsError ? <p role="status" className="text-sm text-dns-muted">{c.unavailable}</p>
            : news.length === 0 ? <p role="status" className="text-sm text-dns-muted">{c.noNews}</p>
            : <div className="space-y-3">{(showAllNews ? news : news.slice(0, 3)).map(item =>
              <article key={item.id} className="workspace-news-item">
                <div className="dns-kicker">{item.toolId} · {item.version} · {item.type === 'urgent' ? (language === 'de' ? 'Wichtig' : 'Urgente') : (language === 'de' ? 'Neu' : 'Novità')}</div>
                <h3>{item.title[language]}</h3>
                <p>{item.description[language]}</p>
              </article>)}</div>}
        </section>
      </aside>
    </div>
  );
}
