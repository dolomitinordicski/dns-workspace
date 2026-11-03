import { useEffect, useState, useSyncExternalStore } from 'react';
import { WorkspaceAccount } from './components/WorkspaceAccount';
import { WorkspaceAccessRequest } from './components/WorkspaceAccessRequest';
import { WorkspaceCockpit } from './components/WorkspaceCockpit';
import { WorkspaceAdminManagement } from './components/WorkspaceAdminManagement';
import { WorkspaceHeader, type WorkspaceView } from './components/WorkspaceHeader';
import { WorkspaceNavigator } from './components/WorkspaceNavigator';
import { WorkspaceToolView } from './components/WorkspaceToolView';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { watchDNSIdentity, type DNSIdentity } from './services/dnsIdentity';
import { getDNSWorkspaceOrganizations, type DNSWorkspaceOrganization } from './services/dnsOrganizations';
import { getDNSWorkspaceLanguage, setDNSWorkspaceLanguage, subscribeDNSWorkspaceLanguage,
  type DNSWorkspaceLanguage } from './services/foundation';
import { canUseOrganization, toolsForOrganization } from './workspace/access';
import { workspaceTools, refreshToolRegistry, subscribeToolRegistry, getToolRegistryRevision, type WorkspaceTool } from './workspace/registry';

export default function App() {
  const registryRevision = useSyncExternalStore(subscribeToolRegistry, getToolRegistryRevision);
  useEffect(() => { void refreshToolRegistry(); }, []);
  const [language, setLanguage] = useState<DNSWorkspaceLanguage>(getDNSWorkspaceLanguage);
  const [identity, setIdentity] = useState<DNSIdentity>({ state: 'loading' });
  const [organizations, setOrganizations] = useState<DNSWorkspaceOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [activeView, setActiveView] = useState<WorkspaceView>('cockpit');
  const [openTool, setOpenTool] = useState<WorkspaceTool | null>(null);

  useEffect(() => subscribeDNSWorkspaceLanguage(setLanguage), []);
  useEffect(() => watchDNSIdentity(setIdentity), []);
  useEffect(() => {
    document.documentElement.dataset.workspaceLanguage = language;
  }, [language]);
  useEffect(() => {
    let active = true;
    getDNSWorkspaceOrganizations().then(items => {
      if (active) setOrganizations(items);
    }).catch(() => { if (active) setOrganizations([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (identity.state !== 'active' || !organizations.length) return;
    const eligible = organizations.filter(org => canUseOrganization(identity, org));
    if (!eligible.length) return;
    const current = eligible.some(org => org.id === organizationId);
    if (current) return;
    if (identity.profile.globalRoles.includes('dns-admin')) {
      setOrganizationId(eligible.find(org => org.id === 'dolomiti-nordicski')?.id ?? eligible[0].id);
    } else {
      setOrganizationId(eligible[0].id);
    }
  }, [identity, organizations, organizationId]);

  const organization = organizations.find(org => org.id === organizationId);
  const authorized = Boolean(organization && canUseOrganization(identity, organization));
  const isAdmin = identity.state === 'active' &&
    identity.profile.globalRoles.includes('dns-admin');
  const availableTools = organization && authorized
    ? toolsForOrganization(identity, organization, workspaceTools) : [];

  const changeOrganization = (id: string) => {
    setOrganizationId(id);
    setOpenTool(null);
    setActiveView('cockpit');
  };
  const openAllowedTool = (tool: WorkspaceTool) => {
    if (availableTools.some(allowed => allowed.id === tool.id) && tool.url) setOpenTool(tool);
  };

  const showWorkspaceShell = authorized && organization;

  return (
    <div className="workspace-app">
      <WorkspaceHeader language={language} activeView={activeView}
        showNavigation={false} adminNavigation={isAdmin}
        onLanguageChange={setDNSWorkspaceLanguage}
        onViewChange={view => { setActiveView(view); setOpenTool(null); }} />
      <main data-dns-shell-main className={showWorkspaceShell ? 'workspace-main workspace-main-authenticated' : 'workspace-main'}>
        {new URLSearchParams(location.search).get('access') === 'request' ? (
          <WorkspaceAccessRequest language={language} organizations={organizations} />
        ) : !showWorkspaceShell ? (
          <WorkspaceAccount language={language} identity={identity} />
        ) : (
          <div className="workspace-authenticated-shell">
            <WorkspaceSidebar language={language} identity={identity}
              organization={organization} tools={availableTools} openTool={openTool}
              activeView={activeView}
              onDashboard={() => { setOpenTool(null); setActiveView('cockpit'); }}
              onOpenTool={openAllowedTool}
              onAdminView={view => { setOpenTool(null); setActiveView(view); }} />
            <div className="workspace-shell-content">
              {openTool ? (
                <WorkspaceToolView language={language} tool={openTool}
                  onClose={() => { setOpenTool(null); setActiveView('cockpit'); }} />
              ) : activeView === 'organizations-access' && isAdmin ? (
                <div className="py-4"><WorkspaceAdminManagement language={language} identity={identity} organizations={organizations} /></div>
              ) : activeView === 'cockpit' || !isAdmin ? (
                <WorkspaceCockpit language={language} identity={identity}
                  organization={organization} organizations={organizations}
                  tools={availableTools} onOrganizationChange={changeOrganization}
                  onOpenTool={openAllowedTool} />
              ) : (
                <WorkspaceNavigator key={registryRevision} language={language} view={activeView}
                  onOpenTool={openAllowedTool} />
              )}
              {!openTool && (
                <p className="text-xs py-3">
                  <a href="/dns-workspace/pass.html" className="dns-button" data-variant="secondary">
                    Digital Pass · {language === 'de' ? 'Öffentliche Registrierung' : 'Registrazione pubblica'}
                  </a>
                </p>
              )}
            </div>
          </div>
        )}
      </main>
      <footer data-dns-tool-footer>
        <div className="dns-tool-footer-shell">
          <span className="dns-tool-footer-primary">Dolomiti NordicSki</span>
          <span className="dns-tool-footer-meta">DNS Workspace · Digital Platform</span>
        </div>
      </footer>
    </div>
  );
}
