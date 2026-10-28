import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { onAuthStateChanged, passAuth, passRequest, passApiConfigured } from '../services/digitalPassApi';
import './DigitalPassOperator.css';
export function DigitalPassScanner({ onClose }: { onClose: () => void }) {
  const video=useRef<HTMLVideoElement>(null);const controls=useRef<IScannerControls|null>(null);const pending=useRef(false);const active=useRef(true);
  const [user,setUser]=useState(passAuth.currentUser);const [status,setStatus]=useState('');const [running,setRunning]=useState(false);
  useEffect(()=>onAuthStateChanged(passAuth,value=>{setUser(value);setStatus('');controls.current?.stop();setRunning(false);}),[]);
  useEffect(()=>{active.current=true;return()=>{active.current=false;controls.current?.stop();};},[]);
  async function scan() {
    if(!video.current||!user||running)return;setStatus('');setRunning(true);
    try {const reader=new BrowserQRCodeReader();const camera=await reader.decodeFromVideoDevice(undefined,video.current,(result,_error,scanner)=>{
      if(!result||pending.current||!active.current)return;pending.current=true;scanner.stop();setStatus('…');
      void passRequest<{status:string}>('/v1/pass-validations/check',{qrPayload:result.getText()}).then(value=>{if(active.current)setStatus(['VALID','EXPIRED','REVOKED','UNKNOWN','NEEDS_ONLINE'].includes(value.status)?value.status:'UNKNOWN');}).catch(()=>{if(active.current)setStatus(navigator.onLine?'Controllo non riuscito / Prüfung fehlgeschlagen':'NEEDS_ONLINE');}).finally(()=>{pending.current=false;if(active.current)setRunning(false);});
    });if(!active.current)camera.stop();else controls.current=camera;
    }catch{setStatus('Fotocamera non disponibile / Kamera nicht verfügbar');setRunning(false);}
  }
  return <section className="dns-pass-operator dns-card"><div className="dns-pass-head"><h1>DNS Digital Pass · Scanner</h1><button className="dns-button" onClick={onClose}>← Workspace</button></div>
    {!user && <p>Accedi dalla schermata Attivazione / Anmeldung über Aktivierung.</p>}
    <video ref={video} muted playsInline style={{width:'100%',maxWidth:480}} />
    <button className="dns-button" onClick={()=>void scan()} disabled={!user||!passApiConfigured||running}>Scansiona / Scannen</button>
    <p role="status" aria-live="polite">{status}</p><p>Offline: usa il cartaceo / Papierkarte verwenden.</p>
  </section>;
}
