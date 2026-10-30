import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { VIRTUAL_AREA as A, VIRTUAL_IDENTITIES as U, virtualPolicy, syntheticOrder } from './upstream/virtual-dns-area.mjs';
import { requireEmulators, projectId } from './safety.mjs';
export { A, U };
export const password = 'DNS-Test-Only-2026!';
export const orgs = [A.organizationId, A.secondaryOrganizationId, A.foreignOrganizationId];
export const permissions = ['ticketOrders.read', 'ticketOrders.write', 'ticketSales.read', 'ticketSales.write', 'kp.read', 'kp.write'];
export async function seed() {
  requireEmulators();
  const env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8188 } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const put = (path, data) => setDoc(doc(db, path), data);
    await put('seasons/2026-27', { status: 'active' });
    await put('ticketPricingConfigs/dns-test-price', { active: true, seasonId: '2026-27', scopeType: 'reportingArea', scopeId: A.reportingAreaId, productCode: 'day', salesChannel: 'official', salesPeriod: 'regular', unitPrice: 10, settlementUnitPrice: 10 });
    await put(`reportingAreas/${A.reportingAreaId}`, { ...A, id: A.reportingAreaId });
    for (const [i, id] of orgs.entries()) {
      await put(`organizations/${id}`, { ...A, id, active: true, canonicalName: i ? `DNS Test Organisation ${i + 1}` : A.name,
        organizationType: 'tourism-organisation', reportingAreaIds: [A.reportingAreaId] });
      await put(`organizationToolAccess/${id}`, { ...virtualPolicy(i === 0 ? 'write' : i === 1 ? 'read' : 'none'), organizationId: id });
      await put(`ticketOrders/${id}`, syntheticOrder(id, id));
    }
    await put('users/dns-test-inactive', { active: false, globalRoles: [] });
    await put(`accessGrants/${U.writer}__reportingArea__${A.reportingAreaId}`, { userId: U.writer, scopeType: 'reportingArea', scopeId: A.reportingAreaId, active: true, validTo: '2000-01-01T00:00:00Z', permissions: ['polls.read'] });
    for (const [role, uid] of Object.entries(U)) {
      await put(`users/${uid}`, { active: true, globalRoles: role === 'admin' ? ['dns-admin'] : [] });
      // Both writer and reader have full grants: the organization matrix must cap them.
      for (const orgId of orgs.slice(0, 2)) {
        await put(`memberships/${uid}__${orgId}`, { userId: uid, organizationId: orgId, active: true });
        await put(`accessGrants/${uid}__organization__${orgId}`, { userId: uid, scopeType: 'organization', scopeId: orgId,
          active: true, permissions: role === 'outsider' ? [] : permissions });
      }
      await put(`memberships/${uid}__${A.foreignOrganizationId}`, { userId: uid, organizationId: A.foreignOrganizationId, active: role === 'outsider' });
      if (role === 'outsider') await put(`accessGrants/${uid}__organization__${A.foreignOrganizationId}`,
        { userId: uid, scopeType: 'organization', scopeId: A.foreignOrganizationId, active: true, permissions });
    }
  });
  await env.cleanup();
  for (const uid of [...Object.values(U), 'dns-test-inactive', 'dns-test-missing-profile']) {
    const response = await fetch(`http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: uid, email: `${uid}@example.test`, password, returnSecureToken: true }),
    });
    if (!response.ok) {
      const error = await response.text();
      if (!error.includes('EMAIL_EXISTS')) throw new Error(error);
    }
  }
}
