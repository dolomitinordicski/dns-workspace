type Lang = 'it' | 'de' | 'en';
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const copy = {
  it: { install: 'Installa DNS Pass', ios: 'Su iPhone: apri in Safari, tocca Condividi e scegli “Aggiungi alla schermata Home”.', android: 'Dal menu del browser scegli “Installa app” o “Aggiungi alla schermata Home”.', generic: 'Dal menu del browser aggiungi questa pagina alla schermata Home.', installed: 'DNS Pass è già aperto come app.' },
  de: { install: 'DNS Pass installieren', ios: 'Auf dem iPhone: in Safari öffnen, auf Teilen tippen und „Zum Home-Bildschirm“ wählen.', android: 'Im Browsermenü „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.', generic: 'Diese Seite über das Browsermenü zum Startbildschirm hinzufügen.', installed: 'DNS Pass ist bereits als App geöffnet.' },
  en: { install: 'Install DNS Pass', ios: 'On iPhone: open in Safari, tap Share, then “Add to Home Screen”.', android: 'Choose “Install app” or “Add to Home screen” from the browser menu.', generic: 'Use the browser menu to add this page to your Home Screen.', installed: 'DNS Pass is already open as an app.' }
};
export function setupPassInstall({ button, hint, getLang }: { button: HTMLButtonElement; hint: HTMLElement; getLang: () => Lang }) {
  let deferred: InstallEvent | null = null;
  let installed = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(navigator.userAgent);
  let available = false;
  const refresh = (hasPass: boolean) => {
    available = hasPass;
    const t = copy[getLang()];
    button.textContent = t.install;
    const show = hasPass && !installed && Boolean(deferred);
    button.hidden = !show;
    button.classList.toggle('hide', !show);
    hint.textContent = installed ? t.installed : ios ? t.ios : android ? t.android : t.generic;
  };
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferred = event as InstallEvent;
    refresh(available);
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    refresh(available);
  });
  button.addEventListener('click', async () => {
    const candidate = deferred;
    if (!candidate || !available) return;
    deferred = null;
    refresh(available);
    try { await candidate.prompt(); await candidate.userChoice; } catch { /* Leave native browser menu available. */ }
  });
  return { refresh };
}
