import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import QRCode from 'qrcode';
import { onAuthStateChanged } from 'firebase/auth';
import type { DNSWorkspaceLanguage } from '../services/foundation';
import { identityAuth } from '../services/identityFirebase';
import { operatorPassRequest, operatorApiConfigured } from '../services/digitalPassOperatorApi';
import './DigitalPassOperator.css';

type Prepared = { physicalPassId: string; preparationId: string; code: string; expiresAt: number; handoffUrl?: string };
type SaleStatus = { status: 'PENDING' | 'PREPARED' | 'SOLD_ATTESTED' | 'EXPIRED' | 'CANCELLED' };
type Props = { language: DNSWorkspaceLanguage; inline?: boolean; onClose?: () => void };
const copy = {
  it: { title:'Conferma vendita stagionale', intro:'Inserisci il numero dello stagionale e mostra il QR al cliente.',
    number:'Numero stagionale', prepare:'Genera QR', code:'Codice alternativo', scan:'Il cliente scansiona il QR con il proprio telefono.',
    pending:'In attesa di conferma dal server', confirmed:'Vendita confermata', expired:'Sessione scaduta. Genera un nuovo QR.',
    missing:'Servizio non disponibile: backend non ancora configurato.', error:'Impossibile completare la richiesta.',
    close:'Indietro', invalid:'Numero non valido', pilot:'Fase pilota · nessuna conferma senza validazione server',
    reset:'Nuova vendita' },
  de: { title:'Saisonkartenverkauf bestätigen', intro:'Kartennummer eingeben und dem Gast den QR-Code zeigen.',
    number:'Saisonkartennummer', prepare:'QR-Code erzeugen', code:'Alternativer Code', scan:'Der Gast scannt den QR-Code mit seinem Smartphone.',
    pending:'Warten auf Serverbestätigung', confirmed:'Verkauf bestätigt', expired:'Sitzung abgelaufen. Neuen QR-Code erzeugen.',
    missing:'Dienst nicht verfügbar: Backend noch nicht eingerichtet.', error:'Vorgang konnte nicht abgeschlossen werden.',
    close:'Zurück', invalid:'Ungültige Nummer', pilot:'Pilotphase · keine Bestätigung ohne Servervalidierung',
    reset:'Nächster Verkauf' },
};

export function DigitalPassOperator({ language, inline = false, onClose }: Props) {
  const c=copy[language];
  const [user,setUser]=useState(identityAuth.currentUser);
  const [number,setNumber]=useState('');
  const [prepared,setPrepared]=useState<Prepared|null>(null);
  const [qr,setQr]=useState('');
  const [status,setStatus]=useState<'idle'|'busy'|'pending'|'confirmed'|'expired'|'error'>('idle');
  const [error,setError]=useState('');
  useEffect(()=>onAuthStateChanged(identityAuth,next=>{setUser(next);setPrepared(null);setQr('');setStatus('idle');}),[]);
  const enabled=operatorApiConfigured && Boolean(user);

  async function prepare(e:FormEvent) {
    e.preventDefault();
    if (!enabled || !/^\d{1,12}$/.test(number.trim()) || status==='busy') return;
    setStatus('busy');setError('');setPrepared(null);setQr('');
    try {
      const result=await operatorPassRequest<Prepared>('/v1/pass-activations/prepare',{passNumber:number.trim()});
      if(!result.physicalPassId||!result.preparationId||!/^[A-HJ-NP-Z2-9]{6}$/.test(result.code)||result.expiresAt<=Date.now())throw Error('BAD_PREPARATION');
      // This is a same-origin customer handoff. Hash parameters do not enter HTTP request logs.
      // The server remains the sole authority for sale attestation.
      const url=new URL('/dns-workspace/pass.html',window.location.origin);
      url.hash='activation?'+new URLSearchParams({number:number.trim(),code:result.code}).toString();
      const safeHandoff=result.handoffUrl?new URL(result.handoffUrl):url;
      if(safeHandoff.origin!==window.location.origin||safeHandoff.pathname!=='/dns-workspace/pass.html')throw Error('UNTRUSTED_HANDOFF');
      const encoded=await QRCode.toDataURL(safeHandoff.toString(),{width:296,margin:3,errorCorrectionLevel:'M'});
      setPrepared(result);setQr(encoded);setStatus('pending');
    }catch {setStatus('error');setError(c.error);}
  }
  useEffect(()=>{
    if(!prepared||status!=='pending'||!enabled)return;
    let cancelled=false; let active=false;
    const tick=async()=>{
      if(cancelled||active)return;
      if(Date.now()>=prepared.expiresAt){setStatus('expired');return;}
      active=true;
      try {
        // A backend-authenticated status check is required. Never infer a sale from QR rendering.
        const result=await operatorPassRequest<SaleStatus>('/v1/pass-activations/status',{
          physicalPassId:prepared.physicalPassId, preparationId:prepared.preparationId
        });
        if(cancelled)return;
        if(result.status==='SOLD_ATTESTED')setStatus('confirmed');
        else if(result.status==='EXPIRED'||result.status==='CANCELLED')setStatus('expired');
      }catch {if(!cancelled)setError(c.missing);}
      finally {active=false;}
    };
    void tick();
    const timer=window.setInterval(()=>void tick(),4000);
    return()=>{cancelled=true;window.clearInterval(timer);};
  },[prepared,status,enabled,c.missing]);
  function reset(){setNumber('');setPrepared(null);setQr('');setError('');setStatus('idle');}
  return <section className={inline?'dns-pass-operator dns-pass-operator-inline':'dns-pass-operator dns-card'} aria-label={c.title}>
    <div className="dns-pass-head">
      <div><h2>{c.title}</h2><p>{c.intro}</p></div>
      {!inline&&onClose&&<button type="button" className="dns-button" data-variant="secondary" onClick={onClose}>{c.close}</button>}
    </div>
    <form className="dns-pass-form" onSubmit={prepare}>
      <label htmlFor="dns-pass-number">{c.number}</label>
      <div className="dns-pass-entry">
        <input id="dns-pass-number" inputMode="numeric" autoComplete="off" placeholder="000123"
          value={number} maxLength={12} disabled={status==='busy'||status==='pending'}
          onChange={e=>{setNumber(e.target.value);setPrepared(null);setQr('');setStatus('idle');setError('');}} />
        <button type="submit" className="dns-button" disabled={!enabled||!/^[0-9]{1,12}$/.test(number.trim())||status==='busy'||status==='pending'}>{c.prepare}</button>
      </div>
    </form>
    {prepared&&qr&&<div className="dns-pass-handoff">
      <img src={qr} width="296" height="296" alt={language==='de'?'QR-Code für den Gast':'QR da mostrare al cliente'} />
      <div className="dns-pass-handoff-details">
        <p>{c.scan}</p>
        <small>{c.code}</small><strong className="dns-pass-code">{prepared.code}</strong>
        {status==='confirmed'?<p className="dns-pass-confirmed" role="status">✓ {c.confirmed}</p>:
          <p role="status">{status==='expired'?c.expired:c.pending}</p>}
        {status!=='pending'&&<button type="button" className="dns-button" data-variant="secondary" onClick={reset}>{c.reset}</button>}
      </div>
    </div>}
    {!enabled&&<p className="dns-pass-warning" role="status">{c.missing}</p>}
    {error&&<p className="dns-pass-warning" role="alert">{error}</p>}
    <p className="dns-pass-note">{c.pilot}</p>
  </section>;
}
