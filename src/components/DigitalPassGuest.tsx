import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import QRCode from 'qrcode';
import { passAuth, onAuthStateChanged, requestEmailLink, finishEmailLink, hasEmailLink, passRequest, passApiConfigured, signOut } from '../services/digitalPassApi';
import './DigitalPassOperator.css';
type Pass = { holderName: string; printedNumber: string; productCode: string; seasonId: string; status: string; validFrom: number; validUntil: number; qrPayload: string };
const copy = {
  it: { title:'Il tuo Digital Pass DNS', email:'Email', send:'Invia link di accesso', verify:'Conferma email', sent:'Controlla la tua email. Se apri il link su un altro dispositivo, inserisci qui lo stesso indirizzo per confermare.', number:'Numero tessera', code:'Codice di attivazione', given:'Nome', family:'Cognome', register:'Registra tessera', error:'Operazione non completata. Verifica i dati, la connessione o richiedi un nuovo link.', notice:'Registrazione volontaria. Nessun consenso marketing è necessario. Il cartaceo resta valido.', privacy:'Ho letto l’informativa privacy', unavailable:'Servizio non ancora disponibile', crossDevice:'Hai aperto il link di accesso. Inserisci lo stesso indirizzo email a cui è stato inviato: funziona anche su un altro dispositivo.', exit:'Esci' },
  de: { title:'Dein DNS Digital Pass', email:'E-Mail', send:'Anmeldelink senden', verify:'E-Mail bestätigen', sent:'Bitte E-Mail prüfen. Öffnest du den Link auf einem anderen Gerät, gib hier dieselbe E-Mail-Adresse zur Bestätigung ein.', number:'Kartennummer', code:'Aktivierungscode', given:'Vorname', family:'Nachname', register:'Karte registrieren', error:'Vorgang fehlgeschlagen. Daten und Verbindung prüfen oder neuen Link anfordern.', notice:'Freiwillige Registrierung ohne Marketingeinwilligung. Die Papierkarte bleibt gültig.', privacy:'Ich habe die Datenschutzhinweise gelesen', unavailable:'Service noch nicht verfügbar', crossDevice:'Anmeldelink geöffnet. Gib die E-Mail-Adresse ein, an die der Link gesendet wurde. Das funktioniert auch auf einem anderen Gerät.', exit:'Abmelden' },
  en: { title:'Your DNS Digital Pass', email:'Email', send:'Send sign-in link', verify:'Verify email', sent:'Check your email. If you open the link on another device, enter the same email address here to confirm.', number:'Pass number', code:'Activation code', given:'Given name', family:'Family name', register:'Register pass', error:'Unable to complete. Check details and connection or request a new link.', notice:'Registration is voluntary. Marketing consent is optional. Your physical pass remains valid.', privacy:'I have read the privacy notice', unavailable:'Service not yet available', crossDevice:'Sign-in link opened. Enter the same email address that received it, including when using another device.', exit:'Sign out' },
};
export function DigitalPassGuest({ onClose }: { onClose: () => void }) {
  const [language,setLanguage]=useState<'it'|'de'|'en'>('it'); const c=copy[language];
  const [user,setUser]=useState(passAuth.currentUser); const [email,setEmail]=useState('');
  const [number,setNumber]=useState(''); const [code,setCode]=useState(''); const [givenName,setGivenName]=useState(''); const [familyName,setFamilyName]=useState('');
  const [accepted,setAccepted]=useState(false); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const [pass,setPass]=useState<Pass|null>(null); const [qr,setQr]=useState('');
  const privacyUrl=(import.meta.env.VITE_DNS_DIGITAL_PASS_PRIVACY_URL || 'https://www.dolomitinordicski.com/de/privacy') as string;
  const enabled=passApiConfigured && Boolean(privacyUrl);
  useEffect(()=>onAuthStateChanged(passAuth,value=>{setUser(value);setPass(null);setQr('');}),[]);
  useEffect(()=>{ let cancelled=false; if (!user?.emailVerified || !enabled) return;
    void passRequest<{ registrationIds: string[] }>('/v1/me/digital-passes',{}).then(async result=>{
      if (result.registrationIds.length) { const value=await passRequest<Pass>('/v1/me/digital-pass',{physicalPassId:result.registrationIds[0]}); if(!cancelled)setPass(value); }
    }).catch(()=>{if(!cancelled)setMessage(c.error);}); return ()=>{cancelled=true;};
  },[user,enabled,c.error]);
  useEffect(()=>{let cancelled=false;setQr('');if(pass?.status==='ACTIVE' && /^dns-pass:v1:[A-Za-z0-9_-]{43}$/.test(pass.qrPayload) && passApiConfigured)void QRCode.toDataURL(`${(import.meta.env.VITE_DNS_DIGITAL_PASS_API_BASE as string).replace(/\/$/,'')}/v/${pass.qrPayload.slice('dns-pass:v1:'.length)}`,{width:320,margin:3,errorCorrectionLevel:'M'}).then(value=>{if(!cancelled)setQr(value);});return()=>{cancelled=true;};},[pass]);
  async function emailAction(event:FormEvent) {event.preventDefault();setBusy(true);setMessage('');try {if(hasEmailLink()) await finishEmailLink(email); else {await requestEmailLink(email);setMessage(c.sent);}}catch{setMessage(c.error);}finally{setBusy(false);}}
  async function register(event:FormEvent) {event.preventDefault();if(!accepted)return;setBusy(true);setMessage('');try{
    const result=await passRequest<{registrationId:string}>('/v1/pass-registrations/complete',{passNumber:number.trim(),code:code.trim().toUpperCase(),givenName,familyName,language});
    setCode(''); const value=await passRequest<Pass>('/v1/me/digital-pass',{physicalPassId:result.registrationId});setPass(value);
  }catch{setMessage(c.error);}finally{setBusy(false);}}
  return <section className="dns-pass-operator dns-card"><div className="dns-pass-head"><h1>{c.title}</h1><button className="dns-button" onClick={onClose}>← Workspace</button></div>
    <label>Language <select value={language} onChange={e=>setLanguage(e.target.value as typeof language)}><option value="it">Italiano</option><option value="de">Deutsch</option><option value="en">English</option></select></label>
    <p>{c.notice}</p>{!enabled && <p role="status">{c.unavailable}</p>}
    {hasEmailLink() && <p role="status">{c.crossDevice}</p>}
    {(!user?.emailVerified || hasEmailLink()) && <form className="dns-pass-form" onSubmit={emailAction}><label>{c.email}<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label><button className="dns-button" disabled={!enabled||busy}>{hasEmailLink()?c.verify:c.send}</button></form>}
    {user?.emailVerified && !hasEmailLink() && <><button className="dns-button" onClick={()=>void signOut(passAuth)}>{c.exit}</button>{!pass && <form className="dns-pass-form" onSubmit={register}>
      <label>{c.number}<input required inputMode="numeric" pattern="[0-9]{1,12}" maxLength={12} value={number} onChange={e=>setNumber(e.target.value)} /></label>
      <label>{c.code}<input required autoComplete="off" minLength={6} maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} /></label>
      <label>{c.given}<input required autoComplete="given-name" maxLength={100} value={givenName} onChange={e=>setGivenName(e.target.value)} /></label>
      <label>{c.family}<input required autoComplete="family-name" maxLength={100} value={familyName} onChange={e=>setFamilyName(e.target.value)} /></label>
      {privacyUrl && <label><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)} /><a href={privacyUrl} target="_blank" rel="noopener noreferrer">{c.privacy}</a></label>}
      <button className="dns-button" disabled={!enabled||busy||!accepted}>{c.register}</button></form>}</>}
    {pass && <article aria-label="Digital Pass"><strong>Dolomiti NordicSki</strong><h2>{pass.holderName}</h2><p>{pass.printedNumber} · DNS Saisonkarte · {pass.seasonId}</p><p>{new Date(pass.validFrom).toLocaleDateString(language)} – {new Date(pass.validUntil - 1).toLocaleDateString(language)}</p><p>{pass.status}</p>{qr && <img width="320" height="320" style={{maxWidth:'100%',height:'auto'}} src={qr} alt="DNS Digital Pass QR" />}</article>}
    {message && <p role="status">{message}</p>}
  </section>;
}
