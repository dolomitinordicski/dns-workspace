/** Browser-only QR handoff. No URLs containing activation codes enter Auth redirects.
 * Cross-device email links require a fresh QR scan or manual code fallback. */
export type PassHandoff = { number:string; code:string; expires:number };
export const PASS_HANDOFF_KEY='dns-digital-pass-handoff-v1';
export const PASS_HANDOFF_TTL_MS=10*60*1000;
const valid=(x:unknown):x is PassHandoff=>
  !!x&&typeof x==='object'&&
  /^\d{1,12}$/.test((x as PassHandoff).number)&&
  /^[A-HJ-NP-Z2-9]{6}$/.test((x as PassHandoff).code)&&
  Number.isFinite((x as PassHandoff).expires);
export function readPassHandoff(storage:Pick<Storage,'getItem'|'removeItem'>,now=Date.now()):PassHandoff|null{
 try {
  const raw=storage.getItem(PASS_HANDOFF_KEY);
  if(!raw)return null;
  const value:unknown=JSON.parse(raw);
  if(!valid(value)||value.expires<=now||value.expires>now+PASS_HANDOFF_TTL_MS){
   storage.removeItem(PASS_HANDOFF_KEY);return null;
  }
  return value;
 }catch{return null}
}
export function storePassHandoff(number:string,code:string,storage:Pick<Storage,'setItem'>,now=Date.now()):void {
 if(!/^\d{1,12}$/.test(number)||!/^[A-HJ-NP-Z2-9]{6}$/.test(code))return;
 try{storage.setItem(PASS_HANDOFF_KEY,JSON.stringify({number,code,expires:now+PASS_HANDOFF_TTL_MS}))}
 catch{/* disabled storage: customer can still type printed number and code */}
}
export function capturePassHandoff(hash:string,storage:Pick<Storage,'setItem'|'removeItem'>,now=Date.now()):boolean{
 if(!hash.startsWith('#activation?'))return false;
 try{
  const params=new URLSearchParams(hash.slice('#activation?'.length));
  const number=params.get('number')||'',code=params.get('code')||'';
  if(!/^\d{1,12}$/.test(number)||!/^[A-HJ-NP-Z2-9]{6}$/.test(code)){
   storage.removeItem(PASS_HANDOFF_KEY);return true;
  }
  storage.setItem(PASS_HANDOFF_KEY,JSON.stringify({number,code,expires:now+PASS_HANDOFF_TTL_MS}));
 }catch{/* browser storage disabled: user can enter printed number and code manually */}
 return true;
}
export function clearPassHandoff(storage:Pick<Storage,'removeItem'>){
 try{storage.removeItem(PASS_HANDOFF_KEY)}catch{/* storage blocked */}
}
