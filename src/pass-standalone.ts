import {saveOfflinePass,readOfflinePass,clearOfflinePass} from './services/offlinePass';
import QRCode from 'qrcode';
import { digitalPassPrivacyUrl } from './services/digitalPassPrivacy';
import { parseOperatorHandoffQr } from './services/digitalPassHandoff';
import { storePassHandoff, readPassHandoff, clearPassHandoff } from './services/passHandoff';
import {passAuth, passApiConfigured, onAuthStateChanged, requestEmailLink, finishEmailLink, hasEmailLink, passRequest, signOut} from './services/digitalPassApi';

import { setupPassInstall } from './services/passInstall';
type Lang='it'|'de'|'en';
type Pass={holderName:string;printedNumber:string;seasonId:string;status:string;qrPayload:string;qrExpiresAt?:number;organizationName?:string};
// Activation requires a separately reviewed launch flag; API URL alone never enables issuance.
const privacyUrl = digitalPassPrivacyUrl(import.meta.env.VITE_DNS_DIGITAL_PASS_PRIVACY_URL);
const passActivationEnabled = passApiConfigured && Boolean(privacyUrl) && import.meta.env.VITE_DNS_PASS_ACTIVATION_ENABLED === 'true';
const $=(id:string)=>document.getElementById(id)!;
const translations={
 it:{heading:'Il tuo Digital Pass DNS',intro:'La registrazione digitale è facoltativa. La tessera fisica rimane valida.',email:'Email',send:'Invia link di accesso',confirm:'Conferma email',number:'Numero tessera',code:'Codice di attivazione',given:'Nome',family:'Cognome',privacy:'Ho letto l’informativa privacy',register:'Attiva Digital Pass',handoff:'Se hai aperto il link su un altro dispositivo, scansiona di nuovo il QR oppure inserisci numero tessera e codice.',logout:'Esci',unavailable:'L’attivazione del Digital Pass sarà disponibile prossimamente. La tessera fisica rimane valida.',home:'Dal menu del browser puoi aggiungere questa pagina alla schermata Home.',foot:'La registrazione non modifica la validità della tessera cartacea.',sent:'Controlla la tua email. Se apri il link su un altro dispositivo, usa la stessa email e scansiona di nuovo il QR o inserisci numero tessera e codice.',error:'Operazione non completata. Verifica dati e connessione.',offline:'COPIA OFFLINE · Stato non aggiornato',online:'QR TEMPORANEO · Verifica online',save:'Salva sul dispositivo per uso offline',saved:'Copia offline salvata su questo dispositivo.',authenticated:'Email verificata correttamente! Il tuo account è pronto. L’attivazione del Digital Pass sarà disponibile prossimamente.',scan:'Scansiona QR operatore',scanHint:'Inquadra il QR mostrato dall’operatore.',scanStop:'Chiudi fotocamera',scanReady:'QR acquisito. Verifica la tua email per confermare il possesso della tessera.',scanInvalid:'Questo non è un QR di attivazione DNS valido.',scanError:'Fotocamera non disponibile. Verifica i permessi oppure inserisci il codice manualmente.',scanBusy:'Attivazione fotocamera…'},
 de:{heading:'Dein DNS Digital Pass',intro:'Die digitale Registrierung ist freiwillig. Deine physische Karte bleibt gültig.',email:'E-Mail',send:'Anmeldelink senden',confirm:'E-Mail bestätigen',number:'Kartennummer',code:'Aktivierungscode',given:'Vorname',family:'Nachname',privacy:'Ich habe die Datenschutzhinweise gelesen',register:'Digital Pass aktivieren',handoff:'Falls du den E-Mail-Link auf einem anderen Gerät geöffnet hast, QR-Code erneut scannen oder Kartennummer und Code eingeben.',logout:'Abmelden',unavailable:'Die Aktivierung des Digital Pass wird demnächst verfügbar sein. Deine physische Karte bleibt gültig.',home:'Über das Browsermenü kannst du diese Seite zum Home-Bildschirm hinzufügen.',foot:'Die Registrierung ändert die Gültigkeit deiner physischen Karte nicht.',sent:'Prüfe deine E-Mail. Auf einem anderen Gerät dieselbe E-Mail-Adresse verwenden und QR-Code erneut scannen oder Kartennummer und Code eingeben.',error:'Vorgang fehlgeschlagen. Bitte Daten und Verbindung überprüfen.',offline:'OFFLINE-KOPIE · Status nicht aktualisiert',online:'TEMPORÄRER QR · Online-Prüfung',save:'Für Offline-Nutzung auf diesem Gerät speichern',saved:'Offline-Kopie auf diesem Gerät gespeichert.',authenticated:'E-Mail erfolgreich bestätigt! Dein Konto ist bereit. Die Aktivierung des Digital Pass wird demnächst verfügbar sein.',scan:'QR-Code des Mitarbeiters scannen',scanHint:'Richte die Kamera auf den QR-Code des Mitarbeiters.',scanStop:'Kamera schließen',scanReady:'QR-Code erfasst. Bestätige deine E-Mail, um den Kartenbesitz zu bestätigen.',scanInvalid:'Dies ist kein gültiger DNS-Aktivierungs-QR-Code.',scanError:'Kamera nicht verfügbar. Bitte Berechtigungen prüfen oder Code manuell eingeben.',scanBusy:'Kamera wird gestartet…'},
 en:{heading:'Your DNS Digital Pass',intro:'Digital registration is optional. Your physical pass remains valid.',email:'Email',send:'Send sign-in link',confirm:'Verify email',number:'Pass number',code:'Activation code',given:'First name',family:'Last name',privacy:'I have read the privacy notice',register:'Activate Digital Pass',handoff:'If you opened the email link on another device, scan the QR again or enter the pass number and code.',logout:'Sign out',unavailable:'Digital Pass activation will be available soon. Your physical pass remains valid.',home:'Use your browser menu to add this page to your Home Screen.',foot:'Registration does not affect your physical pass.',sent:'Check your email. On another device, use the same email, then scan the QR again or enter the pass number and code.',error:'Unable to complete. Check details and connection.',offline:'OFFLINE COPY · Status not updated',online:'TEMPORARY QR · Online verification',save:'Save on this device for offline use',saved:'Offline copy saved on this device.',authenticated:'Email successfully verified! Your account is ready. Digital Pass activation will be available soon.',scan:'Scan operator QR',scanHint:'Point your camera at the QR displayed by the operator.',scanStop:'Close camera',scanReady:'QR scanned. Verify your email to confirm possession of your physical pass.',scanInvalid:'This is not a valid DNS activation QR.',scanError:'Camera unavailable. Check permissions or enter the code manually.',scanBusy:'Starting camera…'}
};
let cardFlipped=false;
const flipLabels={
 it:{front:'Mostra retro',back:'Torna al fronte',hint:'Tocca la tessera per vedere il retro',holder:'Intestatario',organization:'Organizzazione di acquisto',number:'Numero tessera',notice:'Il controllo visivo non certifica la validità in tempo reale. Per verificare il QR serve una connessione.'},
 de:{front:'Rückseite anzeigen',back:'Vorderseite anzeigen',hint:'Tippe auf die Karte, um die Rückseite zu sehen',holder:'Karteninhaber',organization:'Ausstellende Organisation',number:'Kartennummer',notice:'Eine Sichtprüfung bestätigt nicht die aktuelle Gültigkeit. Für die QR-Prüfung ist eine Verbindung erforderlich.'},
 en:{front:'Show back',back:'Show front',hint:'Tap the pass to see the back',holder:'Pass holder',organization:'Issuing organization',number:'Pass number',notice:'Visual inspection does not confirm current validity. An internet connection is required for QR verification.'},
};
function showCardSide(back:boolean){
 cardFlipped=back;
 $('dns-pass-flip').classList.toggle('is-flipped',back);
 $('pass-back').setAttribute('aria-hidden',String(!back));
 ($('pass-front') as HTMLButtonElement).tabIndex=back?-1:0;
 ($('flip-pass') as HTMLButtonElement).setAttribute('aria-expanded',String(back));
 ($('flip-pass') as HTMLButtonElement).textContent=back?flipLabels[lang].back:flipLabels[lang].front;
}
$('pass-front').addEventListener('click',()=>showCardSide(true));
$('flip-pass').addEventListener('click',()=>showCardSide(!cardFlipped));

