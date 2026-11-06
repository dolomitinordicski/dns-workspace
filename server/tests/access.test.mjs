import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { accessService, permissionsFor } from '../service.mjs';

if (process.env.GCLOUD_PROJECT !== 'demo-dns-identity' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8188')
  throw Error('Dedicated demo loopback emulator required');
const app = initializeApp({ projectId: 'demo-dns-identity' }, 'access-tests');
const db = getFirestore(app);
const accounts = new Map();
const auth = { async getUser(uid) { if (!accounts.has(uid)) throw Error('not-found'); return accounts.get(uid); } };
const actor = uid => ({ uid, token: { email_verified: true, firebase: { sign_in_provider: 'google.com' } } });
const tools = { 'data-entry':'write', analytics:'read', 'flyer-studio':'read', fair:'read' };
const call = (uid, data) => accessService(db, auth, uid ? actor(uid) : null, data);
const request = uid => call(uid, { action:'request', organizationId:'org-a', language:'it' });
const approve = (uid, org='org-a', area='area-a', expectedTools=tools) => call('admin', {
  action:'approve', uid, organizationId:org, reportingAreaId:area, expectedTools });
const denied = (promise, code) => assert.rejects(promise, e => e.accessCode === code);

before(() => {});
beforeEach(async () => {
  const response = await fetch('http://127.0.0.1:8188/emulator/v1/projects/demo-dns-identity/databases/(default)/documents', { method:'DELETE' });
  assert.equal(response.ok, true);
  accounts.clear();
  for (const uid of ['admin','alice','bob','outsider']) accounts.set(uid, {
    uid, email:`${uid}@example.test`, emailVerified:true, disabled:false, providerData:[{ providerId:'google.com' }],
  });
  const batch=db.batch();
  batch.set(db.doc('users/admin'), { id:'admin', active:true, globalRoles:['dns-admin'] });
  for (const [org,area] of [['org-a','area-a'],['org-b','area-b']]) {
    batch.set(db.doc(`organizations/${org}`), { id:org, active:true, organizationType:'tourism-organisation', reportingAreaIds:[area] });
    batch.set(db.doc(`reportingAreas/${area}`), { id:area, active:true });
    batch.set(db.doc(`organizationToolAccess/${org}`), { organizationId:org, tools });
  }
  await batch.commit();
});
after(() => deleteApp(app));

test('anonymous cannot submit or inspect requests', async () => {
  await denied(requestAccessAnonymous(), 'unauthenticated');
  function requestAccessAnonymous() { return call(null,{ action:'status' }); }
});
test('only verified Google authentication may submit', async () => {
  await denied(accessService(db,auth,{uid:'alice',token:{email_verified:true,firebase:{sign_in_provider:'password'}}},
    {action:'request',organizationId:'org-a',language:'it'}),'permission-denied');
  accounts.get('alice').disabled=true;
  await denied(request('alice'),'permission-denied');
});
test('request stores trusted email and creates no entitlement', async () => {
  const r=await request('alice'); assert.equal(r.status,'pending'); assert.equal(r.email,'alice@example.test');
  for (const path of ['users/alice','memberships/alice__org-a','accessGrants/alice__reportingArea__area-a','flyerPolicyReaders/alice','workspaceOrganizationAccounts/org-a'])
    assert.equal((await db.doc(path).get()).exists,false);
  assert.equal((await call('alice',{action:'status'})).uid,'alice');
  assert.equal(await call('bob',{action:'status'}),null);
});
test('client cannot inject identity, permissions, status or admin role', async () => {
  for (const extra of [{uid:'admin'},{email:'admin@example.test'},{permissions:['flyer.write']},{status:'approved'},{globalRoles:['dns-admin']}])
    await denied(call('alice',{action:'request',organizationId:'org-a',language:'it',...extra}),'invalid-argument');
});
test('pending request is idempotent and cannot switch organization', async () => {
  await request('alice'); const r=await call('alice',{action:'request',organizationId:'org-b',language:'de'});
  assert.equal(r.organizationId,'org-a');
});
test('unknown, inactive and network organizations denied', async () => {
  for(const org of ['missing','org-b']) {
    if(org==='org-b') await db.doc('organizations/org-b').update({active:false});
    await denied(call('alice',{action:'request',organizationId:org,language:'it'}),'failed-precondition');
  }
  await db.doc('organizations/org-b').update({active:true,organizationType:'network-operator'});
  await denied(call('alice',{action:'request',organizationId:'org-b',language:'it'}),'failed-precondition');
});
test('requester cannot approve/reject/list/change policy', async () => {
  await request('alice');
  for(const data of [{action:'approve',uid:'bob'},{action:'reject',uid:'bob'},{action:'list'},
    {action:'policy',organizationId:'org-a',tools}]) await denied(call('alice',data),'permission-denied');
});
test('inactive administrator and disabled Auth administrator denied', async () => {
  await request('alice'); await db.doc('users/admin').update({active:false});
  await denied(approve('alice'),'permission-denied');
  await db.doc('users/admin').update({active:true}); accounts.get('admin').disabled=true;
  await denied(approve('alice'),'permission-denied');
});
test('approval atomically uses existing matrix and canonical area', async () => {
  await request('alice'); await approve('alice');
  const profile=(await db.doc('users/alice').get()).data(); assert.equal(profile.active,true); assert.deepEqual(profile.globalRoles,[]);
  const grant=(await db.doc('accessGrants/alice__reportingArea__area-a').get()).data();
  assert.equal(grant.scopeId,'area-a'); assert.equal(grant.userId,'alice');
  assert(grant.permissions.includes('kp.write')); assert(grant.permissions.includes('flyer.read'));
  assert.deepEqual((await db.doc('flyerPolicyReaders/alice').get()).data(), {scopeType:'reportingArea',scopeId:'area-a'});
  assert(!grant.permissions.includes('flyer.write')); assert(!grant.permissions.includes('season.manage'));
  assert.equal((await db.doc('workspaceAccessRequests/alice').get()).data().status,'approved');
  assert.equal((await db.doc('workspaceOrganizationAccounts/org-a').get()).data().uid,'alice');
  assert.equal((await db.doc('memberships/alice__org-a').get()).data().organizationId,'org-a');
  assert.deepEqual((await db.doc('organizationToolAccess/org-a').get()).data().tools,tools);
});
test('cross-area approval fails without partial writes', async () => {
  await request('alice'); await denied(approve('alice','org-a','area-b'),'failed-precondition');
  assert.equal((await db.doc('users/alice').get()).exists,false);
  assert.equal((await db.doc('workspaceAccessRequests/alice').get()).data().status,'pending');
});
test('missing matrix and stale permission preview fail closed', async () => {
  await request('alice'); await denied(approve('alice','org-a','area-a',{}),'failed-precondition');
  await db.doc('organizationToolAccess/org-a').delete(); await denied(approve('alice'),'failed-precondition');
});
test('one account per organization under simultaneous approvals', async () => {
  await request('alice'); await request('bob');
  const results=await Promise.allSettled([approve('alice'),approve('bob')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected' && r.reason.accessCode==='already-exists').length,1);
});
test('legacy active membership blocks second approval', async () => {
  await request('alice'); await db.doc('memberships/bob__org-a').set({userId:'bob',organizationId:'org-a',active:true});
  await denied(approve('alice'),'already-exists');
});
test('pre-existing account/grants are never overwritten', async () => {
  await request('alice'); await db.doc('accessGrants/legacy').set({userId:'alice',active:false,permissions:['kp.read']});
  await denied(approve('alice'),'failed-precondition');
  assert.equal((await db.doc('users/alice').get()).exists,false);
  assert.deepEqual((await db.doc('accessGrants/legacy').get()).data().permissions,['kp.read']);
});
test('changed or disabled target Auth account cannot be approved', async () => {
  await request('alice'); accounts.get('alice').email='changed@example.test';
  await denied(approve('alice'),'failed-precondition');
});
test('rejection grants nothing and cannot be replayed into approval', async () => {
  await request('alice'); await call('admin',{action:'reject',uid:'alice'});
  await denied(approve('alice'),'failed-precondition');
  assert.equal((await db.doc('users/alice').get()).exists,false);
  assert.equal((await request('alice')).status,'rejected');
});
test('matrix downgrade also removes previously granted writes', async () => {
  await request('alice'); await approve('alice');
  await call('admin',{action:'policy',organizationId:'org-a',tools:{'data-entry':'none','analytics':'none','flyer-studio':'none'}});
  const permissions=(await db.doc('accessGrants/alice__reportingArea__area-a').get()).data().permissions;
  assert.deepEqual(permissions,[]);
});
test('matrix edits preserve unedited cells and cannot add unknown privileges', async () => {
  await call('admin',{action:'policy',organizationId:'org-a',tools:{'flyer-studio':'write'}});
  assert.equal((await db.doc('organizationToolAccess/org-a').get()).data().tools['data-entry'],'write');
  await denied(call('admin',{action:'policy',organizationId:'org-a',tools:{'dns-admin':'write'}}),'invalid-argument');
});
test('permission builder grants scoped publication only with Flyer write access', () => {
  assert.deepEqual(permissionsFor({'flyer-studio':'read'}),['flyer.read']);
  assert.deepEqual(permissionsFor({'flyer-studio':'none'}),[]);
  assert.deepEqual(permissionsFor({'flyer-studio':'write'}),['flyer.publish','flyer.read','flyer.write']);
});

 test('managed Flyer writer can publish only in its assigned area; downgrade revokes publication', async () => {
  await request('alice'); await approve('alice');
  await call('admin',{action:'policy',organizationId:'org-a',tools:{'flyer-studio':'write'}});
  const ref=db.doc('accessGrants/alice__reportingArea__area-a');
  const writer=(await ref.get()).data();
  assert(writer.permissions.includes('flyer.publish'));
  assert.equal(writer.scopeType,'reportingArea'); assert.equal(writer.scopeId,'area-a');
  assert.equal((await db.doc('accessGrants/alice__reportingArea__area-b').get()).exists,false);
  await call('admin',{action:'policy',organizationId:'org-a',tools:{'flyer-studio':'read'}});
  const reader=(await ref.get()).data();
  assert(reader.permissions.includes('flyer.read'));
  assert(!reader.permissions.includes('flyer.write')); assert(!reader.permissions.includes('flyer.publish'));
 });
