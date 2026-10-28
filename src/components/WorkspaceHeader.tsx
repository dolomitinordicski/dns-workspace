import {
  DNS_SHARED_WEB_LOGO_URL,
  DNS_WORKSPACE_FOUNDATION_VERSION,
  type DNSWorkspaceLanguage,
} from '../services/foundation';

export type WorkspaceView = 'cockpit' | 'system-map' | 'orbit';

type WorkspaceHeaderProps = {
  language: DNSWorkspaceLanguage;
  activeView: WorkspaceView;
  onLanguageChange: (language: DNSWorkspaceLanguage) => void;
  onViewChange: (view: WorkspaceView) => void;
  showNavigation: boolean;
  adminNavigation: boolean;
};

export function WorkspaceHeader({
  language,
  activeView,
  onLanguageChange,
  onViewChange,
  showNavigation,
  adminNavigation,
}: WorkspaceHeaderProps) {
  return (
    <>
      <header
        data-dns-tool-header
        id="dns-workspace-header"
        className="workspace-dns-header"
      >
        <div className="dns-tool-header-shell">
          <div className="dns-tool-header-brand">
            <img
              src={DNS_SHARED_WEB_LOGO_URL}
              alt="Dolomiti NordicSki"
              className="dns-tool-header-logo"
            />
            <div className="dns-tool-header-identity">
              <div className="dns-tool-header-title">
                <strong>DNS</strong> <span>WORKSPACE</span>
              </div>
              <div className="dns-tool-header-subtitle">
                {language === 'de' ? 'Digitale Plattform' : 'Piattaforma digitale'}
              </div>
            </div>
          </div>

          <div className="dns-tool-header-actions">
            <div className="dns-tool-header-controls">
              <div data-dns-accessibility-mount className="workspace-accessibility-mount" />
              <div
                className="dns-tool-header-language"
                role="group"
                aria-label={language === 'de' ? 'Sprache' : 'Lingua'}
              >
                {(['de', 'it'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    data-dns-press
                    className={[
                      'workspace-language-button',
                      language === value ? 'is-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-pressed={language === value}
                    onClick={() => onLanguageChange(value)}
                  >
                    {value.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="dns-tool-header-status" data-state="ready" aria-live="polite">
              <span className="dns-tool-header-status-dot" />
              Foundation v{DNS_WORKSPACE_FOUNDATION_VERSION}
            </div>
          </div>
        </div>
      </header>

      {showNavigation && <nav data-dns-tool-nav className="dns-tab-nav workspace-view-nav" aria-label="DNS Workspace">
        <div className="dns-tab-nav-inner">
          <button type="button" className={['dns-tab', activeView === 'cockpit' ? 'dns-tab-active' : ''].filter(Boolean).join(' ')}
            aria-current={activeView === 'cockpit' ? 'page' : undefined}
            onClick={() => onViewChange('cockpit')}>Cockpit</button>
          {adminNavigation && (<>
          <button
            type="button"
            className={['dns-tab', activeView === 'system-map' ? 'dns-tab-active' : ''].filter(Boolean).join(' ')}
            aria-current={activeView === 'system-map' ? 'page' : undefined}
            onClick={() => onViewChange('system-map')}
          >
            System Map
          </button>
          <button
            type="button"
            className={['dns-tab', activeView === 'orbit' ? 'dns-tab-active' : ''].filter(Boolean).join(' ')}
            aria-current={activeView === 'orbit' ? 'page' : undefined}
            onClick={() => onViewChange('orbit')}
          >
            Orbit
          </button>
          </>)}
        </div>
      </nav>}
    </>
  );
}
