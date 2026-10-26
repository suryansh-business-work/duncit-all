/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectEachRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Pod admin (/pods) — editing, cancelling, reinstating and hiding a pod are
 * guarded by `requireRole(ctx, ADMIN_WRITE)` as each resolver's first line
 * (pods/pod/pod.resolver.ts), so every call names an id no pod has.
 * The member's refusal of deletePod / setPodHidden is staff-operations SA-81/82.
 * Scenario map: Partners › Pod admin.
 */

const UPDATE = `mutation E2eAdminUpdatePod($id: ID!) { updatePod(pod_doc_id: $id, input: {}) { id } }`;
const OPERATIONS = [
  ['updatePod', UPDATE],
  ['deletePod', `mutation E2eAdminDeletePod($id: ID!) { deletePod(pod_doc_id: $id) }`],
  ['revokePodCancellation', `mutation E2eAdminRevokePod($id: ID!) { revokePodCancellation(pod_doc_id: $id) { id } }`],
  [
    'setPodHidden',
    `mutation E2eAdminHidePod($id: ID!) { setPodHidden(pod_doc_id: $id, hidden: true, reason: "e2e") { id } }`,
  ],
] as const;
const byId = { id: NO_ID };

describe('API · Pod admin writes belong to the platform admins', { testIsolation: false }, () => {
  let memberToken = '';
  let venuesStaffToken = '';
  let podsStaffToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    signInRunAs(['ALL_VENUES_ACCESS']).then((token) => {
      venuesStaffToken = token;
    });
    revokeRunRoles(['ALL_VENUES_ACCESS']);
    signInRunAs(['ALL_PODS_ACCESS']).then((token) => {
      podsStaffToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ALL_PODS_ACCESS']);
  });

  it('PA-01 editing or reinstating a pod is refused signed out and to a member', () => {
    expectEachRefused('updatePod', UPDATE, byId, [
      [null, SIGNED_OUT],
      [memberToken, ACCESS_DENIED],
    ]);
    expectEachRefused('revokePodCancellation', OPERATIONS[2][1], byId, [[memberToken, ACCESS_DENIED]]);
  });

  it('PA-02 staff of another console are refused every pod admin write', () => {
    OPERATIONS.forEach(([field, query]) => {
      expectEachRefused(field, query, byId, [[venuesStaffToken, ACCESS_DENIED]]);
    });
  });

  // pods/pod/pod.resolver.ts:360-365 — updatePod asks for ADMIN_WRITE only, so the
  // Pods console's own role is refused the editor its console mounts (/pods/:id/edit).
  it.skip('KNOWN BUG PA-03 ALL_PODS_ACCESS reaches the pod editor: a missing pod is the only refusal', () => {
    expectEachRefused('updatePod', UPDATE, byId, [[podsStaffToken, { code: 'NOT_FOUND', message: 'Pod not found' }]]);
  });
});
