import type { WorkspaceTool } from '../workspace/registry';
import { getDownstreamTools, getTool, workspaceCanonical } from '../workspace/registry';

type ToolDrawerProps = {
  tool: WorkspaceTool | null;
  language: 'de' | 'it';
  onClose: () => void;
};

function lifecycleLabel(value: WorkspaceTool['lifecycle']) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ToolDrawer({ tool, language, onClose }: ToolDrawerProps) {
  if (!tool) return null;

  const dependencies = tool.dependencies
    .map((id) => getTool(id))
    .filter((entry): entry is WorkspaceTool => Boolean(entry));

  const downstream = getDownstreamTools(tool.id);

  return (
    <aside className="tool-drawer" aria-label={`${tool.label} details`}>
      <div className="tool-drawer-head">
        <div>
          <span className="drawer-eyebrow">{lifecycleLabel(tool.lifecycle)}</span>
          <h2>{tool.label}</h2>
        </div>
        <button className="drawer-close" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <p className="drawer-description">{tool.description[language]}</p>

      <div className="drawer-status-row">
        <span className="runtime-pill is-active">WEB</span>
        <span className={tool.backend.kind === 'none' ? 'runtime-pill' : 'runtime-pill is-active'}>
          FIREBASE
        </span>
        <span className="runtime-pill is-active">FOUNDATION</span>
      </div>

      <dl className="drawer-grid">
        <div>
          <dt>Foundation</dt>
          <dd>{workspaceCanonical.foundation.version}</dd>
        </div>
        <div>
          <dt>Design System</dt>
          <dd>{workspaceCanonical.designSystem.version}</dd>
        </div>
        <div>
          <dt>Shared Data</dt>
          <dd>{workspaceCanonical.sharedData.version}</dd>
        </div>
        <div>
          <dt>Backend</dt>
          <dd>{tool.backend.label}</dd>
        </div>
      </dl>

      <section className="drawer-section">
        <h3>{language === 'de' ? 'Abhängigkeiten' : 'Dipendenze'}</h3>
        <div className="drawer-chips">
          {dependencies.length ? (
            dependencies.map((entry) => <span key={entry.id}>{entry.shortLabel}</span>)
          ) : (
            <span>—</span>
          )}
        </div>
      </section>

      <section className="drawer-section">
        <h3>{language === 'de' ? 'Verbundene Consumer' : 'Consumer collegati'}</h3>
        <div className="drawer-chips">
          {downstream.length ? (
            downstream.map((entry) => <span key={entry.id}>{entry.shortLabel}</span>)
          ) : (
            <span>—</span>
          )}
        </div>
      </section>

      <div className="drawer-actions">
        {tool.url ? (
          <button
            className="primary-action"
            type="button"
            onClick={() => window.open(tool.url!, '_blank', 'noopener,noreferrer')}
          >
            {language === 'de' ? 'Tool standalone öffnen' : 'Apri tool standalone'}
          </button>
        ) : null}
        <p>
          {language === 'de'
            ? 'Doppelklick auf den Knoten öffnet das Tool direkt.'
            : 'Doppio clic sul nodo apre direttamente il tool.'}
        </p>
      </div>
    </aside>
  );
}
