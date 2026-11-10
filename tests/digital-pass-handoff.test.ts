import test from 'node:test';
import assert from 'node:assert/strict';
import {PASS_HANDOFF_KEY, PASS_HANDOFF_TTL_MS, capturePassHandoff, readPassHandoff, clearPassHandoff} from '../src/services/passHandoff';

function store() {
 const map=new Map<string,string>();
 return {
  getItem:(key:string)=>map.get(key)??null,
  setItem:(key:string,value:string)=>{map.set(key,value)},
  removeItem:(key:string)=>{map.delete(key)},
 };
}
const link='#activation?number=000123&code=ABCDEFG'.replace('ABCDEFG','ABCD23');
test('QR remains available in same browser tab after email-link round trip',()=>{
 const s=store(),now=1000;
 assert.equal(capturePassHandoff(link,s,now),true);
 assert.deepEqual(readPassHandoff(s,now+200),{number:'000123',code:'ABCD23',expires:now+PASS_HANDOFF_TTL_MS});
 assert.equal(capturePassHandoff('#digital-pass',s,now+200),false);
 assert.equal(readPassHandoff(s,now+201)?.number,'000123');
 clearPassHandoff(s);
 assert.equal(readPassHandoff(s),null);
});
test('cross-device email verification cannot silently claim without QR or manual input',()=>{
 const first=store(),second=store();
 capturePassHandoff(link,first,1000);
 assert.equal(readPassHandoff(second,1001),null);
 assert.equal(readPassHandoff(first,1001)?.code,'ABCD23');
 assert.equal(capturePassHandoff(link,second,1002),true);
 assert.equal(readPassHandoff(second,1003)?.code,'ABCD23');
});
test('expired, malformed, future and untrusted handoffs fail closed',()=>{
 const s=store();
 capturePassHandoff(link,s,1000);
 assert.equal(readPassHandoff(s,1000+PASS_HANDOFF_TTL_MS),null);
 assert.equal(capturePassHandoff('#activation?number=12%3Cscript%3E&code=ABCD23',s,1100),true);
 assert.equal(readPassHandoff(s,1101),null);
 s.setItem(PASS_HANDOFF_KEY,'{not-json');
 assert.equal(readPassHandoff(s,1101),null);
 s.setItem(PASS_HANDOFF_KEY,JSON.stringify({number:'000123',code:'ABCD23',expires:1101+PASS_HANDOFF_TTL_MS+1}));
 assert.equal(readPassHandoff(s,1101),null);
 s.setItem(PASS_HANDOFF_KEY,JSON.stringify({number:'000123',code:'ABCD23',expires:1102}));
 assert.equal(readPassHandoff(s,1102),null);
});
test('disabled browser storage cannot crash QR handoff capture',()=>{
 const blocked={setItem:()=>{throw Error('blocked')},getItem:()=>{throw Error('blocked')},removeItem:()=>{throw Error('blocked')}};
 assert.equal(capturePassHandoff(link,blocked,1000),true);
 assert.equal(readPassHandoff(blocked,1001),null);
 assert.doesNotThrow(()=>clearPassHandoff(blocked));
});
