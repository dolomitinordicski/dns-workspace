import { useEffect, useRef } from 'react';
import { createDNSThemeMessage, dnsToolThemeOrigin, type DNSThemePreference } from '../workspace/themeBridge';
import type { WorkspaceTool } from '../workspace/registry';
import { workspaceEmbeddedUrl } from '../workspace/embeddedUrl';
import type { DNSWorkspaceLanguage } from '../services/foundation';

export function WorkspaceToolView({ tool, language, onClose }: {
  tool: WorkspaceTool; language: DNSWorkspaceLanguage; onClose: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Delivery remains disabled until each tool explicitly opts into Foundation's receiver.
  const themeBridgeEnabled = false;
  useEffect(() => {
    if (!themeBridgeEnabled || !tool.url) return;
    const root = document.documentElement;
    const sendTheme = () => {
      const preference = root.dataset.dnsThemeChoice;
      if (preference !== 'system' && preference !== 'light' && preference !== 'dark') return;
      frameRef.current?.contentWindow?.postMessage(
        createDNSThemeMessage(preference as DNSThemePreference),
        dnsToolThemeOrigin(tool.url!),
      );
    };
    const frame = frameRef.current;
    frame?.addEventListener('load', sendTheme);
    const observer = new MutationObserver(sendTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-dns-theme-choice'] });
    sendTheme();
    return () => {
      observer.disconnect();
      frame?.removeEventListener('load', sendTheme);
    };
  }, [tool.url]);
  const iframeUrl = tool.url ? workspaceEmbeddedUrl(tool.url) : 'about:blank';
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
    <iframe ref={frameRef} className="workspace-tool-frame" title={tool.label}
      src={iframeUrl} referrerPolicy="strict-origin-when-cross-origin" />
    <p className="workspace-tool-note">{language === 'de'
      ? 'Die Anmeldung wird nicht umgangen; der Tool-Server überprüft seine Berechtigungen.'
      : 'L’accesso non viene aggirato: ogni tool deve verificare i permessi sul proprio backend.'}</p>
  </section>;
}
