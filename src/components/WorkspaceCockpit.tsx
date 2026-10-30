import { AppWindow, ChartNoAxesCombined, ClipboardList, Database, Palette, ReceiptText, Users } from 'lucide-react';
import { getDNSToolIcon } from '@dolomitinordicski/dns-shared-data/tool-icons';
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
  const [showTechnical, setShowTechnical] = useState(false);
  const [releases, setReleases] = useState<DNSRelease[]>([]);
  const [newsError, setNewsError] = useState(false);
  const allowedIds = tools.map(tool => tool.id).join(',');
  const news = releases.filter(item => item.type !== 'technical');
  const technical = isAdmin ? releases.filter(item => item.type === 'technical') : [];
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
    <div className="workspace-cockpit-layout py-4">
      <div className="workspace-cockpit-content">
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
      {isAdmin && <section className="dns-card p-5 space-y-3" aria-labelledby="workspace-technical-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="dns-kicker">{language === 'de' ? 'Nur DNS Admin' : 'Solo DNS Admin'}</div>
            <h2 id="workspace-technical-title" className="dns-section-title">{language === 'de' ? 'Technisches Änderungsprotokoll' : 'Registro tecnico'}</h2>
          </div>
          <button type="button" className="dns-button" data-variant="secondary"
            aria-expanded={showTechnical} onClick={() => setShowTechnical(value => !value)}>
            {showTechnical ? (language === 'de' ? 'Schließen' : 'Chiudi') : (language === 'de' ? 'Anzeigen' : 'Visualizza')}
          </button>
        </div>
        {showTechnical && (newsError
          ? <p role="status">{language === 'de' ? 'Technisches Protokoll derzeit nicht verfügbar.' : 'Registro tecnico temporaneamente non disponibile.'}</p>
          : technical.length === 0
          ? <p role="status" className="text-sm text-dns-muted">{language === 'de' ? 'Noch keine technischen Einträge.' : 'Nessuna voce tecnica pubblicata.'}</p>
          : <div className="space-y-3">{technical.map(item => <article key={item.id} className="border-b pb-2 space-y-1">
              <div className="dns-kicker">{item.toolId} · {item.version} · {item.publishedAt}</div>
              <h3 className="font-semibold">{item.title[language]}</h3>
              <p className="text-sm text-dns-muted">{item.description[language]}</p>
            </article>)}</div>)}
      </section>}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="dns-section-title">{c.tools} · {organizationName(organization, language)}</h2>
          <span className="text-sm">{tools.length}</span>
        </div>
        {tools.length === 0 ? <p className="dns-card p-5">{c.empty}</p> : (
          <div className="workspace-cockpit-tools">
            {tools.map(tool => {
              const visual = getDNSToolIcon(tool.id);
              const icons = {
                'chart-no-axes-combined': ChartNoAxesCombined,
                database: Database,
                'receipt-text': ReceiptText,
                palette: Palette,
                users: Users,
                'clipboard-list': ClipboardList,
                'app-window': AppWindow,
              };
              const ToolIcon = icons[visual.icon];
              return <button key={tool.id} type="button"
                className="workspace-app-card" data-category={visual.category}
                disabled={!tool.url} onClick={() => onOpenTool(tool)}
                aria-label={`${c.open}: ${tool.label}`}>
                <span className="workspace-app-card-top">
                  <span className="workspace-app-icon" aria-hidden="true"><ToolIcon size={24} strokeWidth={1.8} /></span>
                  <span className="workspace-app-arrow" aria-hidden="true">↗</span>
                </span>
                <span className="workspace-app-card-name">{tool.label}</span>
                <span className="workspace-app-card-description">{tool.description[language]}</span>
                <span className="workspace-app-card-meta">{tool.group} · {tool.lifecycle}</span>
              </button>;
            })}         </div>
        )}
      </section>
      <p className="text-xs text-dns-muted">{c.hint}</p>
      </div>
      <aside className="workspace-cockpit-sidebar" aria-label={language === 'de' ? 'Neuigkeiten' : 'Novità'}>
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
        {newsError ? <p role="status" className="text-sm text-dns-muted">{language === 'de' ? 'Neuigkeiten derzeit nicht verfügbar.' : 'Novità temporaneamente non disponibili.'}</p>
          : news.length === 0 ? <p role="status" className="text-sm text-dns-muted">{language === 'de' ? 'Noch keine veröffentlichten Neuigkeiten.' : 'Nessuna novità pubblicata al momento.'}</p>
          : <div className="space-y-3">{(showAllNews ? news : news.slice(0, 3)).map(item =>
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
