type WorkspaceHeaderProps = {
  language: 'de' | 'it';
  onLanguageChange: (language: 'de' | 'it') => void;
};

export function WorkspaceHeader({
  language,
  onLanguageChange,
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="workspace-brand">
        <div className="workspace-wordmark">
          <strong>DNS</strong>
          <span>WORKSPACE</span>
        </div>
        <span className="workspace-phase">W0 · RADIAL NAVIGATION</span>
      </div>

      <nav className="workspace-view-nav" aria-label="Workspace views">
        <button className="workspace-view-button is-active" type="button">
          Radial Hub
        </button>
        <button className="workspace-view-button" type="button" disabled>
          Architecture
        </button>
        <button className="workspace-view-button" type="button" disabled>
          Registry
        </button>
      </nav>

      <div className="language-switch" aria-label="Language">
        {(['de', 'it'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={language === value}
            onClick={() => onLanguageChange(value)}
          >
            {value.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}
