import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (process.env.GCLOUD_PROJECT !== 'demo-dns-identity' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9199'
  || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8188') throw Error('Demo emulators required');
const app=initializeApp({projectId:'demo-dns-identity'},'callable-tests');
const db=getFirestore(app);
const endpoint='http://127.0.0.1:5001/demo-dns-identity/europe-west8/dnsWorkspaceAccess';
async function invoke(data,token) {
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({data})});
  return {status:response.status,body:await response.json()};
}
async function google(email) {
  const b64=data=>Buffer.from(JSON.stringify(data)).toString('base64url');
  const credential=`${b64({alg:'none',typ:'JWT'})}.${b64({sub:email,email,email_verified:true,iss:'https://accounts.google.com',aud:'demo',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})}.`;
  const response=await fetch('http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postBody:`id_token=${encodeURIComponent(credential)}&providerId=google.com`,requestUri:'http://localhost',returnSecureToken:true}),
  });
  const result=await response.json(); assert.equal(response.ok,true,JSON.stringify(result)); return result;
}
after(()=>deleteApp(app));
test('real Google emulator token, protected callable, approval and scoped rules',async()=>{
  const org='callable-org',area='callable-area';
  await db.doc(`organizations/${org}`).set({id:org,active:true,organizationType:'tourism-organisation',reportingAreaIds:[area]});
  await db.doc(`reportingAreas/${area}`).set({id:area,active:true});
  const tools={'data-entry':'read','flyer-studio':'write'};
  await db.doc(`organizationToolAccess/${org}`).set({organizationId:org,tools});
  const user=await google('callable-user@example.test');
  const admin=await google('callable-admin@example.test');
  await db.doc(`users/${admin.localId}`).set({id:admin.localId,active:true,globalRoles:['dns-admin']});
  assert.equal((await invoke({action:'request',organizationId:org,language:'it'})).status,401);
  const requested=await invoke({action:'request',organizationId:org,language:'it'},user.idToken);
  assert.equal(requested.status,200,JSON.stringify(requested.body)); assert.equal(requested.body.result.status,'pending');
  assert.equal((await db.doc(`users/${user.localId}`).get()).exists,false);
  assert.equal((await invoke({action:'list'},user.idToken)).status,403);
  // Direct client writes cannot self-approve or create authorization documents.
  for (const path of [`users/${user.localId}`,`workspaceAccessRequests/${user.localId}`,`workspaceOrganizationAccounts/${org}`]) {
    const response=await fetch(`http://127.0.0.1:8188/v1/projects/demo-dns-identity/databases/(default)/documents/${path}`,{
      method:'PATCH',headers:{Authorization:`Bearer ${user.idToken}`,'Content-Type':'application/json'},
      body:JSON.stringify({fields:{active:{booleanValue:true},status:{stringValue:'approved'}}}),
    }); assert.equal(response.status,403,`self-write ${path}`);
  }
  const approved=await invoke({action:'approve',uid:user.localId,organizationId:org,reportingAreaId:area,expectedTools:tools},admin.idToken);
  assert.equal(approved.status,200,JSON.stringify(approved.body));
  assert.equal((await invoke({action:'status'},user.idToken)).body.result.status,'approved');
  const grant=(await db.doc(`accessGrants/${user.localId}__reportingArea__${area}`).get()).data();
  assert(grant.permissions.includes('flyer.write')); assert(!grant.permissions.includes('kp.write'));
  const foreignRequest=await fetch(`http://127.0.0.1:8188/v1/projects/demo-dns-identity/databases/(default)/documents/workspaceAccessRequests/${user.localId}`,{
    headers:{Authorization:`Bearer ${user.idToken}`},
  });assert.equal(foreignRequest.status,403,'PII is only exposed through the scoped callable');
});
