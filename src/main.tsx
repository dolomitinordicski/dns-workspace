import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DNS_DESIGN_SYSTEM } from '@dolomitinordicski/dns-shared-data/design-system';
import App from './App';
import './styles.css';

const root = document.documentElement;
root.style.setProperty('--dns-deep', DNS_DESIGN_SYSTEM.colors.deep);
root.style.setProperty('--dns-mid', DNS_DESIGN_SYSTEM.colors.mid);
root.style.setProperty('--dns-light', DNS_DESIGN_SYSTEM.colors.light);
root.style.setProperty('--dns-bg', DNS_DESIGN_SYSTEM.colors.background);
root.style.setProperty('--dns-positive', DNS_DESIGN_SYSTEM.colors.positive);
root.style.setProperty('--dns-negative', DNS_DESIGN_SYSTEM.colors.negative);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
