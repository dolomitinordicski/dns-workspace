import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initDNSWorkspaceFoundation } from './services/foundation';
import './styles.css';

const foundation = initDNSWorkspaceFoundation();
document.documentElement.dataset.workspaceLanguage = foundation.getLanguage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
