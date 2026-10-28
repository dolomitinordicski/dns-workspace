import QRCode from 'qrcode';
import {passAuth, passApiConfigured, onAuthStateChanged, requestEmailLink, finishEmailLink, hasEmailLink, passRequest, signOut} from './services/digitalPassApi';

type Lang='it'|'de'|'en';
type Pass={holderName:string;printedNumber:string;seasonId:string;status:string;qrPayload:string};
const $=(id:string)=>document.getElementById(id)!;
const translations={
 it:{heading:'Il tuo Digital Pass DNS',intro:'La registrazione digitale è facoltativa. La tessera fisica rimane valida.',email:'Email',send:'Invia link di accesso',confirm:'Conferma email',number:'Numero tessera',code:'Codice di attivazione',given:'Nome',family:'Cognome',privacy:'Ho letto l’informativa privacy',register:'Attiva Digital Pass',logout:'Esci',unavailable:'Servizio non ancora disponibile.',home:'Dal menu del browser puoi aggiungere questa pagina alla schermata Home.',foot:'La registrazione non modifica la validità della tessera cartacea.',sent:'Controlla la tua email. Se hai aperto il link su un altro dispositivo, inserisci qui lo stesso indirizzo.',error:'Operazione non completata. Verifica dati e connessione.'},
 de:{heading:'Dein DNS Digital Pass',intro:'Die digitale Registrierung ist freiwillig. Deine physische Karte bleibt gültig.',email:'E-Mail',send:'Anmeldelink senden',confirm:'E-Mail bestätigen',number:'Kartennummer',code:'Aktivierungscode',given:'Vorname',family:'Nachname',privacy:'Ich habe die Datenschutzhinweise gelesen',register:'Digital Pass aktivieren',logout:'Abmelden',unavailable:'Service noch nicht verfügbar.',home:'Über das Browsermenü kannst du diese Seite zum Home-Bildschirm hinzufügen.',foot:'Die Registrierung ändert die Gültigkeit deiner physischen Karte nicht.',sent:'Prüfe deine E-Mail. Bei einem anderen Gerät bitte dieselbe Adresse hier eingeben.',error:'Vorgang fehlgeschlagen. Bitte Daten und Verbindung überprüfen.'},
 en:{heading:'Your DNS Digital Pass',intro:'Digital registration is optional. Your physical pass remains valid.',email:'Email',send:'Send sign-in link',confirm:'Verify email',number:'Pass number',code:'Activation code',given:'First name',family:'Last name',privacy:'I have read the privacy notice',register:'Activate Digital Pass',logout:'Sign out',unavailable:'Service not yet available.',home:'Use your browser menu to add this page to your Home Screen.',foot:'Registration does not affect your physical pass.',sent:'Check your email. If you opened the link on another device, enter the same email address here.',error:'Unable to complete. Check details and connection.'}
};
let lang:Lang='it',pass:Pass|null=null,loading=false;
const setText=(id:string,value:string)=>{$(id).textContent=value;};
const marketing={
 it:{hero:'Le tue piste. Il tuo pass. Sempre con te.',subtitle:'Porta lo stagionale sul telefono, in modo semplice e volontario.',action:'Attiva il Digital Pass ↓',one:'✓ Nessuna app da scaricare',two:'✓ Attivazione facoltativa',three:'✓ Tessera fisica sempre valida',step:'01 — ATTIVAZIONE',ticket:'IL TUO DIGITAL PASS'},
 de:{hero:'Deine Loipen. Dein Pass. Immer dabei.',subtitle:'Nimm deine Saisonkarte ganz einfach digital mit – freiwillig und unkompliziert.',action:'Digital Pass aktivieren ↓',one:'✓ Keine App erforderlich',two:'✓ Freiwillige Aktivierung',three:'✓ Physische Karte bleibt gültig',step:'01 — AKTIVIERUNG',ticket:'DEIN DIGITAL PASS'},
 en:{hero:'Your trails. Your pass. Always with you.',subtitle:'Carry your season pass on your phone. Simple, convenient and optional.',action:'Activate Digital Pass ↓',one:'✓ No app download',two:'✓ Optional activation',three:'✓ Physical pass stays valid',step:'01 — ACTIVATION',ticket:'YOUR DIGITAL PASS'}
};
function translate(){const t=translations[lang];const m=marketing[lang];document.documentElement.lang=lang;
 for(const [id,key] of Object.entries({'hero-title':'hero','hero-subtitle':'subtitle','hero-link':'action','benefit-one':'one','benefit-two':'two','benefit-three':'three','step-label':'step','ticket-label':'ticket'}))setText(id,m[key as keyof typeof m]);
 for(const [id,key] of Object.entries({'heading':'heading','intro':'intro','email-label':'email','login-button':hasEmailLink()?'confirm':'send','number-label':'number','code-label':'code','given-label':'given','family-label':'family','privacy-label':'privacy','register-button':'register','logout':'logout','unavailable':'unavailable','home-tip':'home','foot':'foot'}))setText(id,t[key as keyof typeof t]);
}
function render(){const authorized=passAuth.currentUser?.emailVerified===true&&!hasEmailLink();
 $('unavailable').classList.toggle('hide',passApiConfigured);
 $('login').classList.toggle('hide',authorized);
 $('registration').classList.toggle('hide',!authorized||!!pass);
 $('ticket').classList.toggle('hide',!authorized||!pass);
 $('logout').classList.toggle('hide',!authorized);
 for(const id of ['login-button','register-button','logout'])($(id) as HTMLButtonElement).disabled=loading||!passApiConfigured;
}
async function loadPass(){if(!passApiConfigured||!passAuth.currentUser?.emailVerified)return;
 try{const ids=await passRequest<{registrationIds:string[]}>('/v1/me/digital-passes',{});
 if(ids.registrationIds.length){pass=await passRequest<Pass>('/v1/me/digital-pass',{physicalPassId:ids.registrationIds[0]});await showPass();}}
 catch {setText('status',translations[lang].error)}finally{render()}}
