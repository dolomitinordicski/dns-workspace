import { useEffect, useMemo, useState } from 'react';
import { DigitalPassOperator } from './components/DigitalPassOperator';
import { RadialNavigator } from './components/RadialNavigator';
import { SystemMapNavigator } from './components/SystemMapNavigator';
import { ToolDrawer } from './components/ToolDrawer';
import { WorkspaceHeader, type WorkspaceView } from './components/WorkspaceHeader';
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
  const [openTool, setOpenTool] = useState<WorkspaceTool | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>('system-map');
  const [digitalPassOpen, setDigitalPassOpen] = useState(false);

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
        activeView={activeView}
        onLanguageChange={setDNSWorkspaceLanguage}
        onViewChange={(view) => {
          setSelectedTool(null);
          setActiveView(view);
        }}
      />

      <main data-dns-shell-main className="workspace-main">
        {digitalPassOpen ? <DigitalPassOperator language={language} onClose={() => setDigitalPassOpen(false)} /> : openTool ? <section className="workspace-tool-view" aria-label={openTool.label}>
          <div className="workspace-tool-toolbar">
            <button type="button" className="dns-button" data-variant="secondary" onClick={() => setOpenTool(null)}>{language === 'de' ? '← Zurück zum Workspace' : '← Torna al Workspace'}</button>
            <strong>{openTool.label}</strong>
            <a className="dns-button" data-variant="secondary" href={openTool.url || '#'} target="_blank" rel="noopener noreferrer">{language === 'de' ? 'Standalone (Fallback)' : 'Standalone (emergenza)'}</a>
          </div>
          <iframe className="workspace-tool-frame" title={openTool.label} src={openTool.url || 'about:blank'} referrerPolicy="strict-origin-when-cross-origin" />
          <p className="workspace-tool-note">{language === 'de' ? 'Wenn ein Tool Einbettung blockiert, bleibt der Standalone-Zugang verfügbar. Authentifizierung wird nicht umgangen.' : 'Se un tool blocca l’incorporamento, rimane disponibile l’accesso standalone. L’autenticazione non viene aggirata.'}</p>
        </section> : <>
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

        <div className="dns-card" style={{padding: '16px', marginBottom: '16px'}}>
          <strong>DNS Digital Pass · Pilot 2026/27</strong>
          <p>{language === 'de' ? 'Saisonkarten-Aktivierung (noch nicht live)' : 'Attivazione stagionali (non ancora operativa)'}</p>
          <button type="button" className="dns-button" data-variant="secondary" onClick={() => setDigitalPassOpen(true)}>{language === 'de' ? 'Oberfläche öffnen' : 'Apri interfaccia'}</button>
        </div>
        <div className="dns-card" style={{padding:16,marginBottom:16}}><a className="dns-button" href="/dns-workspace/pass.html">Digital Pass · Registrazione pubblica</a></div>
        <div className={["radial-shell", "dns-card", selectedTool ? "has-selection" : ""].filter(Boolean).join(" ")}>
          <div className="radial-shell-head">
            <div>
              <strong className="dns-section-title">
                {activeView === 'system-map' ? 'SYSTEM MAP' : 'ORBIT'}
              </strong>
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

          {activeView === 'system-map' ? (
            <SystemMapNavigator
              selectedTool={selectedTool}
              onSelectTool={setSelectedTool}
              onClearSelection={() => setSelectedTool(null)}
              onOpenTool={setOpenTool}
            />
          ) : (
            <RadialNavigator
              selectedTool={selectedTool}
              onSelectTool={setSelectedTool}
              onClearSelection={() => setSelectedTool(null)}
              onOpenTool={setOpenTool}
            />
          )}

          <ToolDrawer
            tool={selectedTool}
            language={language}
            onClose={() => setSelectedTool(null)}
            onOpenTool={setOpenTool}
          />
        </div>
        </>}
      </main>
      <footer data-dns-tool-footer><div className="dns-tool-footer-shell"><span className="dns-tool-footer-primary">Dolomiti NordicSki</span><span className="dns-tool-footer-meta">DNS Workspace · Digital Platform</span></div></footer>
    </div>
  );
}