let currentPassId:string|null=null;
let lang:Lang='it',pass:Pass|null=null,loading=false,offline=false;
function keepHandoff(number:string,code:string) {
 storePassHandoff(number,code,sessionStorage);
 ($('number') as HTMLInputElement).value=number;
 ($('code') as HTMLInputElement).value=code;
}
function applyHandoff() {
 if(location.hash.startsWith('#activation?')){
  const handoff=parseOperatorHandoffQr(location.href,location.origin);
  if(handoff)keepHandoff(handoff.number,handoff.code);
  history.replaceState(null,'',location.pathname+location.search+'#activation');
 }
 const stored=readPassHandoff(sessionStorage);
 if(!stored)return;
 ($('number') as HTMLInputElement).value=stored.number;
 ($('code') as HTMLInputElement).value=stored.code;
}
type ScanControls={stop:()=>void|Promise<void>};
let scanControls:ScanControls|null=null,scanOpen=false,scanStarting=false,scanAccepted=false;
function stopScanner() {
 scanOpen=false;scanStarting=false;
 const controls=scanControls;scanControls=null;
 if(controls)void Promise.resolve(controls.stop()).catch(()=>{});
 $('scan-camera').classList.add('hide');
 ($('scan-camera') as HTMLElement).hidden=true;
 ($('scan-start') as HTMLButtonElement).disabled=false;
 const video=$('scan-video') as HTMLVideoElement;
 video.pause();
 video.srcObject=null;
}
async function startScanner() {
 if(!passActivationEnabled||scanOpen||scanStarting||pass)return;
 if(!navigator.mediaDevices?.getUserMedia||!window.isSecureContext){
  setText('scan-status',translations[lang].scanError);return;
 }
 scanOpen=true;scanStarting=true;scanAccepted=false;
 setText('scan-status',translations[lang].scanBusy);
 $('scan-camera').classList.remove('hide');
 ($('scan-camera') as HTMLElement).hidden=false;
 ($('scan-start') as HTMLButtonElement).disabled=true;
 try {
  const { BrowserQRCodeReader }=await import('@zxing/browser');
  if(!scanOpen)return;
  const reader=new BrowserQRCodeReader();
  const controls=await reader.decodeFromVideoDevice(undefined,$('scan-video') as HTMLVideoElement,(result,_err,activeControls)=>{
   if(!scanOpen||scanAccepted||!result)return;
   const handoff=parseOperatorHandoffQr(result.getText(),location.origin);
   if(!handoff){setText('scan-status',translations[lang].scanInvalid);return;}
   scanAccepted=true;
   void Promise.resolve(activeControls.stop()).catch(()=>{});
   keepHandoff(handoff.number,handoff.code);
   stopScanner();
   if(passAuth.currentUser?.emailVerified)void claimScannedPass();
   else setText('scan-status',translations[lang].scanReady);
  });
  if(!scanOpen||scanAccepted){void Promise.resolve(controls.stop()).catch(()=>{});return;}
  scanControls=controls;
  setText('scan-status','');
 }catch {
  stopScanner();
  setText('scan-status',translations[lang].scanError);
 }finally{scanStarting=false}
}
let claiming=false;
async function claimScannedPass() {
 if(claiming||!passActivationEnabled||!passAuth.currentUser?.emailVerified)return;
 const stored=readPassHandoff(sessionStorage);
 if(!stored)return;
 claiming=true;
 try {
  const response=await passRequest<{status:string}>('/v1/pass-activations/claim',{passNumber:stored.number,code:stored.code});
  if(response.status!=='POSSESSION_CONFIRMED')throw Error('CLAIM_NOT_CONFIRMED');
  clearPassHandoff(sessionStorage);
  setText('status',lang==='de'?'Kartenbesitz bestätigt. Du kannst deinen Digital Pass jetzt registrieren.':lang==='en'?'Card possession confirmed. You can now register your Digital Pass.':'Possesso della tessera confermato. Ora puoi registrare il Digital Pass.');
 }catch {setText('status',translations[lang].error)}
 finally {claiming=false}
}

