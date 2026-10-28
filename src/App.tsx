import { useEffect, useState } from 'react';
import { WorkspaceAccount } from './components/WorkspaceAccount';
import { WorkspaceCockpit } from './components/WorkspaceCockpit';
import { WorkspaceHeader, type WorkspaceView } from './components/WorkspaceHeader';
import { WorkspaceNavigator } from './components/WorkspaceNavigator';
import { WorkspaceToolView } from './components/WorkspaceToolView';
import { watchDNSIdentity, type DNSIdentity } from './services/dnsIdentity';
import { getDNSWorkspaceOrganizations, type DNSWorkspaceOrganization } from './services/dnsOrganizations';
import { getDNSWorkspaceLanguage, setDNSWorkspaceLanguage, subscribeDNSWorkspaceLanguage,
  type DNSWorkspaceLanguage } from './services/foundation';
import { canUseOrganization, toolsForOrganization } from './workspace/access';
import { workspaceTools, type WorkspaceTool } from './workspace/registry';

export default function App() {
  const [language, setLanguage] = useState<DNSWorkspaceLanguage>(getDNSWorkspaceLanguage);
  const [identity, setIdentity] = useState<DNSIdentity>({ state: 'loading' });
  const [organizations, setOrganizations] = useState<DNSWorkspaceOrganization[]>([]);
  const [organizationStatus, setOrganizationStatus] = useState<'loading' | 'ready' | 'error'>('loading');
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
      if (active) { setOrganizations(items); setOrganizationStatus('ready'); }
    }).catch(() => { if (active) setOrganizationStatus('error'); });
    return () => { active = false; };
  }, []);

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

  return (
    <div className="workspace-app">
      <WorkspaceHeader language={language} activeView={activeView}
        showNavigation={authorized} adminNavigation={isAdmin}
        onLanguageChange={setDNSWorkspaceLanguage}
        onViewChange={view => { setActiveView(view); setOpenTool(null); }} />
      <main data-dns-shell-main className="workspace-main">
        {!authorized || !organization ? (
          <WorkspaceAccount language={language} identity={identity}
            organizations={organizations} organizationStatus={organizationStatus}
            selectedOrganizationId={organizationId} onOrganizationChange={changeOrganization} />
        ) : openTool ? (
          <WorkspaceToolView language={language} tool={openTool}
            onClose={() => { setOpenTool(null); setActiveView('cockpit'); }} />
        ) : activeView === 'cockpit' || !isAdmin ? (
          <WorkspaceCockpit language={language} identity={identity}
            organization={organization} organizations={organizations}
            tools={availableTools} onOrganizationChange={changeOrganization}
            onOpenTool={openAllowedTool} />
        ) : (
          <WorkspaceNavigator language={language} view={activeView}
            onOpenTool={openAllowedTool} />
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
