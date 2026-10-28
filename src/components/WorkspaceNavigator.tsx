import { useState } from 'react';
import { DigitalPassOperator } from './DigitalPassOperator';
import { RadialNavigator } from './RadialNavigator';
import { SystemMapNavigator } from './SystemMapNavigator';
import { ToolDrawer } from './ToolDrawer';
import type { WorkspaceView } from './WorkspaceHeader';
import type { WorkspaceTool } from '../workspace/registry';
import type { DNSWorkspaceLanguage } from '../services/foundation';

export function WorkspaceNavigator({ language, view, onOpenTool }: {
  language: DNSWorkspaceLanguage; view: WorkspaceView;
  onOpenTool: (tool: WorkspaceTool) => void;
}) {
  const [selectedTool, setSelectedTool] = useState<WorkspaceTool | null>(null);
  const [digitalPassOpen, setDigitalPassOpen] = useState(false);
  const hint = language === 'de'
    ? 'Klick: Details · Doppelklick: Tool öffnen'
    : 'Click: dettagli · Doppio click: apri tool';
  if (digitalPassOpen) return <DigitalPassOperator language={language}
    onClose={() => setDigitalPassOpen(false)} />;
  return (
    <div className="space-y-4 py-4">
      <section className="dns-card p-4">
        <strong>DNS Digital Pass · Pilot 2026/27</strong>
        <p>{language === 'de' ? 'Saisonkarten-Aktivierung (noch nicht live)'
          : 'Attivazione stagionali (non ancora operativa)'}</p>
        <button type="button" className="dns-button" data-variant="secondary"
          onClick={() => setDigitalPassOpen(true)}>
          {language === 'de' ? 'Oberfläche öffnen' : 'Apri interfaccia'}
        </button>
      </section>
      <div className={['radial-shell', 'dns-card', selectedTool ? 'has-selection' : ''].filter(Boolean).join(' ')}>
        <div className="radial-shell-head">
          <div><strong className="dns-section-title">
            {view === 'system-map' ? 'SYSTEM MAP' : 'ORBIT'}
          </strong><span>{hint}</span></div>
          {selectedTool && <button className="dns-button" data-variant="secondary"
            type="button" onClick={() => setSelectedTool(null)}>
            {language === 'de' ? 'Auswahl löschen' : 'Cancella selezione'}
          </button>}
        </div>
        {view === 'system-map'
          ? <SystemMapNavigator selectedTool={selectedTool} onSelectTool={setSelectedTool}
              onClearSelection={() => setSelectedTool(null)} onOpenTool={onOpenTool} />
          : <RadialNavigator selectedTool={selectedTool} onSelectTool={setSelectedTool}
              onClearSelection={() => setSelectedTool(null)} onOpenTool={onOpenTool} />}
        <ToolDrawer tool={selectedTool} language={language}
          onClose={() => setSelectedTool(null)} onOpenTool={onOpenTool} />
      </div>
    </div>
  );
}
