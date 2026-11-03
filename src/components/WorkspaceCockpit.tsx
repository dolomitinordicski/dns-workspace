import { useEffect, useState } from 'react';
import { loadDNSReleases, type DNSRelease } from '../services/dnsReleases';
import type { DNSIdentity } from '../services/dnsIdentity';
import { organizationName, type DNSWorkspaceOrganization } from '../services/dnsOrganizations';
import { signOutDNS } from '../services/dnsIdentity';
import { canUseOrganization } from '../workspace/access';
import type { WorkspaceTool } from '../workspace/registry';
import type { DNSWorkspaceLanguage } from '../services/foundation';

type Props = { language: DNSWorkspaceLanguage; identity: DNSIdentity;
  organization: DNSWorkspaceOrganization; organizations: DNSWorkspaceOrganization[];
  tools: WorkspaceTool[]; onOrganizationChange: (id: string) => void };

export function WorkspaceCockpit(props: Props) {
  const { language, identity, organization, organizations, tools, onOrganizationChange } = props;
  const isAdmin = identity.state === 'active' && identity.profile.globalRoles.includes('dns-admin');
  const [showAllNews, setShowAllNews] = useState(false);
  const [releases, setReleases] = useState<DNSRelease[]>([]);
  const [newsError, setNewsError] = useState(false);
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

  if (identity.state !== 'active') return null;
  const eligible = organizations.filter(org => canUseOrganization(identity, org));
  const c = language === 'de' ? {
    title: 'Willkommen', subtitle: 'Ihre digitale Arbeitsumgebung',
    context: 'Organisation', signOut: 'Abmelden',
    admin: 'DNS-Administrator', user: 'Organisationsmitglied',
    today: 'Heute im Workspace', apps: 'Freigegebene Apps',
    access: 'Zugang', active: 'Aktiv', updates: 'Neuigkeiten',
    urgent: 'Wichtige Hinweise', todo: 'Zu tun / beachten',
    noActions: 'Keine dringenden Aktionen für diese Organisation.',
    noTools: 'Für diese Organisation sind derzeit keine Anwendungen freigegeben.',
    ready: 'Workspace bereit',
  } : {
    title: 'Benvenuto', subtitle: 'Il tuo ambiente di lavoro digitale',
    context: 'Organizzazione', signOut: 'Esci',
    admin: 'Amministratore DNS', user: 'Membro dell’organizzazione',
    today: 'Oggi nel Workspace', apps: 'App autorizzate',
    access: 'Accesso', active: 'Attivo', updates: 'Novità',
    urgent: 'Avvisi importanti', todo: 'Da fare / attenzione',
    noActions: 'Nessuna azione urgente per questa organizzazione.',
    noTools: 'Nessuna applicazione attualmente autorizzata per questa organizzazione.',
    ready: 'Workspace operativo',
  };

  return (
    <div className="workspace-cockpit-layout py-4">
      <div className="workspace-cockpit-content">
        <section className="workspace-home-hero">
          <div className="workspace-home-identity">
            <div className="dns-kicker">{c.subtitle}</div>
            <h1>{c.title}</h1>
            <p>{identity.email} · {isAdmin ? c.admin : c.user}</p>
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

        <section className="workspace-dashboard-section" aria-labelledby="workspace-today-title">
          <div className="workspace-dashboard-heading">
            <div>
              <div className="dns-kicker">{organizationName(organization, language)}</div>
              <h2 id="workspace-today-title">{c.today}</h2>
            </div>
            <span className="workspace-status-pill">{c.ready}</span>
          </div>

          <div className="workspace-kpi-grid">
            <article className="workspace-kpi">
              <span>{c.apps}</span>
              <strong>{tools.length}</strong>
              <small>{language === 'de' ? 'in der Navigation verfügbar' : 'disponibili nella sidebar'}</small>
            </article>
            <article className="workspace-kpi">
              <span>{c.access}</span>
              <strong>{c.active}</strong>
              <small>{organizationName(organization, language)}</small>
            </article>
            <article className="workspace-kpi">
              <span>{c.updates}</span>
              <strong>{news.length}</strong>
              <small>{language === 'de' ? 'veröffentlicht' : 'pubblicate'}</small>
            </article>
            <article className={['workspace-kpi', urgent.length ? 'is-attention' : ''].filter(Boolean).join(' ')}>
              <span>{c.urgent}</span>
              <strong>{urgent.length}</strong>
              <small>{urgent.length ? (language === 'de' ? 'bitte prüfen' : 'da verificare') : (language === 'de' ? 'keine' : 'nessuno')}</small>
            </article>
          </div>
        </section>

        <section className="workspace-action-section" aria-labelledby="workspace-actions-title">
          <div className="workspace-dashboard-heading">
            <h2 id="workspace-actions-title">{c.todo}</h2>
          </div>
          {tools.length === 0 || urgent.length > 0 ? (
            <div className="workspace-action-list">
              {tools.length === 0 && <article className="workspace-action-item is-warning">
                <span className="workspace-action-dot" aria-hidden="true" />
                <div><strong>{language === 'de' ? 'Keine Apps freigegeben' : 'Nessuna app autorizzata'}</strong>
                  <p>{c.noTools}</p></div>
              </article>}
              {urgent.slice(0, 3).map(item => <article key={item.id} className="workspace-action-item is-urgent">
                <span className="workspace-action-dot" aria-hidden="true" />
                <div><strong>{item.title[language]}</strong><p>{item.description[language]}</p></div>
              </article>)}
            </div>
          ) : (
            <div className="workspace-empty-state">
              <span aria-hidden="true">✓</span>
              <div><strong>{c.noActions}</strong>
                <p>{language === 'de' ? 'Öffnen Sie Anwendungen direkt über die linke Navigation.' : 'Apri le applicazioni direttamente dalla sidebar a sinistra.'}</p></div>
            </div>
          )}
        </section>
      </div>

      <aside className="workspace-cockpit-sidebar" aria-label={language === 'de' ? 'Neuigkeiten' : 'Novità'}>
        <section className="workspace-news-section space-y-3" aria-labelledby="workspace-news-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="workspace-news-title" className="workspace-news-title">{language === 'de' ? 'Neuigkeiten' : 'Novità'}</h2>
            <button type="button" className="dns-button" data-variant="secondary"
              aria-expanded={showAllNews} onClick={() => setShowAllNews(value => !value)}>
              {showAllNews ? (language === 'de' ? 'Schließen' : 'Chiudi') : (language === 'de' ? 'Alle anzeigen' : 'Vedi tutte')}
            </button>
          </div>
          {newsError ? <p role="status" className="text-sm text-dns-muted">{language === 'de' ? 'Neuigkeiten derzeit nicht verfügbar.' : 'Novità temporaneamente non disponibili.'}</p>
            : news.length === 0 ? <p role="status" className="text-sm text-dns-muted">{language === 'de' ? 'Noch keine veröffentlichten Neuigkeiten.' : 'Nessuna novità pubblicata al momento.'}</p>
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
