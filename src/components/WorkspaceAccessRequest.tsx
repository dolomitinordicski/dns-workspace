import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { passAuth } from '../services/digitalPassApi';
import { signInDNSGoogle, signOutDNS } from '../services/dnsIdentity';
import { accessError, accessStatus, requestAccess, type AccessRequest } from '../services/dnsAccessRequests';
import { organizationName, type DNSWorkspaceOrganization } from '../services/dnsOrganizations';

export function WorkspaceAccessRequest({ language, organizations }: {
  language: 'it' | 'de'; organizations: DNSWorkspaceOrganization[];
}) {
  const de = language === 'de';
  const [user, setUser] = useState(passAuth.currentUser);
  const [org, setOrg] = useState('');
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let generation = 0;
    const unsubscribe = onAuthStateChanged(passAuth, async next => {
      const revision = ++generation;
      setUser(next); setRequest(null); setError(''); setBusy(Boolean(next));
      if (!next) return;
      try { const result = await accessStatus(); if (revision === generation) setRequest(result); }
      catch (e) { if (revision === generation) setError(accessError(e)); }
      finally { if (revision === generation) setBusy(false); }
    });
    return () => { generation++; unsubscribe(); };
  }, []);
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(accessError(e)); } finally { setBusy(false); }
  };
  return <section className="dns-card mx-auto max-w-xl my-8 p-6 space-y-4" aria-label={de ? 'Zugang beantragen' : 'Richiedi accesso'}>
    <h1 className="text-2xl font-semibold">{de ? 'DNS-Zugang beantragen' : 'Richiedi accesso a DNS'}</h1>
    <p>{de ? 'Melden Sie sich mit Google an. DNS Admin prüft Ihre Organisation. Bis zur Freigabe sind keine Betriebsdaten zugänglich.'
      : 'Accedi con Google e indica la tua organizzazione. DNS Admin verificherà la richiesta: fino all’approvazione non avrai accesso ai dati operativi.'}</p>
    {!user ? <button className="dns-button" disabled={busy} onClick={() => void act(signInDNSGoogle)}>
      {de ? 'Mit Google anmelden' : 'Accedi con Google'}</button> : <>
      <p>{user.email}</p>
      {request ? <div role="status">
        <p>{request.status === 'pending' ? (de ? 'Anfrage wartet auf Freigabe.' : 'Richiesta in attesa di approvazione.')
          : request.status === 'approved' ? (de ? 'Freigegeben. Melden Sie sich im Workspace erneut an.' : 'Richiesta approvata. Accedi nuovamente al Workspace.')
          : (de ? 'Anfrage abgelehnt. Wenden Sie sich an DNS Admin.' : 'Richiesta rifiutata. Contatta DNS Admin.')}</p>
        <p>{organizations.find(o => o.id === request.organizationId)?.canonicalName || request.organizationId}</p>
        {request.status === 'pending' && <button className="dns-button" disabled={busy} onClick={() => void act(async () => setRequest(await accessStatus()))}>
          {de ? 'Status aktualisieren' : 'Aggiorna stato'}</button>}
      </div> : <form className="space-y-3" onSubmit={e => { e.preventDefault(); void act(async () => setRequest(await requestAccess(org, language))); }}>
        <label className="block">{de ? 'Organisation' : 'Organizzazione'}
          <select className="dns-input w-full" required disabled={busy} value={org} onChange={e => setOrg(e.target.value)}>
            <option value="">{de ? 'Organisation auswählen' : 'Seleziona organizzazione'}</option>
            {organizations.filter(o => o.organizationType === 'tourism-organisation').map(o =>
              <option key={o.id} value={o.id}>{organizationName(o, language)}</option>)}
          </select>
        </label>
        <p className="text-sm">{de ? 'Ein freigegebenes Konto pro Organisation. Weitere Konten benötigen eine gesonderte Prüfung.'
          : 'Un account autorizzato per organizzazione. Altri account richiedono una verifica separata.'}</p>
        <button className="dns-button" disabled={busy || !org}>{de ? 'Anfrage senden' : 'Invia richiesta'}</button>
      </form>}
      <button className="dns-button" disabled={busy} onClick={() => void act(signOutDNS)}>{de ? 'Abmelden' : 'Esci'}</button>
    </>}
    {busy && <p role="status">{de ? 'Bitte warten…' : 'Attendere…'}</p>}
    {error && <p role="alert">{error}</p>}
    <a className="dns-button" href={location.pathname}>{de ? 'Zum Workspace' : 'Vai al Workspace'}</a>
  </section>;
}
