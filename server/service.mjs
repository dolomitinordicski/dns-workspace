import { FieldValue } from 'firebase-admin/firestore';

const tools = ['data-entry', 'analytics', 'flyer-studio', 'fair', 'faktura', 'polls', 'partner-hub'];
const fail = (code, message) => { throw Object.assign(new Error(message), { accessCode: code }); };
const id = value => typeof value === 'string' && /^[A-Za-z0-9:_-]{1,128}$/.test(value);
const fresh = () => FieldValue.serverTimestamp();
const levels = value => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).every(k => tools.includes(k) && ['none', 'read', 'write'].includes(value[k]));

export function permissionsFor(policy) {
  if (!levels(policy)) fail('failed-precondition', 'Matrice organizzativa non valida.');
  const result = new Set();
  const add = (tool, read, write = []) => {
    if (['read', 'write'].includes(policy[tool])) read.forEach(p => result.add(p));
    if (policy[tool] === 'write') write.forEach(p => result.add(p));
  };
  add('data-entry', ['season.read','pricing.read','ticketOrders.read','ticketSales.read','kp.read'],
    ['ticketOrders.write','ticketSales.write','kp.write']);
  add('analytics', ['ticketSales.read','kp.read']);
  add('flyer-studio', ['flyer.read'], ['flyer.write', 'flyer.publish']);
  add('faktura', ['verification.read'], ['ticketOrders.verify','ticketSales.verify']);
  add('polls', ['polls.read','events.read'], ['polls.manage','events.manage']);
  return [...result].sort();
}

const publicRequest = d => d ? {
  uid: d.uid, email: d.email, organizationId: d.organizationId, status: d.status,
  reportingAreaId: d.reportingAreaId || '',
} : null;

