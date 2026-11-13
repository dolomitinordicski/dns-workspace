// Locally encrypted holder copy for visual/manual checking only.
// Do NOT persist QR payloads, activation codes, Firebase tokens, or verification claims.
// Stored status is a snapshot and NEVER guarantees current validity.
export type OfflinePass = {
 holderName:string; printedNumber:string; seasonId:string; status:'ACTIVE';
 organizationName?:string; productCode?:string; passDesign?:string; purchaseAreaId?:string; validUntil:number; savedAt:number;
};
type SaveCandidate = {
 holderName:string; printedNumber:string; seasonId:string; status:string;
 organizationName?:string; productCode?:string; passDesign?:string; purchaseAreaId?:string; validUntil?:number; qrPayload?:string;
};
const DB='dns-digital-pass-offline-v2';
const LEGACY_DB='dns-digital-pass-offline-v1';
const PURCHASE_AREA_IDS=new Set(['antholzertal','gsiesertal-welsberg-taisten','drei-zinnen','osttirol','val-comelico','cortina-d-ampezzo','ahrntal','seiser-alm-dolomites-val-gardena']);
const open=()=>new Promise<IDBDatabase>((resolve,reject)=>{
 const request=indexedDB.open(DB,1);
 request.onupgradeneeded=()=>{request.result.createObjectStore('data')};
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error);
});
const transact=async <T>(mode:IDBTransactionMode,action:(s:IDBObjectStore,resolve:(v:T)=>void,reject:(e:unknown)=>void)=>void):Promise<T>=>{
 const db=await open();
 try{return await new Promise<T>((resolve,reject)=>{
  const tx=db.transaction('data',mode);
  action(tx.objectStore('data'),resolve,reject);
  tx.onerror=()=>reject(tx.error);
 });} finally{db.close();}
};
const get=<T>(key:string)=>transact<T|undefined>('readonly',(s,ok,fail)=>{
 const r=s.get(key);r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);
});
const put=(key:string,value:unknown)=>transact<void>('readwrite',(s,ok,fail)=>{
 const r=s.put(value,key);r.onsuccess=()=>ok();r.onerror=()=>fail(r.error);
});
function isValidRecord(value:unknown):value is OfflinePass{
 if(!value||typeof value!=='object')return false;
 const v=value as Partial<OfflinePass>;
 return v.status==='ACTIVE' && typeof v.holderName==='string' && v.holderName.trim().length>0 &&
  typeof v.printedNumber==='string' && /^\d{6}$/.test(v.printedNumber) &&
  v.seasonId==='2026-27' && Number.isFinite(v.savedAt) && Number.isFinite(v.validUntil) &&
  (v.savedAt as number)<=Date.now() && (v.validUntil as number)>Date.now() &&
  (v.organizationName===undefined||typeof v.organizationName==='string') &&
  (v.productCode===undefined||typeof v.productCode==='string') &&
  (v.passDesign===undefined||typeof v.passDesign==='string') &&
  (v.purchaseAreaId===undefined||typeof v.purchaseAreaId==='string'&&PURCHASE_AREA_IDS.has(v.purchaseAreaId)) &&
  !('qrPayload' in v);
}
async function deleteDatabase(name:string){
 if(typeof indexedDB==='undefined')return;
 await new Promise<void>(resolve=>{
  const r=indexedDB.deleteDatabase(name);
  r.onsuccess=r.onerror=r.onblocked=()=>resolve();
 });
}
export async function saveOfflinePass(pass:SaveCandidate){
 // Credential state was obtained online, but the saved copy will not claim current validity.
 const savedAt=Date.now();
 const safe:OfflinePass={
  holderName:pass.holderName,printedNumber:pass.printedNumber,seasonId:pass.seasonId,
  status:'ACTIVE',validUntil:pass.validUntil as number,savedAt,
  ...(pass.organizationName?{organizationName:pass.organizationName}:{}),
  ...(pass.productCode?{productCode:pass.productCode}:{}),
  ...(pass.passDesign?{passDesign:pass.passDesign}:{}),
  ...(pass.purchaseAreaId&&PURCHASE_AREA_IDS.has(pass.purchaseAreaId)?{purchaseAreaId:pass.purchaseAreaId}:{})
 };
 if(pass.status!=='ACTIVE'||!isValidRecord(safe))throw Error('INVALID_PASS');
 let key=await get<CryptoKey>('key');
 if(!key){key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);await put('key',key)}
 const iv=crypto.getRandomValues(new Uint8Array(12));
 // Only the explicitly enumerated safe fields are encrypted; no QR token leaves memory for storage.
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(safe)));
 await put('pass',{iv,ciphertext});
 await deleteDatabase(LEGACY_DB);
}
export async function readOfflinePass():Promise<OfflinePass|null>{
 try{
  const key=await get<CryptoKey>('key');
  const data=await get<{iv:Uint8Array;ciphertext:ArrayBuffer}>('pass');
  if(!key||!data)return null;
  const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(data.iv)},key,data.ciphertext);
  const pass=JSON.parse(new TextDecoder().decode(raw)) as unknown;
  return isValidRecord(pass)?pass:null;
 }catch{return null}
}
export async function clearOfflinePass(){
 await Promise.all([deleteDatabase(DB),deleteDatabase(LEGACY_DB)]);
}