const setText=(id:string,value:string)=>{$(id).textContent=value;};
const marketing={
 it:{hero:'Le tue piste. Il tuo pass. Sempre con te.',subtitle:'Porta lo stagionale sul telefono, in modo semplice e volontario.',action:'Attiva il Digital Pass ↓',one:'✓ Nessuna app da scaricare',two:'✓ Attivazione facoltativa',three:'✓ Tessera fisica sempre valida',step:'01 — ATTIVAZIONE',ticket:'IL TUO DIGITAL PASS'},
 de:{hero:'Deine Loipen. Dein Pass. Immer dabei.',subtitle:'Nimm deine Saisonkarte ganz einfach digital mit – freiwillig und unkompliziert.',action:'Digital Pass aktivieren ↓',one:'✓ Keine App erforderlich',two:'✓ Freiwillige Aktivierung',three:'✓ Physische Karte bleibt gültig',step:'01 — AKTIVIERUNG',ticket:'DEIN DIGITAL PASS'},
 en:{hero:'Your trails. Your pass. Always with you.',subtitle:'Carry your season pass on your phone. Simple, convenient and optional.',action:'Activate Digital Pass ↓',one:'✓ No app download',two:'✓ Optional activation',three:'✓ Physical pass stays valid',step:'01 — ACTIVATION',ticket:'YOUR DIGITAL PASS'}
};
function translate(){const t=translations[lang];const m=marketing[lang];document.documentElement.lang=lang;
 const card=flipLabels[lang];
 setText('flip-hint',card.hint);setText('pass-holder-label',card.holder);setText('pass-org-label',card.organization);setText('pass-number-label',card.number);setText('pass-check-notice',card.notice);
 showCardSide(cardFlipped);

 for(const [id,key] of Object.entries({'hero-title':'hero','hero-subtitle':'subtitle','hero-link':'action','benefit-one':'one','benefit-two':'two','benefit-three':'three','step-label':'step','ticket-label':'ticket'}))setText(id,m[key as keyof typeof m]);
 for(const [id,key] of Object.entries({'scan-start':'scan','scan-hint':'scanHint','scan-stop':'scanStop','heading':'heading','intro':'intro','email-label':'email','login-button':hasEmailLink()?'confirm':'send','number-label':'number','code-label':'code','given-label':'given','family-label':'family','privacy-label':'privacy','register-button':'register','logout':'logout','unavailable':'unavailable','foot':'foot','save-offline':'save','handoff-hint':'handoff'}))setText(id,t[key as keyof typeof t]);
}
const passInstall=setupPassInstall({button:$('install-pass') as HTMLButtonElement,hint:$('home-tip') as HTMLElement,getLang:()=>lang});
function render(){
 for(const id of ['privacy-label','privacy-notice']) {
  const link=$(id) as HTMLAnchorElement;
  if(privacyUrl)link.href=privacyUrl;else link.removeAttribute('href');
  link.hidden=!privacyUrl;
 }
 setText('privacy-notice',lang==='de'?'Datenschutzhinweise zum Digital Pass':lang==='en'?'Digital Pass privacy notice':'Informativa privacy del Digital Pass');
 const authorized=passAuth.currentUser?.emailVerified===true&&!hasEmailLink();
 const showScan=passActivationEnabled&&!pass;
 $('scan-entry').classList.toggle('hide',!showScan);
 ($('scan-entry') as HTMLElement).hidden=!showScan;
 if(!showScan&&scanOpen)stopScanner();
 $('unavailable').classList.toggle('hide',passActivationEnabled||authorized);
 $('login').classList.toggle('hide', authorized || !passActivationEnabled);
 ($('login') as HTMLFormElement).hidden = authorized || !passActivationEnabled;
 const progress=authorized&&!pass?'register':pass?'register':'email';
 for(const key of ['email','verify','register'])$('progress-'+key).classList.toggle('is-current',key===progress);
 const registrationVisible=passActivationEnabled&&authorized&&!pass;
 $('registration').classList.toggle('hide',!registrationVisible);
 $('handoff-hint').classList.toggle('hide',!registrationVisible||Boolean(readPassHandoff(sessionStorage)));
 ($('registration') as HTMLFormElement).hidden=!registrationVisible;
 $('ticket').classList.toggle('hide',!pass||(!authorized&&!offline));
 passInstall.refresh(Boolean(pass&&(authorized||offline)));
 $('ticket-status').textContent=offline?translations[lang].offline:translations[lang].online;
 $('save-offline').classList.add('hide');
 $('logout').classList.toggle('hide',!authorized);
 ($('login-button') as HTMLButtonElement).disabled=loading;
 ($('register-button') as HTMLButtonElement).disabled=loading||!passActivationEnabled;
 ($('logout') as HTMLButtonElement).disabled=loading;
}
async function loadPass(){if(!passApiConfigured||!passAuth.currentUser?.emailVerified)return;
 try{const ids=await passRequest<{registrationIds:string[]}>('/v1/me/digital-passes',{});
 if(ids.registrationIds.length){currentPassId=ids.registrationIds[0];pass=await passRequest<Pass>('/v1/me/digital-pass/presentation',{physicalPassId:currentPassId});offline=false;await showPass();}}
 catch {if(!navigator.onLine)await restoreOffline();else setText('status',translations[lang].error)}finally{render()}}
