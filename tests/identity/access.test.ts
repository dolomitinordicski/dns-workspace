import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminAreaTools, canUseOrganization, toolsForOrganization } from '../../src/workspace/access.ts';
const org = { id: 'dns-test-organisation', reportingAreaIds: ['dns-test-area'] } as any;
const foreign = { ...org, id: 'dns-test-foreign-organisation' };
const tool = { id: 'data-entry', lifecycle: 'active' } as any;
function identity(level: string, permissions = ['ticketOrders.read', 'ticketOrders.write']): any {
  return { state: 'active', uid: 'dns-test-writer', profile: { globalRoles: [] },
    memberships: [{ organizationId: org.id }],
    grants: [{ scopeType: 'organization', scopeId: org.id, permissions }],
    toolPolicies: { [org.id]: { 'data-entry': level } } };
}
for (const level of ['write', 'read', 'none']) {
  test(`application: organization selection and tool visibility with ${level}`, () => {
    const user = identity(level);
    assert.equal(canUseOrganization(user, org), true);
    assert.equal(canUseOrganization(user, foreign), false);
    assert.equal(toolsForOrganization(user, org, [tool]).length, level === 'none' ? 0 : 1);
    assert.deepEqual(toolsForOrganization(user, foreign, [tool]), []);
  });
}
test('application: policy cannot grant permissions or organization membership', () => {
  assert.deepEqual(toolsForOrganization(identity('write', []), org, [tool]), []);
  const user = identity('write'); user.memberships = [];
  assert.equal(canUseOrganization(user, org), false);
});
test('application: DNS Admin sees non-legacy tools in any virtual organization', () => {
  const user = identity('none', []); user.profile.globalRoles = ['dns-admin'];
  assert.equal(canUseOrganization(user, foreign), true);
  assert.deepEqual(toolsForOrganization(user, foreign, [tool, { ...tool, lifecycle: 'legacy' }]), [tool]);
});
test('application: signed-out/loading/inactive/error states expose no tools', () => {
  for (const state of ['signed-out', 'loading', 'inactive', 'error']) {
    assert.equal(canUseOrganization({ state } as any, org), false);
    assert.deepEqual(toolsForOrganization({ state } as any, org, [tool]), []);
  }
});
test('application: an existing policy with omitted Data Entry must fail closed, matching Firestore', () => {
  const user = identity('write'); user.toolPolicies[org.id] = {};
  assert.deepEqual(toolsForOrganization(user, org, [tool]), []);
});
test('application: absent policy preserves explicit legacy grants during rollout', () => {
  const user = identity('write'); user.toolPolicies = {};
  assert.deepEqual(toolsForOrganization(user, org, [tool]), [tool]);
});

test('DNS Admin area preview shows only configured read/write tools', () => {
  const catalog = [
    { id: 'data-entry', lifecycle: 'active' },
    { id: 'analytics', lifecycle: 'active' },
    { id: 'faktura', lifecycle: 'active' },
    { id: 'polls', lifecycle: 'legacy' },
  ] as any;
  const matrix = { 'data-entry': 'write', 'analytics': 'read', 'faktura': 'none', 'polls': 'write' } as const;
  assert.deepEqual(adminAreaTools(catalog, matrix).map(item => item.id), ['data-entry', 'analytics']);
});

test('DNS Admin area preview fails closed without a configured matrix', () => {
  assert.deepEqual(adminAreaTools([tool], null), []);
  assert.deepEqual(adminAreaTools([tool], {}), []);
});

test('DNS Admin retains all nonlegacy tools in global DNS view', () => {
  const user = identity('none', []); user.profile.globalRoles = ['dns-admin'];
  assert.deepEqual(toolsForOrganization(user, org, [tool]), [tool]);
});

test('Area user grants remain enforced independently from admin area preview', () => {
  const user = identity('write', []);
  assert.deepEqual(toolsForOrganization(user, org, [tool]), []);
  assert.deepEqual(adminAreaTools([tool], { 'data-entry': 'write' }), [tool]);
});

test('area matrix: FAIR is shown and Partner Hub withheld when only FAIR is enabled', () => {
  const user = identity('write');
  user.toolPolicies[org.id] = {
    'data-entry': 'write', 'analytics': 'read', 'flyer-studio': 'read',
    fair: 'read', 'partner-hub': 'none',
  };
  user.grants[0].permissions.push('ticketSales.read', 'flyer.read');
  const catalog = ['data-entry', 'analytics', 'flyer-studio', 'fair', 'partner-hub', 'faktura']
    .map(id => ({ id, lifecycle: 'active' })) as any;
  assert.deepEqual(toolsForOrganization(user, org, catalog).map(t => t.id),
    ['data-entry', 'analytics', 'flyer-studio', 'fair']);
});

test('area matrix: omitted FAIR and Partner Hub fail closed, including legacy membership fallback', () => {
  const user = identity('write');
  const catalog = ['fair', 'partner-hub'].map(id => ({ id, lifecycle: 'active' })) as any;
  assert.deepEqual(toolsForOrganization(user, org, catalog), []);
  user.toolPolicies = {};
  assert.deepEqual(toolsForOrganization(user, org, catalog).map(t => t.id), ['fair', 'partner-hub']);
});

test('area matrix: FAIR and Partner Hub require membership and do not confer other access', () => {
  const user = identity('none', []);
  user.toolPolicies[org.id] = { fair: 'read', 'partner-hub': 'read' };
  const catalog = ['fair', 'partner-hub', 'data-entry'].map(id => ({ id, lifecycle: 'active' })) as any;
  assert.deepEqual(toolsForOrganization(user, org, catalog).map(t => t.id), ['fair', 'partner-hub']);
  user.memberships = [];
  assert.deepEqual(toolsForOrganization(user, org, catalog), []);
});
