import { useEffect, useMemo, useState } from 'react';
import { loadDNSReleases, type DNSRelease } from '../services/dnsReleases';
import type { DNSIdentity } from '../services/dnsIdentity';
import { organizationName, type DNSWorkspaceOrganization } from '../services/dnsOrganizations';
import { signOutDNS } from '../services/dnsIdentity';
import { canUseOrganization } from '../workspace/access';
import type { WorkspaceTool } from '../workspace/registry';
import type { DNSWorkspaceLanguage } from '../services/foundation';
import { loadWorkspaceDashboardData, type WorkspaceDashboardData } from '../services/workspaceDashboardData';

type Props = { language: DNSWorkspaceLanguage; identity: DNSIdentity;
  organization: DNSWorkspaceOrganization; organizations: DNSWorkspaceOrganization[];
  tools: WorkspaceTool[]; onOrganizationChange: (id: string) => void };

const integer = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
const money = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const km = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export function WorkspaceCockpit(props: Props) {
  const { language, identity, organization, organizations, tools, onOrganizationChange } = props;
  const isAdmin = identity.state === 'active' && identity.profile.globalRoles.includes('dns-admin');
  const [showAllNews, setShowAllNews] = useState(false);
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
  const avgTicket = pulse?.performance?.tickets
    ? pulse.performance.revenue / pulse.performance.tickets
    : null;
  const deadlineDays = pulse?.deadline?.enabled ? daysUntil(pulse.deadline.deadlineAt) : null;

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
  };

  return (
    <div className="workspace-cockpit-layout py-4">
      <div className="workspace-cockpit-content">
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
          <article className="workspace-domain-card">
            <div className="workspace-domain-card-head">
              <div><div className="dns-kicker">WS 2026/27</div><h2>{c.trailsToday}</h2></div>
              <strong>{trailPct !== null ? `${trailPct}%` : '—'}</strong>
            </div>
            <div className="workspace-progress-track" aria-label={c.trailsToday}>
              <span style={{ width: `${Math.max(0, Math.min(100, trailPct ?? 0))}%` }} />
            </div>
            <div className="workspace-domain-stats">
              <div><span>{language === 'de' ? 'Geöffnet' : 'Aperti'}</span><strong>{pulse?.trails ? `${km.format(pulse.trails.openKm)} km` : '—'}</strong></div>
              <div><span>{language === 'de' ? 'Netz' : 'Rete'}</span><strong>{pulse?.trails ? `${km.format(pulse.trails.totalKm)} km` : '—'}</strong></div>
            </div>
            {pulse?.trails?.observedAt && <p className="workspace-source-note">{c.updated}: {new Date(pulse.trails.observedAt).toLocaleString(language === 'de' ? 'de-DE' : 'it-IT', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
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
