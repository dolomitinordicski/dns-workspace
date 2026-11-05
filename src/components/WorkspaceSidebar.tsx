import type { DNSIdentity } from '../services/dnsIdentity';
import { DNS_SHARED_WEB_LOGO_URL, type DNSWorkspaceLanguage } from '../services/foundation';
import { organizationLogoUrl, organizationName, type DNSWorkspaceOrganization } from '../services/dnsOrganizations';
import type { WorkspaceView } from './WorkspaceHeader';
import type { WorkspaceTool } from '../workspace/registry';

type Props = {
  language: DNSWorkspaceLanguage;
  identity: DNSIdentity;
  organization: DNSWorkspaceOrganization;
  tools: WorkspaceTool[];
  toolViewStatus?: 'loading' | 'ready' | 'missing' | 'error';
  openTool: WorkspaceTool | null;
  activeView: WorkspaceView;
  onDashboard: () => void;
  onOpenTool: (tool: WorkspaceTool) => void;
  onAdminView: (view: WorkspaceView) => void;
};

export function WorkspaceSidebar({
  language, identity, organization, tools, toolViewStatus, openTool, activeView,
  onDashboard, onOpenTool, onAdminView,
}: Props) {
  const isAdmin = identity.state === 'active' && identity.profile.globalRoles.includes('dns-admin');
  const logo = organizationLogoUrl(organization) || DNS_SHARED_WEB_LOGO_URL;
  const name = organizationName(organization, language);

  return <aside className="workspace-sidebar" aria-label={language === 'de' ? 'Workspace Navigation' : 'Navigazione Workspace'}>
    <div className="workspace-sidebar-brand">
      <img src={logo} alt="" onError={event => { event.currentTarget.src = DNS_SHARED_WEB_LOGO_URL; }} />
      <div>
        <strong>{name}</strong>
        <span>{isAdmin ? 'DNS Admin' : (language === 'de' ? 'Organisation' : 'Organizzazione')}</span>
      </div>
    </div>

    <nav className="workspace-sidebar-nav">
      <button type="button"
        className={['workspace-sidebar-item', !openTool && activeView === 'cockpit' ? 'is-active' : ''].filter(Boolean).join(' ')}
        onClick={onDashboard}>
        <span className="workspace-sidebar-mark" aria-hidden="true">⌂</span>
        <span>{language === 'de' ? 'Übersicht' : 'Dashboard'}</span>
      </button>

      <div className="workspace-sidebar-section-label">{language === 'de' ? 'Anwendungen' : 'Applicazioni'}</div>
      {toolViewStatus && toolViewStatus !== 'ready' && (
        <p className="px-3 py-2 text-xs text-dns-muted" role="status">
          {toolViewStatus === 'loading'
            ? (language === 'de' ? 'Gebietsrechte werden geladen…' : 'Caricamento permessi area…')
            : toolViewStatus === 'missing'
              ? (language === 'de' ? 'Für dieses Gebiet ist keine Tool-Matrix konfiguriert.' : 'Nessuna matrice tool configurata per quest’area.')
              : (language === 'de' ? 'Gebietsrechte nicht verfügbar.' : 'Permessi area non disponibili.')}
        </p>
      )}
      {toolViewStatus === 'ready' && tools.length === 0 && (
        <p className="px-3 py-2 text-xs text-dns-muted" role="status">
          {language === 'de' ? 'Keine Tools für dieses Gebiet freigegeben.' : 'Nessun tool abilitato per quest’area.'}
        </p>
      )}
      {tools.map(tool => <button key={tool.id} type="button"
        className={['workspace-sidebar-item', openTool?.id === tool.id ? 'is-active' : ''].filter(Boolean).join(' ')}
        data-sidebar-tool-id={tool.id}
        disabled={!tool.url}
        onClick={() => onOpenTool(tool)}>
        <span className="workspace-sidebar-tool-mark" aria-hidden="true">{tool.shortLabel?.slice(0, 1) || tool.label.slice(0, 1)}</span>
        <span>{tool.shortLabel || tool.label}</span>
      </button>)}

      <div className="workspace-sidebar-divider" />
      <a className="workspace-sidebar-item"
        href="https://drive.google.com/drive/folders/1P3eZ4a6SCRucX90uBrRaW9-m1fPE0cdp?usp=drive_link"
        target="_blank" rel="noopener noreferrer"
        aria-label={language === 'de' ? 'Toolbox in neuem Tab öffnen' : 'Apri Toolbox in una nuova scheda'}
        data-sidebar-toolbox>
        <span className="workspace-sidebar-mark" aria-hidden="true">↗</span>
        <span>Toolbox</span>
      </a>

      {isAdmin && <>
        <div className="workspace-sidebar-divider" />
        <div className="workspace-sidebar-section-label">DNS Admin</div>
        <button type="button"
          className={['workspace-sidebar-item', activeView === 'organizations-access' ? 'is-active' : ''].filter(Boolean).join(' ')}
          onClick={() => onAdminView('organizations-access')}>
          <span className="workspace-sidebar-mark" aria-hidden="true">⚙</span>
          <span>{language === 'de' ? 'DNS verwalten' : 'Gestione DNS'}</span>
        </button>
        <button type="button"
          className={['workspace-sidebar-item', activeView === 'system-map' ? 'is-active' : ''].filter(Boolean).join(' ')}
          onClick={() => onAdminView('system-map')}>
          <span className="workspace-sidebar-mark" aria-hidden="true">◇</span>
          <span>System Map</span>
        </button>
        <button type="button"
          className={['workspace-sidebar-item', activeView === 'orbit' ? 'is-active' : ''].filter(Boolean).join(' ')}
          onClick={() => onAdminView('orbit')}>
          <span className="workspace-sidebar-mark" aria-hidden="true">◎</span>
          <span>Orbit</span>
        </button>
      </>}
    </nav>
  </aside>;
}
