import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canUseOrganization, toolsForOrganization } from '../../src/workspace/access.ts';
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
