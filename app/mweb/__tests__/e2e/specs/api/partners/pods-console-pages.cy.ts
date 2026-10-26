/// <reference types="cypress" />
import { ACCESS_DENIED, revokeRunRoles, signInRunAs, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectEachRefused, expectPortalOpens, expectPortalRefused } from '../../../support/api-partners';

/**
 * The Pods console pages (pods.duncit.com) — Dashboard, Auto Pods, Change
 * Requests, Pod Plans, Event Tickets, Pod Settings and Pod Monitoring. The
 * portal signs in ALL_PODS_ACCESS (portals/portal.constants.ts `pods`), and the
 * reads behind these pages answer it through `consoleReaders('POD')`
 * (portals/console-access.ts), as the Venues, Hosts and Clubs consoles do. Pod
 * Settings is the exception: `appSettings` is the platform settings read, still
 * gated to the platform admins and awaiting a product decision — the KNOWN BUG
 * scenario below. Scenario map: Partners › Pods dashboard, Auto Pods, Pod
 * plans, Pod settings, Pod monitoring (AI), Attendance (/event-tickets),
 * Change requests (/pods/change-requests).
 */

const PAGES = [
  // [field, query, guard in the server]
  ['podDashboard', `query E2ePodsDashboard { podDashboard { __typename } }`, 'pods/pod/pod.resolver.ts:221-222'],
  ['adminAutoPodsTable', `query E2eAutoPodsTable { adminAutoPodsTable(query: { page_size: 1 }) { total } }`, 'pods/autoPod/autoPod.resolver.ts:97-98'],
  [
    'podChangeRequests',
    `query E2ePodsChangeQueue { podChangeRequests(role: HOST, query: { page_size: 1 }) { __typename } }`,
    'pods/podChangeRequest/podChangeRequest.resolver.ts:28-33',
  ],
  ['podPlansTable', `query E2ePodPlansTable { podPlansTable(query: { page_size: 1 }) { total } }`, 'pods/pod-plan/pod-plan.resolver.ts:16-17'],
  ['eventTicketsTable', `query E2eEventTicketsTable { eventTicketsTable(query: { page_size: 1 }) { total } }`, 'pods/ticket/ticket.resolver.ts:28-29'],
  ['appSettings', `query E2ePodSettings { appSettings { __typename } }`, 'platform/settings/settings.resolver.ts:19-20'],
  ['podAuditLogsTable', `query E2ePodMonitoring { podAuditLogsTable(query: { page_size: 1 }) { total } }`, 'pods/podAudit/podAudit.resolver.ts:14-15'],
] as const;

/** Pages whose read still asks for the platform admins only (Pod Settings reads the platform settings). */
const STILL_ADMIN_ONLY: ReadonlySet<string> = new Set(['appSettings']);

describe('API · The Pods console pages and who they answer', { testIsolation: false }, () => {
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

  it('PCP-01 ALL_PODS_ACCESS signs in to the Pods console and not to the Venues one', () => {
    expectPortalOpens('pods');
    expectPortalRefused('venues');
  });

  it('PCP-02 every Pods console page is refused signed out and to a member', () => {
    PAGES.forEach(([field, query]) => {
      expectEachRefused(field, query, {}, [
        [null, SIGNED_OUT],
        [memberToken, ACCESS_DENIED],
      ]);
    });
  });

  it('PCP-03 staff of another console (ALL_VENUES_ACCESS) are refused every Pods console page', () => {
    PAGES.forEach(([field, query]) => {
      expectEachRefused(field, query, {}, [[venuesStaffToken, ACCESS_DENIED]]);
    });
  });

  const readsAsPodsStaff = (field: string, query: string) => () => {
    cy.gqlRaw(query, {}, { token: podsStaffToken }).then((body) => {
      expect(body.errors, `${field} errors`).to.be.undefined;
      expect(body.data?.[field], field).to.exist;
    });
  };

  PAGES.forEach(([field, query, guard], index) => {
    const id = `PCP-${String(index + 4).padStart(2, '0')}`;
    if (STILL_ADMIN_ONLY.has(field)) {
      // The console role is still refused this page — see `guard`.
      it.skip(`KNOWN BUG ${id} ALL_PODS_ACCESS reads ${field} (${guard})`, readsAsPodsStaff(field, query));
      return;
    }
    it(`${id} ALL_PODS_ACCESS reads ${field} (${guard})`, readsAsPodsStaff(field, query));
  });
});