async function showPass(){if(!pass||pass.status!=='ACTIVE'||!/^dns-pass:v1:[A-Za-z0-9_-]{43}$/.test(pass.qrPayload)||!passApiConfigured)return;
 setText('holder',pass.holderName);setText('pass-number',pass.printedNumber+' · '+pass.seasonId);
 const base=(import.meta.env.VITE_DNS_DIGITAL_PASS_API_BASE as string).replace(/\/$/,'');
 ($('qr') as HTMLImageElement).src=await QRCode.toDataURL(base+'/v/'+pass.qrPayload.slice('dns-pass:v1:'.length),{width:320,margin:3});
}
$('lang').addEventListener('change',()=>{lang=($('lang') as HTMLSelectElement).value as Lang;translate();render()});
$('login').addEventListener('submit',async(e)=>{e.preventDefault();loading=true;render();setText('status','');try{
 const email=($('email') as HTMLInputElement).value.trim();
 if(hasEmailLink())await finishEmailLink(email);else{await requestEmailLink(email);setText('status',translations[lang].sent);}
 }catch{setText('status',translations[lang].error)}finally{loading=false;render()}});
$('registration').addEventListener('submit',async(e)=>{e.preventDefault();loading=true;render();setText('status','');try{
 const result=await passRequest<{registrationId:string}>('/v1/pass-registrations/complete',{
 passNumber:($('number') as HTMLInputElement).value.trim(),code:($('code') as HTMLInputElement).value.trim().toUpperCase(),
 givenName:($('given') as HTMLInputElement).value.trim(),familyName:($('family') as HTMLInputElement).value.trim(),language:lang});
 ($('code') as HTMLInputElement).value='';
 pass=await passRequest<Pass>('/v1/me/digital-pass',{physicalPassId:result.registrationId});await showPass();
 }catch{setText('status',translations[lang].error)}finally{loading=false;render()}});
$('logout').addEventListener('click',()=>{pass=null;void signOut(passAuth)});
onAuthStateChanged(passAuth,()=>{pass=null;render();void loadPass()});
translate();render();
