import type { WorkspaceTool } from '../workspace/registry';
import type { DNSWorkspaceLanguage } from '../services/foundation';

export function WorkspaceToolView({ tool, language, onClose }: {
  tool: WorkspaceTool; language: DNSWorkspaceLanguage; onClose: () => void;
}) {
  return <section className="workspace-tool-view" aria-label={tool.label}>
    <div className="workspace-tool-toolbar">
      <button className="dns-button" data-variant="secondary" type="button" onClick={onClose}>
        {language === 'de' ? '← Zurück zum Cockpit' : '← Torna al cockpit'}
      </button>
      <strong>{tool.label}</strong>
      <a className="dns-button" data-variant="secondary" href={tool.url || '#'}
        target="_blank" rel="noopener noreferrer">
        {language === 'de' ? 'Eigenständiges Tool' : 'Tool autonomo'}
      </a>
    </div>
    <iframe className="workspace-tool-frame" title={tool.label}
      src={tool.url || 'about:blank'} referrerPolicy="strict-origin-when-cross-origin" />
    <p className="workspace-tool-note">{language === 'de'
      ? 'Die Anmeldung wird nicht umgangen; der Tool-Server überprüft seine Berechtigungen.'
      : 'L’accesso non viene aggirato: ogni tool deve verificare i permessi sul proprio backend.'}</p>
  </section>;
}
