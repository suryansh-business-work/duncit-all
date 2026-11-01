/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectEachRefused, expectPortalRefused } from '../../../support/api-partners';
import { asRole, call, expectCallsRefused, NO_ID } from '../../../support/api-staff';

/**
 * Regional Club Admin › Club Admins and Pod Detail — the region console's
 * member picker, rename, drill-down (a Club Admin's clubs, a club's pods, a
 * host's pods) and the pod detail it opens at REGIONAL scope.
 *
 * Every one of these asks REGIONAL_RW (REGIONAL_CLUB_ADMIN, SUPER_ADMIN —
 * clubs/region/region.resolver.ts) before the region chain is walked, and the
 * pod detail runs only the region-scoped twins (packages/pod-details
 * queries.regional.ts → regionPodAttendees, regionPodAuditLogs,
 * regionPodPayments, regionPodFeedback, regionPodHost), never the admin
 * queries. So a city admin, the Club Admins console's staff and a member are
 * all refused, and a rename or a membership change never reaches a region.
 * region-console.cy.ts covers the tree, the member list and add/remove;
 * REGIONAL_CLUB_ADMIN cannot be granted to a run account, so the manager's own
 * reads are not run here.
 *
 * Scenario map: Regional Club Admin › Club Admins ("Denied roles cannot open or
 * call Region members (/club-admins)"); Regional Club Admin › Pod Detail ("Pod
 * outside the region is forbidden").
 */

const pod = { pod: NO_ID };

const MEMBERS = [
  call(
    'regionClubAdminCandidates',
    `query E2eRegionCandidates { regionClubAdminCandidates(search: "e2e", limit: 5) { __typename } }`,
  ),
  call('renameMyRegion', `mutation E2eRegionRename { renameMyRegion(region_name: "E2E probe") { __typename } }`),
  call(
    'regionClubAdminClubs',
    `query E2eRegionAdminClubs($id: ID!) { regionClubAdminClubs(user_id: $id, query: { page_size: 1 }) { __typename } }`,
    { id: NO_ID },
  ),
  call(
    'regionClubPods',
    `query E2eRegionClubPods($id: ID!) { regionClubPods(club_id: $id, query: { page_size: 1 }) { __typename } }`,
    { id: NO_ID },
  ),
  call(
    'regionHostPods',
    `query E2eRegionHostPods($id: ID!) { regionHostPods(host_user_id: $id, query: { page_size: 1 }) { __typename } }`,
    { id: NO_ID },
  ),
];

const POD_DETAIL = [
  call('regionPodAttendees', `query E2eRegionAttendees($pod: ID!) { regionPodAttendees(pod_doc_id: $pod) { __typename } }`, pod),
  call('regionPodAuditLogs', `query E2eRegionAudit($pod: ID!) { regionPodAuditLogs(pod_doc_id: $pod) { __typename } }`, pod),
  call(
    'regionPodPayments',
    `query E2eRegionPayments($pod: ID!) { regionPodPayments(pod_doc_id: $pod, query: { page_size: 1 }) { __typename } }`,
    pod,
  ),
  call('regionPodFeedback', `query E2eRegionFeedback($pod: ID!) { regionPodFeedback(pod_doc_id: $pod, limit: 1) { __typename } }`, pod),
  call(
    'regionPodHost',
    `query E2eRegionPodHost($pod: ID!, $user: ID!) { regionPodHost(pod_doc_id: $pod, user_id: $user) { __typename } }`,
    { pod: NO_ID, user: NO_ID },
  ),
];

describe('API · Region members, drill-down and pod detail are the regional manager’s', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ALL_CLUB_ADMINS_ACCESS', 'CITY_ADMIN']);
  });

  it('RM-01 the member picker, rename and drill-down are refused signed out and to a member', () => {
    MEMBERS.forEach((c) =>
      expectEachRefused(c.field, c.query, c.variables ?? {}, [
        [null, SIGNED_OUT],
        [memberToken, ACCESS_DENIED],
      ]),
    );
  });

  it('RM-02 every region pod-detail section is refused signed out and to a member', () => {
    POD_DETAIL.forEach((c) =>
      expectEachRefused(c.field, c.query, c.variables ?? {}, [
        [null, SIGNED_OUT],
        [memberToken, ACCESS_DENIED],
      ]),
    );
  });

  it('RM-03 the Club Admins console’s staff cannot sign in to the region console or reach a region', () => {
    asRole('ALL_CLUB_ADMINS_ACCESS', (token) => {
      expectPortalRefused('regional-club-admin');
      expectCallsRefused(token, [...MEMBERS, ...POD_DETAIL]);
    });
  });

  it('RM-04 a city admin is refused the picker, rename, drill-down and every region pod-detail section', () => {
    asRole('CITY_ADMIN', (token) => expectCallsRefused(token, [...MEMBERS, ...POD_DETAIL]));
  });
});
