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
  tools: WorkspaceTool[]; onOrganizationChange: (id: string) => void;
  onOpenTool: (tool: WorkspaceTool) => void };

export function WorkspaceCockpit(props: Props) {
  const { language, identity, organization, organizations, tools, onOrganizationChange, onOpenTool } = props;
  const isAdmin = identity.state === 'active' && identity.profile.globalRoles.includes('dns-admin');
  const [showAllNews, setShowAllNews] = useState(false);
  const [releases, setReleases] = useState<DNSRelease[]>([]);
  const [newsError, setNewsError] = useState(false);
  const allowedIds = tools.map(tool => tool.id).join(',');
  const news = releases.filter(item => item.type !== 'technical');
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
    context: 'Organisation', tools: 'Ihre Anwendungen',
    empty: 'Für diese Organisation sind noch keine Tools freigegeben.',
    signOut: 'Abmelden', admin: 'DNS-Administrator', user: 'Organisationsmitglied',
    hint: 'Die Freigabe im Cockpit ersetzt keine Berechtigungsprüfung im Tool.',
    open: 'Öffnen',
  } : {
    title: 'Benvenuto', subtitle: 'Il tuo ambiente di lavoro digitale',
    context: 'Organizzazione', tools: 'Le tue applicazioni',
    empty: 'Nessun tool ancora autorizzato per questa organizzazione.',
    signOut: 'Esci', admin: 'Amministratore DNS', user: 'Membro dell’organizzazione',
    hint: 'La visibilità nel cockpit non sostituisce i controlli di accesso di ogni tool.',
    open: 'Apri',
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
      <section className="space-y-3">
        <div className="workspace-apps-heading">
          <div>
            <div className="dns-kicker">{organizationName(organization, language)}</div>
            <h2>{c.tools}</h2>
          </div>
          <span>{tools.length}</span>
        </div>
        {tools.length === 0 ? <p className="dns-card p-5">{c.empty}</p> : (
          <div className="workspace-cockpit-tools">
            {tools.map(tool => {
              return <button key={tool.id} type="button"
                className="workspace-app-card" data-tool-id={tool.id}
                disabled={!tool.url} onClick={() => onOpenTool(tool)}
                aria-label={`${c.open}: ${tool.label}`}>
                <span className="workspace-app-card-top">
                  <span className="workspace-app-icon" aria-hidden="true">{tool.label.slice(0, 1).toUpperCase()}</span>
                  <span className="workspace-app-arrow" aria-hidden="true">↗</span>
                </span>
                <span className="workspace-app-card-name">{tool.label}</span>
                <span className="workspace-app-card-description">{tool.description[language]}</span>
                <span className="workspace-app-card-action">{language === 'de' ? 'Öffnen' : 'Apri'} <span aria-hidden="true">→</span></span>
              </button>;
            })}         </div>
        )}
      </section>

      </div>
      <aside className="workspace-cockpit-sidebar" aria-label={language === 'de' ? 'Neuigkeiten' : 'Novità'}>
      <section className="workspace-news-section space-y-3" aria-labelledby="workspace-news-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="workspace-news-title" className="workspace-news-title">{language === 'de' ? 'Neuigkeiten' : 'Novità'}</h2>
          </div>
          <button type="button" className="dns-button" data-variant="secondary"
            aria-expanded={showAllNews} onClick={() => setShowAllNews(value => !value)}>
            {showAllNews ? (language === 'de' ? 'Schließen' : 'Chiudi') : (language === 'de' ? 'Alle anzeigen' : 'Vedi tutte')}
          </button>
        </div>
        {newsError ? <p role="status" className="text-sm text-dns-muted">{language === 'de' ? 'Neuigkeiten derzeit nicht verfügbar.' : 'Novità temporaneamente non disponibili.'}</p>
          : news.length === 0 ? <p role="status" className="text-sm text-dns-muted">{language === 'de' ? 'Noch keine veröffentlichten Neuigkeiten.' : 'Nessuna novità pubblicata al momento.'}</p>
          : <div className="space-y-3">{(showAllNews ? news : news.slice(0, 2)).map(item =>
            <article key={item.id} className="space-y-1 border-b pb-2">
              <div className="dns-kicker">{item.toolId} · {item.version} · {item.type === 'urgent' ? (language === 'de' ? 'Wichtig' : 'Urgente') : item.type === 'technical' ? (language === 'de' ? 'Technisch' : 'Tecnica') : (language === 'de' ? 'Neu' : 'Novità')}</div>
              <h3 className="font-semibold">{item.title[language]}</h3>
              <p className="text-sm text-dns-muted">{item.description[language]}</p>
            </article>)}</div>}
      </section>

      </aside>
    </div>
  );
}