async function showPass(){
 const image=$('qr') as HTMLImageElement;
 image.removeAttribute('src');image.hidden=true;
 if(!pass)return;
 setText('holder',pass.holderName);setText('pass-number',pass.printedNumber+' · '+pass.seasonId);
 setText('pass-front-number',pass.printedNumber);setText('pass-organization',pass.organizationName||'—');
 if(offline||!navigator.onLine||pass.status!=='ACTIVE'||!/^dns-pass:v2:[A-Za-z0-9_-]{43}$/.test(pass.qrPayload)||!pass.qrExpiresAt||pass.qrExpiresAt<=Date.now()||!passApiConfigured)return;
 setText('holder',pass.holderName);setText('pass-number',pass.printedNumber+' · '+pass.seasonId);
 setText('pass-front-number',pass.printedNumber);setText('pass-organization',pass.organizationName||'—');
 const base=(import.meta.env.VITE_DNS_DIGITAL_PASS_API_BASE as string).replace(/\/$/,'');
 const shown=pass,owner=passAuth.currentUser?.uid;
 const encoded=await QRCode.toDataURL(base+'/p/'+shown.qrPayload.slice('dns-pass:v2:'.length),{width:320,margin:3});
 if(pass!==shown||!owner||passAuth.currentUser?.uid!==owner||!navigator.onLine||!shown.qrExpiresAt||shown.qrExpiresAt<=Date.now())return;
 image.src=encoded;image.hidden=false;
}
async function restoreOffline(){const saved=await readOfflinePass();if(saved){pass=saved;offline=true;await showPass();render()}}
$('scan-start').addEventListener('click',()=>void startScanner());
$('scan-stop').addEventListener('click',()=>{stopScanner();setText('scan-status','');});
window.addEventListener('pagehide',stopScanner);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&scanOpen)stopScanner()});
$('save-offline').addEventListener('click',async()=>{if(!pass||offline)return;try{await saveOfflinePass(pass);setText('status',translations[lang].saved)}catch{setText('status',translations[lang].error)}});
$('lang').addEventListener('change',()=>{lang=($('lang') as HTMLSelectElement).value as Lang;translate();render();if(passAuth.currentUser?.emailVerified&&!passActivationEnabled)setText('status',translations[lang].authenticated)});
$('login').addEventListener('submit',async(e)=>{e.preventDefault();if(!passActivationEnabled)return;loading=true;render();setText('status','');try{
 const email=($('email') as HTMLInputElement).value.trim();
 if(hasEmailLink()){await finishEmailLink(email);if(!passActivationEnabled)setText('status',translations[lang].authenticated);}else{await requestEmailLink(email);setText('status',translations[lang].sent);}
 }catch{setText('status',translations[lang].error)}finally{loading=false;render()}});
