import { useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { identityApp } from '../services/identityFirebase';
import { accessAction, accessError, type AccessRequest } from '../services/dnsAccessRequests';
import { organizationName, type DNSWorkspaceOrganization } from '../services/dnsOrganizations';

export function WorkspaceAccessApprovals({ language, organizations }: {
  language: 'it' | 'de'; organizations: DNSWorkspaceOrganization[];
}) {
  const de = language === 'de';
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async (cursor?: string) => {
    setBusy(true); setError('');
    try {
      const result = await accessAction<{ requests: AccessRequest[]; after: string | null }>({ action: 'list', ...(cursor ? { after: cursor } : {}) });
      setRequests(previous => cursor ? [...previous, ...result.requests] : result.requests); setAfter(result.after);
    } catch (e) { setError(accessError(e)); } finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const decide = async (r: AccessRequest, approve: boolean, organizationId: string, reportingAreaId: string, expectedTools?: Record<string, string>) => {
    setBusy(true); setError('');
    try {
      await accessAction({ action: approve ? 'approve' : 'reject', uid: r.uid, organizationId, reportingAreaId, ...(approve ? { expectedTools } : {}) });
      await load();
    } catch (e) { setError(accessError(e)); } finally { setBusy(false); }
  };
  const invitation = new URL(location.pathname, location.origin); invitation.searchParams.set('access', 'request');
  return <div className="space-y-4">
    <label className="block">{de ? 'Allgemeiner Einladungslink' : 'Link generico di invito'}
      <input className="dns-input w-full" readOnly value={invitation.href} onFocus={e => e.target.select()} /></label>
    <p>{de ? 'Organisation und Tool-Rechte werden vorab im Tab Tool-Zugänge eingerichtet. Prüfen Sie die Identität vor der Freigabe.'
      : 'Organizzazione e permessi si preparano nella sezione Accessi ai tool. Verifica chi richiede l’accesso prima di approvare.'}</p>
    <button className="dns-button" data-variant="secondary" disabled={busy} onClick={() => void load()}>{de ? 'Aktualisieren' : 'Aggiorna richieste'}</button>
    {requests.map(r => <RequestRow key={r.uid} request={r} language={language} organizations={organizations} busy={busy} decide={decide} />)}
    {!requests.length && !busy && !error && <p>{de ? 'Keine Anfragen.' : 'Nessuna richiesta.'}</p>}
    {after && <button className="dns-button" data-variant="secondary" disabled={busy} onClick={() => void load(after)}>{de ? 'Weitere laden' : 'Carica altre'}</button>}
    {busy && <p role="status">{de ? 'Laden…' : 'Caricamento…'}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
function RequestRow({ request: r, language, organizations, busy, decide }: {
  request: AccessRequest; language: 'it' | 'de'; organizations: DNSWorkspaceOrganization[]; busy: boolean;
  decide: (r: AccessRequest, approve: boolean, org: string, area: string, expectedTools?: Record<string, string>) => Promise<void>;
}) {
  const de = language === 'de';
  const [org, setOrg] = useState(r.organizationId);
  const selected = organizations.find(o => o.id === org);
  const [area, setArea] = useState(r.reportingAreaId || selected?.reportingAreaIds[0] || '');
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [previewError, setPreviewError] = useState('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const prepare = async () => {
    setPreviewBusy(true); setPreviewError('');
    try {
      const policy = await getDoc(doc(getFirestore(identityApp), 'organizationToolAccess', org));
      if (!policy.exists()) throw new Error(de ? 'Zuerst Tool-Rechte speichern.' : 'Salva prima i permessi dell’organizzazione.');
      setPreview(policy.data().tools); setConfirming(true);
    } catch (e) { setPreviewError(accessError(e)); } finally { setPreviewBusy(false); }
  };
  return <article className="border-b py-4 space-y-2">
    <h3 className="font-semibold">{r.email}</h3>
    <p>{r.status === 'pending' ? (de ? 'Wartend' : 'In attesa') : r.status === 'approved' ? (de ? 'Freigegeben' : 'Approvata') : (de ? 'Abgelehnt' : 'Rifiutata')}</p>
    {r.status === 'pending' ? <>
      <label className="block">{de ? 'Organisation' : 'Organizzazione'}
        <select className="dns-input w-full" disabled={busy || confirming} value={org} onChange={e => {
          setOrg(e.target.value); setArea(organizations.find(o => o.id === e.target.value)?.reportingAreaIds[0] || '');
        }}>{organizations.filter(o => o.organizationType === 'tourism-organisation').map(o => <option key={o.id} value={o.id}>{organizationName(o, language)}</option>)}</select>
      </label>
      <label className="block">{de ? 'Gebiet' : 'Area'}<select className="dns-input w-full" value={area} disabled={busy || confirming} onChange={e => setArea(e.target.value)}>
        <option value="">—</option>{selected?.reportingAreaIds.map(a => <option key={a} value={a}>{a}</option>)}
      </select></label>
      {!confirming ? <button className="dns-button" data-variant="primary" disabled={busy || previewBusy || !area} onClick={() => void prepare()}>{de ? 'Freigabe prüfen' : 'Verifica approvazione'}</button>
        : <div className="space-y-2"><p>{de ? 'Dieses Google-Konto mit den gespeicherten Organisationsrechten freigeben?' : 'Autorizzare questo account Google con i permessi salvati dell’organizzazione?'}</p>
          <ul>{Object.entries(preview).map(([tool, level]) => <li key={tool}>{tool}: {level === 'write' ? 'W' : level === 'read' ? 'R' : '–'}</li>)}</ul>
          <button className="dns-button" data-variant="primary" disabled={busy} onClick={() => void decide(r, true, org, area, preview)}>{de ? 'Freigabe bestätigen' : 'Conferma approvazione'}</button>
          <button className="dns-button" data-variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>{de ? 'Abbrechen' : 'Annulla'}</button>
        </div>}
      <button className="dns-button workspace-reject-action" data-variant="secondary" disabled={busy} onClick={() => void decide(r, false, org, area)}>{de ? 'Ablehnen' : 'Rifiuta'}</button>
      {previewError && <p role="alert">{previewError}</p>}
    </> : <p>{organizations.find(o => o.id === r.organizationId)?.canonicalName || r.organizationId} · {r.reportingAreaId}</p>}
  </article>;
}
