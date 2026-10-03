import { useMemo, useState } from 'react';
import { RadialNavigator } from './components/RadialNavigator';
import { ToolDrawer } from './components/ToolDrawer';
import { WorkspaceHeader } from './components/WorkspaceHeader';
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
  const [language, setLanguage] = useState<'de' | 'it'>('de');
  const [selectedTool, setSelectedTool] = useState<WorkspaceTool | null>(null);

  const counts = useMemo(() => {
    const active = workspaceTools.filter((tool) => tool.lifecycle === 'production').length;
    const development = workspaceTools.filter((tool) => tool.lifecycle === 'development').length;
    return { active, development };
  }, []);

  const text = copy[language];

  return (
    <div className="workspace-app">
      <WorkspaceHeader language={language} onLanguageChange={setLanguage} />

      <main className="workspace-main">
        <section className="workspace-intro">
          <div>
            <span className="workspace-kicker">{text.kicker}</span>
            <h1>{text.title}</h1>
            <p>{text.intro}</p>
          </div>

          <div className="workspace-overview" aria-label="Workspace status">
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

        <div className="radial-shell">
          <div className="radial-shell-head">
            <div>
              <strong>RADIAL HUB</strong>
              <span>{text.hint}</span>
            </div>
            {selectedTool ? (
              <button type="button" onClick={() => setSelectedTool(null)}>
                {language === 'de' ? 'Auswahl löschen' : 'Cancella selezione'}
              </button>
            ) : null}
          </div>

          <RadialNavigator
            selectedTool={selectedTool}
            onSelectTool={setSelectedTool}
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
