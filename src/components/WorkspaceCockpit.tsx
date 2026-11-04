import { useEffect, useState } from 'react';
import { loadDNSReleases, type DNSRelease } from '../services/dnsReleases';
import type { DNSIdentity } from '../services/dnsIdentity';
import { organizationName, type DNSWorkspaceOrganization } from '../services/dnsOrganizations';
import { signOutDNS } from '../services/dnsIdentity';
import { canUseOrganization, toolsForOrganization } from '../workspace/access';
import type { WorkspaceTool } from '../workspace/registry';
import type { DNSWorkspaceLanguage } from '../services/foundation';

type Props = { language: DNSWorkspaceLanguage; identity: DNSIdentity;
  organization: DNSWorkspaceOrganization; organizations: DNSWorkspaceOrganization[];
  tools: WorkspaceTool[]; onOrganizationChange: (id: string) => void };

const availability = (tools: WorkspaceTool[], id: string) => tools.some(tool => tool.id === id);

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
  const orgRows = isAdmin ? eligible.filter(org => org.id !== 'dolomiti-nordicski') : [organization];

  const hasAnalytics = availability(tools, 'analytics');
  const hasDataEntry = availability(tools, 'data-entry');
  const hasPartnerHub = availability(tools, 'partner-hub');
  const c = language === 'de' ? {
    title: isAdmin ? 'DNS Network Pulse' : 'Bereich Pulse',
    subtitle: isAdmin ? 'Operativer Überblick über das DNS Netzwerk' : 'Operativer Überblick für Ihre Organisation',
    context: 'Organisation', signOut: 'Abmelden',
    pulse: 'Aktueller Status', actions: 'Zu tun / beachten',
    performance: 'Performance', tracks: 'Loipen', partners: 'Partnerbetriebe',
    deadlines: 'Nächste Schritte', news: 'Neuigkeiten',
    available: 'Verfügbar', notConnected: 'Noch nicht verbunden', attention: 'Prüfen',
    dataEntry: 'Data Entry', analytics: 'Analytics', partnerHub: 'Partner Hub',
  } : {
    title: isAdmin ? 'DNS Network Pulse' : 'Pulse dell’area',
    subtitle: isAdmin ? 'Panoramica operativa della rete Dolomiti NordicSki' : 'Panoramica operativa della tua organizzazione',
    context: 'Organizzazione', signOut: 'Esci',
    pulse: 'Stato attuale', actions: 'Da fare / attenzione',
    performance: 'Performance', tracks: 'Piste', partners: 'Partnerbetriebe',
    deadlines: 'Prossimi passi', news: 'Novità',
    available: 'Disponibile', notConnected: 'Non ancora collegato', attention: 'Da verificare',
    dataEntry: 'Data Entry', analytics: 'Analytics', partnerHub: 'Partner Hub',
  };

  return <div className="workspace-business-dashboard py-4">
    <section className="workspace-home-hero">
      <div className="workspace-home-identity">
        <div className="dns-kicker">{c.subtitle}</div>
        <h1>{c.title}</h1>
        <p>{organizationName(organization, language)}</p>
      </div>
      <div className="workspace-home-actions">
        {isAdmin && <label className="workspace-org-switcher">
          <span>{c.context}</span>
          <select className="dns-input" value={organization.id}
            onChange={e => onOrganizationChange(e.target.value)}>
            {eligible.map(org => <option key={org.id} value={org.id}>{organizationName(org, language)}</option>)}
          </select>
        </label>}
        <button className="workspace-signout-link" type="button" onClick={() => void signOutDNS()}>{c.signOut}</button>
      </div>
    </section>

    <section className="workspace-pulse-section">
      <div className="workspace-dashboard-heading"><h2>{c.pulse}</h2></div>
      {isAdmin ? <div className="workspace-network-table">
        <div className="workspace-network-row is-head">
          <span>{language === 'de' ? 'Gebiet' : 'Area'}</span><span>{c.dataEntry}</span><span>{c.analytics}</span><span>{c.partnerHub}</span><span>{language === 'de' ? 'Status' : 'Stato'}</span>
        </div>
        {orgRows.map(org => {
          const orgTools = toolsForOrganization(identity, org, tools);
          const dataEntry = availability(orgTools, 'data-entry');
          const analytics = availability(orgTools, 'analytics');
          const partner = availability(orgTools, 'partner-hub');
          const ok = dataEntry || analytics || partner;
          return <div className="workspace-network-row" key={org.id}>
            <strong>{organizationName(org, language)}</strong>
            <span className={dataEntry ? 'is-ok' : 'is-muted'}>{dataEntry ? '●' : '–'}</span>
            <span className={analytics ? 'is-ok' : 'is-muted'}>{analytics ? '●' : '–'}</span>
            <span className={partner ? 'is-ok' : 'is-muted'}>{partner ? '●' : '–'}</span>
            <span className={ok ? 'workspace-state-badge is-ok' : 'workspace-state-badge'}>{ok ? 'OK' : c.attention}</span>
          </div>;
        })}
      </div> : <div className="workspace-area-pulse-grid">
        <article><span>{c.dataEntry}</span><strong>{hasDataEntry ? c.available : c.notConnected}</strong></article>
        <article><span>{c.analytics}</span><strong>{hasAnalytics ? c.available : c.notConnected}</strong></article>
        <article><span>{c.partnerHub}</span><strong>{hasPartnerHub ? c.available : c.notConnected}</strong></article>
      </div>}
    </section>

    <div className="workspace-dashboard-columns">
      <div className="workspace-dashboard-primary">
        <section className="workspace-action-section">
          <div className="workspace-dashboard-heading"><h2>{c.actions}</h2></div>
          {urgent.length ? <div className="workspace-action-list">
            {urgent.slice(0, 4).map(item => <article key={item.id} className="workspace-action-item is-urgent">
              <span className="workspace-action-dot" aria-hidden="true" />
              <div><strong>{item.title[language]}</strong><p>{item.description[language]}</p></div>
            </article>)}
          </div> : <div className="workspace-empty-state">
            <span aria-hidden="true">✓</span>
            <div><strong>{language === 'de' ? 'Keine dringenden Hinweise' : 'Nessun avviso urgente'}</strong>
              <p>{language === 'de' ? 'Aktuell sind keine veröffentlichten dringenden Hinweise vorhanden.' : 'Al momento non risultano avvisi urgenti pubblicati.'}</p></div>
          </div>}
        </section>

        <section className="workspace-module-grid">
          <article className="workspace-module-card">
            <div><span className="dns-kicker">{c.performance}</span><h3>{language === 'de' ? 'Verkäufe & Saison' : 'Vendite & stagione'}</h3></div>
            <strong>{hasAnalytics ? c.available : c.notConnected}</strong>
            <p>{language === 'de' ? 'Ticket, Umsatz und Vergleich zur Vorsaison werden hier eingebunden.' : 'Qui confluiranno ticket, fatturato e confronto con la stagione precedente.'}</p>
          </article>
          <article className="workspace-module-card">
            <div><span className="dns-kicker">{c.tracks}</span><h3>{language === 'de' ? 'Loipen heute' : 'Piste oggi'}</h3></div>
            <strong>{c.notConnected}</strong>
            <p>{language === 'de' ? 'Offene Kilometer, Netzanteil und letzter Datenstand.' : 'Km aperti, percentuale di rete e ultimo aggiornamento.'}</p>
          </article>
          <article className="workspace-module-card">
            <div><span className="dns-kicker">{c.partners}</span><h3>{language === 'de' ? 'Partnerstatus' : 'Stato partner'}</h3></div>
            <strong>{hasPartnerHub ? c.available : c.notConnected}</strong>
            <p>{language === 'de' ? 'Aktive Partner, Widgetstatus und offene Onboardings.' : 'Partner attivi, stato widget e onboarding ancora aperti.'}</p>
          </article>
          <article className="workspace-module-card">
            <div><span className="dns-kicker">{c.deadlines}</span><h3>{language === 'de' ? 'Termine & Freigaben' : 'Scadenze & approvazioni'}</h3></div>
            <strong>{c.notConnected}</strong>
            <p>{language === 'de' ? 'Data Entry, Preise, FAIR und operative Fristen.' : 'Data Entry, prezzi, FAIR e scadenze operative.'}</p>
          </article>
        </section>
      </div>

      <aside className="workspace-cockpit-sidebar" aria-label={c.news}>
        <section className="workspace-news-section space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="workspace-news-title">{c.news}</h2>
            <button type="button" className="dns-button" data-variant="secondary"
              aria-expanded={showAllNews} onClick={() => setShowAllNews(v => !v)}>
              {showAllNews ? (language === 'de' ? 'Schließen' : 'Chiudi') : (language === 'de' ? 'Alle' : 'Tutte')}
            </button>
          </div>
          {newsError ? <p className="text-sm text-dns-muted">{language === 'de' ? 'Derzeit nicht verfügbar.' : 'Temporaneamente non disponibili.'}</p>
            : news.length === 0 ? <p className="text-sm text-dns-muted">{language === 'de' ? 'Keine veröffentlichten Neuigkeiten.' : 'Nessuna novità pubblicata.'}</p>
            : <div className="space-y-3">{(showAllNews ? news : news.slice(0, 4)).map(item => <article key={item.id} className="workspace-news-item">
              <div className="dns-kicker">{item.toolId} · {item.version}</div>
              <h3>{item.title[language]}</h3>
              <p>{item.description[language]}</p>
            </article>)}</div>}
        </section>
      </aside>
    </div>
  </div>;
}
