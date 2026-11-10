import { useState } from 'react';
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
  const hint = language === 'de'
    ? 'Klick: Details · Doppelklick: Tool öffnen'
    : 'Click: dettagli · Doppio click: apri tool';
  return (
    <div className="space-y-4 py-4">
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
