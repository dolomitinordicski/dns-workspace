import { useState, type FormEvent } from 'react';
import { signInDNSEmail, signInDNSGoogle, signOutDNS, type DNSIdentity } from '../services/dnsIdentity';
import { organizationName, type DNSWorkspaceOrganization } from '../services/dnsOrganizations';
import { canUseOrganization } from '../workspace/access';
import type { DNSWorkspaceLanguage } from '../services/foundation';

type Props = { language: DNSWorkspaceLanguage; identity: DNSIdentity;
  organizations: DNSWorkspaceOrganization[]; organizationStatus: 'loading' | 'ready' | 'error';
  selectedOrganizationId: string; onOrganizationChange: (id: string) => void };
const copy = {
  de: { title: 'DNS Workspace', subtitle: 'Zugang zur digitalen Plattform',
    org: 'Tourismusverein / Organisation', choose: 'Organisation auswählen',
    email: 'E-Mail', password: 'Passwort', login: 'Anmelden', logout: 'Abmelden',
    google: 'Alternativ: verknüpftes Google-Konto verwenden',
    loading: 'Organisationen werden aus DNS Core geladen…',
    failed: 'DNS Core-Organisationen nicht verfügbar. Bitte erneut laden.',
    checking: 'DNS-Berechtigungen werden geprüft…',
    missing: 'Dieses Konto ist in DNS Core nicht freigeschaltet.',
    inactive: 'Dieses DNS-Konto ist deaktiviert.',
    noAccess: 'Für diese Organisation besteht keine aktive Mitgliedschaft oder Berechtigung.',
    hint: 'Die Organisation legt den Arbeitskontext fest. Die Anmeldung bleibt personenbezogen.',
  },
  it: { title: 'DNS Workspace', subtitle: 'Accesso alla piattaforma digitale',
    org: 'Associazione turistica / Organizzazione', choose: 'Seleziona organizzazione',
    email: 'Email', password: 'Password', login: 'Accedi', logout: 'Esci',
    google: 'Alternativa: usa un account Google collegato',
    loading: 'Caricamento organizzazioni da DNS Core…',
    failed: 'Elenco organizzazioni DNS Core non disponibile. Ricarica la pagina.',
    checking: 'Verifica autorizzazioni DNS…',
    missing: 'Questo account non è ancora abilitato in DNS Core.',
    inactive: 'Questo account DNS è stato disattivato.',
    noAccess: 'Nessuna appartenenza o autorizzazione attiva per questa organizzazione.',
    hint: 'L’organizzazione definisce il contesto di lavoro. L’accesso resta personale.',
  },
} as const;

export function WorkspaceAccount(props: Props) {
  const { language, identity, organizations, organizationStatus,
    selectedOrganizationId, onOrganizationChange } = props;
  const c = copy[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectedOrg = organizations.find(o => o.id === selectedOrganizationId);
  const denied = identity.state === 'active' && selectedOrg && !canUseOrganization(identity, selectedOrg);

  async function login(action: () => Promise<unknown>) {
    if (!selectedOrg) return;
    setError(''); setBusy(true);
    try { await action(); setPassword(''); }
    catch (cause) {
      const code = (cause as { code?: string })?.code;
      setError(code === 'auth/unauthorized-domain'
        ? 'DNS Core: dominio non autorizzato in Firebase Authentication.'
        : code === 'auth/operation-not-allowed'
          ? 'DNS Core: questo metodo di accesso non è abilitato.'
          : cause instanceof Error ? cause.message : 'Accesso non riuscito.');
    } finally { setBusy(false); }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void login(() => signInDNSEmail(email, password));
  };

  return (
    <section className="dns-card mx-auto w-full max-w-xl p-6 my-8 space-y-5" aria-label={c.title}>
      <div>
        <div className="dns-kicker">Dolomiti NordicSki</div>
        <h1 className="text-2xl font-semibold">{c.title}</h1>
        <p className="text-sm text-dns-muted">{c.subtitle}</p>
      </div>
      <label className="block space-y-2">
        <span className="font-semibold text-sm">{c.org}</span>
        <select className="dns-input w-full" required value={selectedOrganizationId}
          disabled={organizationStatus !== 'ready'}
          onChange={e => onOrganizationChange(e.target.value)}>
          <option value="">{c.choose}</option>
          {organizations.map(org => <option key={org.id} value={org.id}>
            {organizationName(org, language)}
          </option>)}
        </select>
      </label>
      {organizationStatus !== 'ready' &&
        <p role="status" className="text-sm">{organizationStatus === 'loading' ? c.loading : c.failed}</p>}
      {identity.state === 'signed-out' && (
        <>
          <form className="space-y-4" onSubmit={submit}>
            <label className="block space-y-2"><span className="text-sm">{c.email}</span>
              <input className="dns-input w-full" type="email" autoComplete="username"
                required value={email} onChange={e => setEmail(e.target.value)} /></label>
            <label className="block space-y-2"><span className="text-sm">{c.password}</span>
              <input className="dns-input w-full" type="password" autoComplete="current-password"
                required value={password} onChange={e => setPassword(e.target.value)} /></label>
            <button className="dns-button w-full" data-variant="primary" type="submit"
              disabled={!selectedOrg || busy}>{c.login}</button>
          </form>
          <button className="dns-button w-full" data-variant="secondary" type="button"
            disabled={!selectedOrg || busy} onClick={() => void login(signInDNSGoogle)}>{c.google}</button>
        </>
      )}
      {identity.state === 'loading' && <p role="status">{c.checking}</p>}
      {identity.state === 'inactive' &&
        <p role="alert">{identity.email} · {identity.reason === 'inactive' ? c.inactive : c.missing}</p>}
      {identity.state === 'error' && <p role="alert">{identity.message}</p>}
      {denied && <p role="alert">{identity.email} · {c.noAccess}</p>}
      {identity.state !== 'signed-out' && identity.state !== 'loading' &&
        <button type="button" className="dns-button" data-variant="secondary"
          onClick={() => void signOutDNS()}>{c.logout}</button>}
      <p className="text-xs text-dns-muted">{c.hint}</p>
      {error && <p className="text-sm" role="alert">{error}</p>}
    </section>
  );
}