export async function accessService(db, authApi, actor, input) {
  if (!actor?.uid) fail('unauthenticated', 'Accedi con Google.');
  if (!input || typeof input !== 'object' || !['request','status','list','approve','reject','policy'].includes(input.action))
    fail('invalid-argument', 'Operazione non valida.');
  const uid = actor.uid;
  const requestRef = db.doc(`workspaceAccessRequests/${uid}`);
  if (input.action === 'status') return publicRequest((await requestRef.get()).data());

  if (input.action === 'request') {
    if (Object.keys(input).some(k => !['action','organizationId','language'].includes(k)) || !id(input.organizationId)
      || !['it','de'].includes(input.language)) fail('invalid-argument', 'Richiesta non valida.');
    if (actor.token?.firebase?.sign_in_provider !== 'google.com' || actor.token?.email_verified !== true)
      fail('permission-denied', 'Usa un account Google con email verificata.');
    // Read live Auth metadata; never trust an email supplied by the browser.
    const account = await authApi.getUser(uid);
    if (account.disabled || !account.email || !account.emailVerified ||
      !account.providerData.some(p => p.providerId === 'google.com')) fail('permission-denied', 'Account Google non valido.');
    return db.runTransaction(async tx => {
      const [existing, profile, org] = await tx.getAll(requestRef, db.doc(`users/${uid}`), db.doc(`organizations/${input.organizationId}`));
      if (profile.exists) fail('failed-precondition', 'Account già configurato: contatta DNS Admin.');
      if (existing.exists) return publicRequest(existing.data()); // one immutable request per UID
      if (!org.exists || org.data().active !== true || org.data().organizationType !== 'tourism-organisation')
        fail('failed-precondition', 'Organizzazione non disponibile.');
      const data = { uid, email: account.email, organizationId: input.organizationId,
        language: input.language, status: 'pending', createdAt: fresh() };
      tx.create(requestRef, data);
      return publicRequest(data);
    });
  }

  const requireAdmin = async tx => {
    const account = await authApi.getUser(uid);
    if (account.disabled) fail('permission-denied', 'Account disattivato.');
    const profile = await tx.get(db.doc(`users/${uid}`));
    if (!profile.exists || profile.data().active !== true || !profile.data().globalRoles?.includes('dns-admin'))
      fail('permission-denied', 'Solo DNS Admin.');
  };
  if (input.action === 'list') {
    await db.runTransaction(requireAdmin);
    // Bounded pages, explicit cursor: no silent truncation of the admin queue.
    let q = db.collection('workspaceAccessRequests').orderBy('__name__').limit(50);
    if (input.after) {
      if (!id(input.after)) fail('invalid-argument', 'Pagina non valida.');
      q = q.startAfter(input.after);
    }
    const result = await q.get();
    return { requests: result.docs.map(d => publicRequest(d.data())), after: result.size === 50 ? result.docs.at(-1).id : null };
  }

  if (input.action === 'policy') {
    if (!id(input.organizationId) || !levels(input.tools)) fail('invalid-argument', 'Matrice non valida.');
    return db.runTransaction(async tx => {
      await requireAdmin(tx);
      const orgRef = db.doc(`organizations/${input.organizationId}`);
      const policyRef = db.doc(`organizationToolAccess/${input.organizationId}`);
      const assignmentRef = db.doc(`workspaceOrganizationAccounts/${input.organizationId}`);
      const [org, policy, assignment] = await tx.getAll(orgRef, policyRef, assignmentRef);
      if (!org.exists || org.data().active !== true || org.data().organizationType !== 'tourism-organisation')
        fail('failed-precondition', 'Organizzazione non disponibile.');
      const merged = { ...(policy.data()?.tools || {}), ...input.tools };
      const permissions = permissionsFor(merged);
      // Keep managed grants in sync even where a tool does not enforce the matrix itself.
      if (assignment.exists) {
        const a = assignment.data();
        const grantRef = db.doc(`accessGrants/${a.uid}__reportingArea__${a.reportingAreaId}`);
        const grant = await tx.get(grantRef);
        if (!grant.exists || grant.data().managedBy !== 'workspace-access')
          fail('failed-precondition', 'Grant non gestito: serve una verifica amministrativa.');
        tx.update(grantRef, { permissions, updatedAt: fresh() });
      }
      tx.set(policyRef, { organizationId: input.organizationId, tools: merged, updatedBy: uid, updatedAt: fresh() });
      return { saved: true };
    });
  }

  if (!id(input.uid) || input.uid === uid) fail('invalid-argument', 'Richiesta non valida.');
  const target = db.doc(`workspaceAccessRequests/${input.uid}`);
  const account = input.action === 'approve' ? await authApi.getUser(input.uid) : null;
  return db.runTransaction(async tx => {
    await requireAdmin(tx); // rechecked on every transaction retry
    const req = await tx.get(target);
    if (!req.exists || req.data().status !== 'pending') fail('failed-precondition', 'Richiesta già gestita o assente.');
    if (input.action === 'reject') {
      tx.update(target, { status: 'rejected', reviewedBy: uid, reviewedAt: fresh() });
      return { status: 'rejected' };
    }
    if (!id(input.organizationId) || !id(input.reportingAreaId)) fail('invalid-argument', 'Organizzazione e area obbligatorie.');
    if (account.disabled || !account.emailVerified || account.email !== req.data().email ||
      !account.providerData.some(p => p.providerId === 'google.com')) fail('failed-precondition', 'Account cambiato: verificare la richiesta.');
    const orgId = input.organizationId, areaId = input.reportingAreaId, userId = input.uid;
    const assignmentRef = db.doc(`workspaceOrganizationAccounts/${orgId}`);
    const profileRef = db.doc(`users/${userId}`);
    const memberRef = db.doc(`memberships/${userId}__${orgId}`);
    const grantRef = db.doc(`accessGrants/${userId}__reportingArea__${areaId}`);
    const flyerPolicyReaderRef = db.doc(`flyerPolicyReaders/${userId}`);
    const [org, policy, assignment, profile, member, grant, area, flyerPolicyReader] = await tx.getAll(
      db.doc(`organizations/${orgId}`), db.doc(`organizationToolAccess/${orgId}`), assignmentRef,
      profileRef, memberRef, grantRef, db.doc(`reportingAreas/${areaId}`), flyerPolicyReaderRef);
    const existingMembers = await tx.get(db.collection('memberships').where('organizationId','==',orgId));
    const ownMembers = await tx.get(db.collection('memberships').where('userId','==',userId));
    const ownGrants = await tx.get(db.collection('accessGrants').where('userId','==',userId));
    if (!org.exists || org.data().active !== true || org.data().organizationType !== 'tourism-organisation'
      || !org.data().reportingAreaIds?.includes(areaId) || !area.exists || area.data().active !== true)
      fail('failed-precondition', 'Area non appartenente all’organizzazione.');
    if (!policy.exists || !levels(policy.data().tools)) fail('failed-precondition', 'Configura prima la matrice dell’organizzazione.');
    if (!levels(input.expectedTools) || JSON.stringify(Object.entries(input.expectedTools).sort()) !==
      JSON.stringify(Object.entries(policy.data().tools).sort()))
      fail('failed-precondition', 'Permessi cambiati: verifica nuovamente l’approvazione.');
    if (assignment.exists || existingMembers.docs.some(d => d.data().active === true))
      fail('already-exists', 'Organizzazione già assegnata: sostituzione o eccezione da verificare separatamente.');
    if (profile.exists || member.exists || grant.exists || flyerPolicyReader.exists || !ownMembers.empty || !ownGrants.empty)
      fail('failed-precondition', 'Account già configurato: nessun permesso esistente è stato sovrascritto.');
    const permissions = permissionsFor(policy.data().tools);
    tx.create(profileRef, { id: userId, active: true, globalRoles: [], preferredLanguage: req.data().language, createdAt: fresh(), updatedAt: fresh() });
    tx.create(memberRef, { id: memberRef.id, userId, organizationId: orgId, role: 'contributor', active: true, createdAt: fresh() });
    tx.create(grantRef, { id: grantRef.id, userId, scopeType: 'reportingArea', scopeId: areaId, permissions,
      active: true, managedBy: 'workspace-access', grantedBy: uid, createdAt: fresh(), updatedAt: fresh() });
    // The private reader index references the managed area grant; it does not grant permissions.
    tx.create(flyerPolicyReaderRef, { scopeType: 'reportingArea', scopeId: areaId });
    tx.create(assignmentRef, { uid: userId, organizationId: orgId, reportingAreaId: areaId, approvedBy: uid, approvedAt: fresh() });
    tx.update(target, { status: 'approved', organizationId: orgId, reportingAreaId: areaId, reviewedBy: uid, reviewedAt: fresh() });
    return { status: 'approved' };
  });
}
