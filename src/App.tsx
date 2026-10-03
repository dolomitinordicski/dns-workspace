import { useEffect, useMemo, useState } from 'react';
import { RadialNavigator } from './components/RadialNavigator';
import { ToolDrawer } from './components/ToolDrawer';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import {
  getDNSWorkspaceLanguage,
  setDNSWorkspaceLanguage,
  subscribeDNSWorkspaceLanguage,
  type DNSWorkspaceLanguage,
} from './services/foundation';
import { workspaceTools, type WorkspaceTool } from './workspace/registry';

const copy = {
  de: {
    kicker: 'Dolomiti NordicSki Digital Platform',
    title: 'Ein Workspace. Alle DNS Tools.',
    intro:
      'Die Radialansicht wird zum globalen Application Switcher: Core und Foundation bilden das Zentrum, die DNS Tools wachsen als verbundene Anwendungen darum herum.',
    toolCount: 'Tools',
    hint: 'Klick: Details · Doppelklick: Tool öffnen',
  },
  it: {
    kicker: 'Dolomiti NordicSki Digital Platform',
    title: 'Un workspace. Tutti i tool DNS.',
    intro:
      'La vista radiale diventa l’application switcher globale: Core e Foundation sono il centro, i tool DNS crescono intorno come applicazioni collegate.',
    toolCount: 'Tool',
    hint: 'Click: dettagli · Doppio click: apri tool',
  },
} as const;

export default function App() {
  const [language, setLanguage] = useState<DNSWorkspaceLanguage>(() =>
    getDNSWorkspaceLanguage(),
  );
  const [selectedTool, setSelectedTool] = useState<WorkspaceTool | null>(null);

  useEffect(() => subscribeDNSWorkspaceLanguage(setLanguage), []);
  useEffect(() => {
    document.documentElement.dataset.workspaceLanguage = language;
  }, [language]);

  const counts = useMemo(() => {
    const active = workspaceTools.filter((tool) => tool.lifecycle === 'production').length;
    const development = workspaceTools.filter((tool) => tool.lifecycle === 'development').length;
    return { active, development };
  }, []);

  const text = copy[language];

  return (
    <div className="workspace-app">
      <WorkspaceHeader
        language={language}
        onLanguageChange={setDNSWorkspaceLanguage}
      />

      <main data-dns-shell-main className="workspace-main">
        <section className="workspace-intro">
          <div>
            <span className="dns-kicker">{text.kicker}</span>
            <h1>{text.title}</h1>
            <p>{text.intro}</p>
          </div>

          <div className="workspace-overview dns-card" aria-label="Workspace status">
            <div>
              <span>{text.toolCount}</span>
              <strong>{workspaceTools.length}</strong>
            </div>
            <div>
              <span>Production</span>
              <strong>{counts.active}</strong>
            </div>
            <div>
              <span>Development</span>
              <strong>{counts.development}</strong>
            </div>
          </div>
        </section>

        <div className={["radial-shell", "dns-card", selectedTool ? "has-selection" : ""].filter(Boolean).join(" ")}>
          <div className="radial-shell-head">
            <div>
              <strong className="dns-section-title">RADIAL HUB</strong>
              <span>{text.hint}</span>
            </div>
            {selectedTool ? (
              <button
                className="dns-button"
                data-variant="secondary"
                type="button"
                onClick={() => setSelectedTool(null)}
              >
                {language === 'de' ? 'Auswahl löschen' : 'Cancella selezione'}
              </button>
            ) : null}
          </div>

          <RadialNavigator
            selectedTool={selectedTool}
            onSelectTool={setSelectedTool}
            onClearSelection={() => setSelectedTool(null)}
          />

          <ToolDrawer
            tool={selectedTool}
            language={language}
            onClose={() => setSelectedTool(null)}
          />
        </div>
      </main>
    </div>
  );
}
