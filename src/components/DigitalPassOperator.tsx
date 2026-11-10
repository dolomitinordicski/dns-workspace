import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { DNSWorkspaceLanguage } from '../services/foundation';
import './DigitalPassOperator.css';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { identityAuth } from '../services/identityFirebase';
import { operatorSignIn, operatorPassRequest, operatorApiConfigured } from '../services/digitalPassOperatorApi';

type Prepared = { physicalPassId: string; preparationId: string; code: string; expiresAt: number };
type Props = { language: DNSWorkspaceLanguage; onClose?: () => void; inline?: boolean };
const t = {
  de: { title: 'Saisonkartenverkauf bestätigen', intro: 'Kartennummer eingeben, Bestätigungscode erstellen und den Verkauf bestätigen.',
    number: 'Saisonkartennummer', prepare: 'Bestätigung vorbereiten', code: 'Code für den Gast', read: 'Diesen Code dem Gast mündlich mitteilen',
    validate: 'Verkauf bestätigen', success: 'Verkauf bestätigt', offline: 'Aktivierungsservice nicht verbunden',
    close: 'Zurück', busy: 'Verarbeitung…', error: 'Aktivierung fehlgeschlagen. Bitte später erneut versuchen.',
    unavailable: 'Nicht verfügbar: Die gesicherte Backend-Verbindung ist noch nicht eingerichtet.',
    note: 'Kein Verkauf und kein QR wird ohne autorisierte Serverbestätigung aktiviert.',
  },
  it: { title: 'Conferma vendita stagionale DNS', intro: 'Inserisci il numero, genera il codice per il cliente e conferma la vendita.',
    number: 'Numero stagionale', prepare: 'Prepara conferma', code: 'Codice per il cliente', read: 'Comunica verbalmente questo codice al cliente',
    validate: 'Conferma vendita', success: 'Vendita confermata', offline: 'Servizio di attivazione non collegato',
    close: 'Indietro', busy: 'Elaborazione…', error: 'Attivazione non riuscita. Riprova più tardi.',
    unavailable: 'Non disponibile: il backend autenticato non è ancora configurato.',
    note: 'Nessuna vendita e nessun QR vengono attivati senza conferma autorizzata del server.',
  },
};


export function DigitalPassOperator({ language, onClose, inline = false }: Props) {
  const c = t[language];
  const [user, setUser] = useState(identityAuth.currentUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => onAuthStateChanged(identityAuth, value => { setUser(value); setPrepared(null); setStatus('idle'); }), []);
  async function login(event: FormEvent) { event.preventDefault(); setStatus('busy'); try { await operatorSignIn(email, password); setPassword(''); setStatus('idle'); } catch { setError(c.error); setStatus('error'); } }
  const [number, setNumber] = useState('');
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [status, setStatus] = useState<'idle'|'busy'|'confirmed'|'error'>('idle');
  const [error, setError] = useState('');
  const hasBackend = operatorApiConfigured && Boolean(user);
  async function prepare(event: FormEvent) {
    event.preventDefault();
    if (!hasBackend || !/^\d{1,12}$/.test(number.trim()) || status === 'busy') return;
    setStatus('busy'); setError(''); setPrepared(null);
    try {
      const result = await operatorPassRequest<Prepared>('/v1/pass-activations/prepare', { passNumber: number.trim() });
      if (!result.physicalPassId || !result.preparationId || !/^[A-HJ-NP-Z2-9]{6}$/.test(result.code) || result.expiresAt <= Date.now()) throw new Error('INVALID_RESPONSE');
      setPrepared(result); setStatus('idle');
    } catch {
      setError(c.unavailable); setStatus('error');
    }
  }
  async function validate() {
    if (!hasBackend || !prepared || status === 'busy') return;
    setStatus('busy'); setError('');
    try {
      const result = await operatorPassRequest<{ status: string }>('/v1/pass-activations/validate', { physicalPassId: prepared.physicalPassId, preparationId: prepared.preparationId });
      if (result.status !== 'SOLD_ATTESTED') throw new Error('INVALID_RESPONSE');
      setPrepared(null); setStatus('confirmed');
    } catch { setError(c.error); setStatus('error'); }
  }
  return <section className={inline ? "dns-pass-operator dns-pass-operator-inline" : "dns-pass-operator dns-card"} aria-label={c.title}>
    <div className="dns-pass-head">
      <div><span className="dns-kicker">DNS WORKSPACE / DIGITAL PASS</span><h2>{c.title}</h2><p>{c.intro}</p></div>
      {!inline && onClose && <button type="button" className="dns-button" data-variant="secondary" onClick={onClose}>{c.close}</button>}
    </div>
    {!user && <form onSubmit={login} className="dns-pass-form"><label>Email<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label><button type="submit" className="dns-button" disabled={status === 'busy'}>{language === 'it' ? 'Accedi' : 'Anmelden'}</button></form>}
    {user && <button className="dns-button" onClick={() => { void signOut(identityAuth); }}>{language === 'it' ? 'Esci' : 'Abmelden'}</button>}
    <form onSubmit={prepare} className="dns-pass-form">
      <label htmlFor="dns-pass-number">{c.number}</label>
      <input id="dns-pass-number" inputMode="numeric" autoComplete="off" value={number}
        onChange={e => { setNumber(e.target.value); setPrepared(null); setStatus('idle'); setError(''); }}
        placeholder="000123" maxLength={12} disabled={status === 'busy'} />
      <button className="dns-button" type="submit" disabled={!hasBackend || !/^\d{1,12}$/.test(number.trim()) || status === 'busy'}>{status==='busy'?c.busy:c.prepare}</button>
    </form>
    {prepared && <div className="dns-pass-secret"><small>{c.code}</small><strong>{prepared.code}</strong><p>{c.read}</p>
      <button type="button" className="dns-button" onClick={validate} disabled={!hasBackend || status==='busy'}>{c.validate}</button></div>}
    {status === 'confirmed' && <p role="status">{c.success}</p>}
    {error && <p role="alert">{error}</p>}
    {!hasBackend && <p role="status" className="dns-pass-warning">{c.offline}. {c.unavailable}</p>}
    <p className="dns-pass-note">{c.note}</p>
  </section>;
}
