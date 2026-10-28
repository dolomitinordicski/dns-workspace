import { useState, type FormEvent } from 'react';
import { signInDNSEmail, signInDNSGoogle, signOutDNS, type DNSIdentity } from '../services/dnsIdentity';
import type { DNSWorkspaceLanguage } from '../services/foundation';

type Props = { language: DNSWorkspaceLanguage; identity: DNSIdentity };
const translations = {
  it: {
    title: 'Accesso unico DNS', google: 'Accedi con Google', alternative: 'Oppure con account DNS',
    email: 'Email', password: 'Password', enter: 'Accedi', exit: 'Esci',
    waiting: 'Verifica identità DNS…', unavailable: 'Non riesco a leggere i permessi di DNS Core.',
    missing: 'L’account è autenticato ma non ancora abilitato in DNS Core.',
    inactive: 'Profilo DNS Core disattivato. Contatta un amministratore.',
    admin: 'Amministratore DNS', partner: 'Utente DNS',
    access: 'Organizzazioni e permessi letti da DNS Core',
    notice: 'La sessione è condivisa con le applicazioni che usano DNS Core. Polls richiede ancora un collegamento sicuro separato.',
  },
  de: {
    title: 'Einheitlicher DNS-Zugang', google: 'Mit Google anmelden', alternative: 'Oder mit DNS-Konto',
    email: 'E-Mail', password: 'Passwort', enter: 'Anmelden', exit: 'Abmelden',
    waiting: 'DNS-Identität wird geprüft…', unavailable: 'DNS Core-Berechtigungen nicht verfügbar.',
    missing: 'Authentifiziert, aber noch nicht in DNS Core freigeschaltet.',
    inactive: 'DNS Core-Profil deaktiviert. Bitte Administrator kontaktieren.',
    admin: 'DNS-Administrator', partner: 'DNS-Benutzer',
    access: 'Organisationen und Berechtigungen aus DNS Core',
    notice: 'Diese Sitzung wird mit DNS Core-Anwendungen geteilt. Polls benötigt noch eine sichere Serververbindung.',
  },
} as const;

export function WorkspaceAccount({ language, identity }: Props) {
  const c = translations[language];
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function runLogin(action: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await action(); setPassword(''); }
    catch (cause) {
      const code = (cause as { code?: string })?.code;
      setError(code === 'auth/operation-not-allowed'
        ? 'Firebase DNS Core: provider di accesso non abilitato.'
        : code === 'auth/unauthorized-domain'
          ? 'Firebase DNS Core: dominio Workspace non autorizzato.'
          : cause instanceof Error ? cause.message : c.unavailable);
    } finally { setBusy(false); }
  }
  function emailLogin(event: FormEvent) {
    event.preventDefault();
    void runLogin(() => signInDNSEmail(email, password));
  }

  return (
    <section className="dns-card p-4 mb-4" aria-label={c.title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <strong className="dns-section-title">{c.title}</strong>
          {identity.state === 'active' ? (
            <div className="dns-account-context !text-[var(--color-dns-deep)] mt-2">
              <span className="dns-account-avatar !text-[var(--color-dns-deep)]">{identity.email.slice(0, 1).toUpperCase()}</span>
              <span className="dns-account-meta">
                <span className="dns-account-name !text-[var(--color-dns-deep)]">{identity.email}</span>
                <span className="text-xs">{identity.profile.globalRoles.includes('dns-admin') ? c.admin : c.partner}</span>
              </span>
            </div>
          ) : identity.state === 'loading' ? <p>{c.waiting}</p>
            : identity.state === 'inactive' ? <p>{identity.email} · {identity.reason === 'inactive' ? c.inactive : c.missing}</p>
              : identity.state === 'error' ? <p role="alert">{c.unavailable}</p>
                : <p>{c.notice}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {identity.state === 'active' || identity.state === 'inactive' || identity.state === 'error' ? (
            <button type="button" className="dns-button" data-variant="secondary"
              onClick={() => void signOutDNS()}>{c.exit}</button>
          ) : identity.state === 'signed-out' ? (
            <>
              <button disabled={busy} type="button" className="dns-button" data-variant="primary"
                onClick={() => void runLogin(signInDNSGoogle)}>{c.google}</button>
              <button type="button" className="dns-button" data-variant="secondary"
                onClick={() => setShowEmail(value => !value)}>{c.alternative}</button>
            </>
          ) : null}
        </div>
      </div>
      {identity.state === 'active' &&
        <p className="text-xs mt-2">{c.access}: {identity.memberships.length} / {identity.grants.length}.</p>}
      {showEmail && identity.state === 'signed-out' && (
        <form className="flex flex-wrap items-end gap-2 mt-3" onSubmit={emailLogin}>
          <label>{c.email}<input className="dns-input w-full" type="email" autoComplete="username"
            required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>{c.password}<input className="dns-input w-full" type="password" autoComplete="current-password"
            required value={password} onChange={e => setPassword(e.target.value)} /></label>
          <button className="dns-button" type="submit" disabled={busy}>{c.enter}</button>
        </form>
      )}
      {error && <p className="text-sm mt-2" role="alert">{error}</p>}
    </section>
  );
}
