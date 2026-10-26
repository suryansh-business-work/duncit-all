/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import {
  ACCESS_DENIED,
  expectRefused,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
} from '../../../support/access-steps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Pointing a site's A record is the Tech → Domain seat's, website or not:
 * `setCmsSiteARecord` opens with requireRole(DNS_ROLES = SUPER_ADMIN,
 * TECH_MANAGER) before the site is even looked up
 * (server/src/modules/content/cms/cms.resolver.ts). Scenario map: Other ›
 * Websites CMS DNS. The site id is no site's and the address is not an IP, so
 * nothing could reach the DNS provider even if the guard broke; production's
 * zone is never involved.
 *
 * WEBSITE_MANAGER and TECH_MANAGER are not roles the E2E testing API grants
 * (packages/utils e2e-run.ts), so the "website manager refused / tech manager
 * allowed" half of the row is left to the run report.
 */

const SET_A_RECORD = `mutation E2eSetARecord($id: ID!) {
  setCmsSiteARecord(site_id: $id, input: { host: "e2e-refused", ip: "e2e-not-an-address" })
}`;
const OTHER_STAFF: readonly E2eStaffRole[] = ['SUPPORT_MANAGER'];

describe('API · Only the DNS seat may point a site A record', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(OTHER_STAFF);
  });

  it('WD-01 a signed-out caller is refused', () => {
    cy.gqlRaw(SET_A_RECORD, { id: NO_ID }, { token: null }).then((body) =>
      expectRefused('setCmsSiteARecord', body, SIGNED_OUT),
    );
  });

  it('WD-02 a member is refused', () => {
    cy.gqlRaw(SET_A_RECORD, { id: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('setCmsSiteARecord', body, ACCESS_DENIED),
    );
  });

  it('WD-03 a staff role outside DNS_ROLES is refused', () => {
    signInRunAs(OTHER_STAFF).then((staffToken) => {
      cy.gqlRaw(SET_A_RECORD, { id: NO_ID }, { token: staffToken }).then((body) =>
        expectRefused('setCmsSiteARecord', body, ACCESS_DENIED),
      );
    });
  });
});
