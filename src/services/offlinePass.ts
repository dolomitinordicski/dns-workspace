// On-device offline copy for the optional seasonal pass. The non-exportable key stays in IndexedDB.
// This protects casual inspection of stored data, NOT a compromised or unlocked device.
type StoredPass={holderName:string;printedNumber:string;seasonId:string;status:string;qrPayload:string};
const DB='dns-digital-pass-offline-v1';
const open=()=>new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const db=r.result;db.createObjectStore('data')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const transact=async <T>(mode:IDBTransactionMode,action:(s:IDBObjectStore,resolve:(v:T)=>void,reject:(e:unknown)=>void)=>void):Promise<T>=>{const db=await open();try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction('data',mode);action(tx.objectStore('data'),resolve,reject);tx.onerror=()=>reject(tx.error)})}finally{db.close()}};
const get=<T>(key:string)=>transact<T|undefined>('readonly',(s,ok,fail)=>{const r=s.get(key);r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error)});
const put=(key:string,value:unknown)=>transact<void>('readwrite',(s,ok,fail)=>{const r=s.put(value,key);r.onsuccess=()=>ok();r.onerror=()=>fail(r.error)});
export async function saveOfflinePass(pass:StoredPass){
 if(pass.status!=='ACTIVE'||!/^dns-pass:v1:[A-Za-z0-9_-]{43}$/.test(pass.qrPayload))throw Error('INVALID_PASS');
 let key=await get<CryptoKey>('key');
 if(!key){key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);await put('key',key)}
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(pass)));
 await put('pass',{iv,ciphertext});
}
export async function readOfflinePass():Promise<StoredPass|null>{
 try{const key=await get<CryptoKey>('key');const data=await get<{iv:Uint8Array;ciphertext:ArrayBuffer}>('pass');
 if(!key||!data)return null;
 const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(new Uint8Array(data.iv).buffer as ArrayBuffer)},key,data.ciphertext);
 const pass=JSON.parse(new TextDecoder().decode(raw)) as StoredPass;
 return pass.status==='ACTIVE'&&/^dns-pass:v1:[A-Za-z0-9_-]{43}$/.test(pass.qrPayload)?pass:null;
 }catch{return null}
}
export async function clearOfflinePass(){if(typeof indexedDB!=='undefined')await new Promise<void>(resolve=>{const r=indexedDB.deleteDatabase(DB);r.onsuccess=r.onerror=r.onblocked=()=>resolve()})}
