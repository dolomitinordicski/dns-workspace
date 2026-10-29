import { useState } from 'react';
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
  if (identity.state !== 'active') return null;
  const isAdmin = identity.profile.globalRoles.includes('dns-admin');
  const [showAllNews, setShowAllNews] = useState(false);
  const eligible = organizations.filter(org => canUseOrganization(identity, org));
  const c = language === 'de' ? {
    title: 'Mein DNS Cockpit', subtitle: 'Ihre digitale Arbeitsumgebung',
    context: 'Organisation', tools: 'Verfügbare Anwendungen',
    empty: 'Für diese Organisation sind noch keine Tools freigegeben.',
    signOut: 'Abmelden', admin: 'DNS-Administrator', user: 'Organisationsmitglied',
    hint: 'Die Freigabe im Cockpit ersetzt keine Berechtigungsprüfung im Tool.',
    open: 'Öffnen',
  } : {
    title: 'Il mio cockpit DNS', subtitle: 'Il tuo ambiente di lavoro digitale',
    context: 'Organizzazione', tools: 'Applicazioni disponibili',
    empty: 'Nessun tool ancora autorizzato per questa organizzazione.',
    signOut: 'Esci', admin: 'Amministratore DNS', user: 'Membro dell’organizzazione',
    hint: 'La visibilità nel cockpit non sostituisce i controlli di accesso di ogni tool.',
    open: 'Apri',
  };
  return (
    <div className="space-y-5 py-4">
      <section className="dns-card p-5 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <div className="dns-kicker">{c.subtitle}</div>
          <h1 className="text-2xl font-semibold">{c.title}</h1>
          <p className="text-sm">{identity.email} · {isAdmin ? c.admin : c.user}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">{c.context}</span>
            <select className="dns-input w-full" value={organization.id}
              onChange={e => onOrganizationChange(e.target.value)}>
              {eligible.map(org => <option key={org.id} value={org.id}>{organizationName(org, language)}</option>)}
            </select>
          </label>
          <button className="dns-button" data-variant="secondary" type="button"
            onClick={() => void signOutDNS()}>{c.signOut}</button>
        </div>
      </section>
      <section className="dns-card p-5 space-y-3" aria-labelledby="workspace-news-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="dns-kicker">{language === 'de' ? 'Aktuelles' : 'Aggiornamenti'}</div>
            <h2 id="workspace-news-title" className="dns-section-title">{language === 'de' ? 'Neuigkeiten' : 'Novità'}</h2>
          </div>
          <button type="button" className="dns-button" data-variant="secondary"
            aria-expanded={showAllNews} onClick={() => setShowAllNews(value => !value)}>
            {showAllNews ? (language === 'de' ? 'Schließen' : 'Chiudi') : (language === 'de' ? 'Alle anzeigen' : 'Vedi tutte')}
          </button>
        </div>
        <p className="text-sm text-dns-muted" role="status">
          {language === 'de'
            ? 'Noch keine veröffentlichten Neuigkeiten.'
            : 'Nessuna novità pubblicata al momento.'}
        </p>
        {showAllNews && <p className="text-xs text-dns-muted">
          {isAdmin
            ? (language === 'de' ? 'Technische Releases, neue Funktionen und wichtige Hinweise.' : 'Release tecniche, nuove funzionalità e comunicazioni urgenti.')
            : (language === 'de' ? 'Neue Funktionen, Updates und wichtige Hinweise.' : 'Nuove funzionalità, aggiornamenti e comunicazioni urgenti.')}
        </p>}
      </section>
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="dns-section-title">{c.tools} · {organizationName(organization, language)}</h2>
          <span className="text-sm">{tools.length}</span>
        </div>
        {tools.length === 0 ? <p className="dns-card p-5">{c.empty}</p> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map(tool => (
              <article key={tool.id} className="dns-card p-4 space-y-3">
                <div className="dns-kicker">{tool.group} · {tool.lifecycle}</div>
                <h3 className="font-semibold text-lg">{tool.label}</h3>
                <p className="text-sm text-dns-muted">{tool.description[language]}</p>
                <button type="button" data-variant="primary" className="dns-button"
                  disabled={!tool.url} onClick={() => onOpenTool(tool)}>{c.open}</button>
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="text-xs text-dns-muted">{c.hint}</p>
    </div>
  );
}
