import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { seed, A, U, orgs, password } from './seed.mjs';
import { projectId, requireEmulators } from './safety.mjs';
import { syntheticOrder } from './upstream/virtual-dns-area.mjs';
const apps = [], dbs = {};
before(async () => {
  requireEmulators();
  await seed();
  for (const [role, uid] of Object.entries(U)) {
    const app = initializeApp({ projectId, apiKey: 'demo-key' }, role); apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
    const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8188);
    const credential = await signInWithEmailAndPassword(auth, `${uid}@example.test`, password);
    assert.equal(credential.user.uid, uid);
    dbs[role] = db;
  }
  const app = initializeApp({ projectId, apiKey: 'demo-key' }, 'anonymous'); apps.push(app);
  dbs.anonymous = getFirestore(app); connectFirestoreEmulator(dbs.anonymous, '127.0.0.1', 8188);
});
after(async () => { await Promise.all(apps.map(deleteApp)); });
for (const role of ['writer', 'reader', 'outsider', 'admin']) {
  test(`${role}: own identity queries succeed and foreign authorization metadata is denied`, async () => {
    const db = dbs[role], uid = U[role];
    for (const name of ['memberships', 'accessGrants']) {
      const rows = await assertSucceeds(getDocs(query(collection(db, name), where('userId', '==', uid))));
      assert.ok(rows.size > 0); assert.ok(rows.docs.every(d => d.data().userId === uid));
      const other = role === 'writer' ? U.reader : U.writer;
      await assertFails(getDoc(doc(db, name, `${other}__${name === 'accessGrants' ? 'organization__' : ''}${A.organizationId}`)));
      await assertFails(getDocs(collection(db, name)));
    }
    await assertSucceeds(getDoc(doc(db, 'users', uid)));
    await assertFails(setDoc(doc(db, 'accessGrants', `${uid}__organization__${A.organizationId}`), { active: true, permissions: ['ticketOrders.write'] }));
  });
}
test('policy reads require membership; policy list and edits are admin-only', async () => {
  await assertSucceeds(getDoc(doc(dbs.writer, 'organizationToolAccess', A.organizationId)));
  await assertFails(getDoc(doc(dbs.writer, 'organizationToolAccess', A.foreignOrganizationId)));
  await assertFails(getDocs(collection(dbs.writer, 'organizationToolAccess')));
  const policy = (await getDoc(doc(dbs.admin, 'organizationToolAccess', A.organizationId))).data();
  await assertFails(setDoc(doc(dbs.writer, 'organizationToolAccess', A.organizationId), policy));
  await assertSucceeds(getDocs(collection(dbs.admin, 'organizationToolAccess')));
});
for (const [i, level] of ['W', 'R', '–'].entries()) {
  test(`Data Entry ${level}: real authenticated Firestore read/create/update/delete`, async () => {
    const org = orgs[i], db = i === 2 ? dbs.outsider : dbs.writer;
    const checkRead = i < 2 ? assertSucceeds : assertFails;
    const checkWrite = i === 0 ? assertSucceeds : assertFails;
    await checkRead(getDoc(doc(db, 'ticketOrders', org)));
    await checkRead(getDocs(query(collection(db, 'ticketOrders'), where('organizationId', '==', org))));
    await checkWrite(setDoc(doc(db, 'ticketOrders', `${org}-created`), syntheticOrder(`${org}-created`, org)));
    await checkWrite(updateDoc(doc(db, 'ticketOrders', org), { status: 'submitted' }));
    await assertFails(deleteDoc(doc(db, 'ticketOrders', org)));
  });
}
test('W policy without grants provides no entitlement', async () => {
  await assertFails(getDoc(doc(dbs.outsider, 'ticketOrders', A.organizationId)));
  await assertFails(setDoc(doc(dbs.outsider, 'ticketOrders', 'no-grant'), syntheticOrder('no-grant')));
});
test('organization isolation: foreign direct reads, broad queries and moving records denied', async () => {
  await assertFails(getDoc(doc(dbs.writer, 'ticketOrders', A.foreignOrganizationId)));
  await assertFails(getDocs(collection(dbs.writer, 'ticketOrders')));
  await assertFails(updateDoc(doc(dbs.writer, 'ticketOrders', A.organizationId), { organizationId: A.secondaryOrganizationId }));
  await assertFails(setDoc(doc(dbs.writer, 'ticketOrders', 'foreign-create'), syntheticOrder('foreign-create', A.foreignOrganizationId)));
});
test('DNS Admin bypasses the matrix for virtual orders, without creating grants', async () => {
  await assertSucceeds(getDoc(doc(dbs.admin, 'ticketOrders', A.foreignOrganizationId)));
  await assertSucceeds(setDoc(doc(dbs.admin, 'ticketOrders', 'admin-created'), syntheticOrder('admin-created', A.foreignOrganizationId)));
  await assertSucceeds(deleteDoc(doc(dbs.admin, 'ticketOrders', 'admin-created')));
});
test('anonymous users cannot read identity, policy or operational orders', async () => {
  for (const path of [`users/${U.writer}`, `organizationToolAccess/${A.organizationId}`, `ticketOrders/${A.organizationId}`]) {
    await assertFails(getDoc(doc(dbs.anonymous, path)));
  }
});

for (const [i, level] of ['W', 'R', '–'].entries()) {
  test(`Data Entry sales ${level}: validated create and archived update obey matrix`, async () => {
    const org = orgs[i], db = i === 2 ? dbs.outsider : dbs.writer;
    const id = `2026-27__${org}__${A.reportingAreaId}__day__official__regular`;
    const sale = { id, draftKey: 'dns-test-draft', seasonId: '2026-27', organizationId: org,
      reportingAreaId: A.reportingAreaId, productCode: 'day', salesChannel: 'official', salesPeriod: 'regular',
      quantity: 10, amountOverride: null, amountOverrideReason: '',
      pricing: { pricingConfigId: 'dns-test-price', unitPrice: 10, settlementUnitPrice: 10, currency: 'EUR' },
      calculatedAmount: 100, revision: 1,
      provenance: { sourceSystem: 'manual-data-entry', methodVersion: 1, dataStatus: 'draft' },
      updatedBy: U[i === 2 ? 'outsider' : 'writer'], updatedAt: serverTimestamp() };
    const ref = doc(db, 'ticketSales', id);
    if (i === 0) await assertSucceeds(setDoc(ref, sale));
    else {
      await assertFails(setDoc(ref, sale));
      await assertSucceeds(setDoc(doc(dbs.admin, 'ticketSales', id), { ...sale, updatedBy: U.admin }));
    }
    if (i < 2) await assertSucceeds(getDoc(ref)); else await assertFails(getDoc(ref));
    const previous = (await getDoc(doc(dbs.admin, 'ticketSales', id))).data();
    const batch = writeBatch(db);
    batch.set(doc(db, 'ticketSales', id, 'revisions', '1'), previous);
    batch.set(ref, { ...sale, quantity: 11, calculatedAmount: 110, revision: 2 });
    await (i === 0 ? assertSucceeds : assertFails)(batch.commit());
    await assertFails(deleteDoc(ref));
  });
}