$('registration').addEventListener('submit',async(e)=>{e.preventDefault();loading=true;render();setText('status','');try{
 if(!passActivationEnabled)throw new Error('PASS_ACTIVATION_DISABLED');
 // The same verified claim path is used for manual fallback and QR handoff.
 // A claim must succeed before the customer can register the digital credential.
 const passNumber=($('number') as HTMLInputElement).value.trim();
 const activationCode=($('code') as HTMLInputElement).value.trim().toUpperCase();
 await passRequest<{status:string}>('/v1/pass-activations/claim',{passNumber,code:activationCode});
 const result=await passRequest<{registrationId:string}>('/v1/pass-registrations/complete',{
 passNumber:($('number') as HTMLInputElement).value.trim(),code:($('code') as HTMLInputElement).value.trim().toUpperCase(),
 givenName:($('given') as HTMLInputElement).value.trim(),familyName:($('family') as HTMLInputElement).value.trim(),language:lang});
 ($('code') as HTMLInputElement).value='';
 currentPassId=result.registrationId;pass=await passRequest<Pass>('/v1/me/digital-pass/presentation',{physicalPassId:currentPassId});await showPass();
 }catch{setText('status',translations[lang].error)}finally{loading=false;render()}});
$('logout').addEventListener('click',()=>{stopScanner();clearPassHandoff(sessionStorage);pass=null;currentPassId=null;offline=false;($('qr') as HTMLImageElement).removeAttribute('src');void clearOfflinePass();void signOut(passAuth)});
onAuthStateChanged(passAuth,(user)=>{pass=null;currentPassId=null;offline=false;($('qr') as HTMLImageElement).removeAttribute('src');applyHandoff();render();if(user?.emailVerified&&!passActivationEnabled)setText('status',translations[lang].authenticated);if(user?.emailVerified)void claimScannedPass();if(!navigator.onLine)void restoreOffline();else void loadPass()});
translate();applyHandoff();render();

if('serviceWorker' in navigator)window.addEventListener('load',()=>{void navigator.serviceWorker.register('/dns-workspace/digital-pass-sw.js',{scope:'/dns-workspace/',updateViaCache:'none'}).catch(()=>{})});


// Expired screenshots and offline copies never display a usable QR.
window.setInterval(()=>{if(pass?.qrExpiresAt&&pass.qrExpiresAt<=Date.now()||!navigator.onLine){const image=$('qr') as HTMLImageElement;image.removeAttribute('src');image.hidden=true;}},1000);
let refreshing=false;
window.setInterval(async()=>{
 if(refreshing||document.hidden||!navigator.onLine||!currentPassId||!passAuth.currentUser?.emailVerified)return;
 refreshing=true;
 try{pass=await passRequest<Pass>('/v1/me/digital-pass/presentation',{physicalPassId:currentPassId});offline=false;await showPass();render();}
 catch{const image=$('qr') as HTMLImageElement;image.removeAttribute('src');image.hidden=true;setText('status',translations[lang].error);}
 finally{refreshing=false;}
},45000);
