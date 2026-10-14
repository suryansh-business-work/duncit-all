/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectRolesRefused, expectTableRead, NO_ID } from '../../../support/api-staff';

/**
 * Marketing › Short Links — links, their click data and the privacy policy are
 * SUPER_ADMIN, CITY_ADMIN and MARKETING_MANAGER only
 * (crm/marketing/shortLink.resolver.ts ADMIN_ROLES, first statement). The
 * erase is asserted on an id no link has; the platform-wide purge and IP-salt
 * rotation are never called from a script. Scenario map: Staff › Short Links
 * "Erase/purge clicks and rotate the IP salt" (role matrix).
 */

const REFUSED: readonly E2eStaffRole[] = ['ZONAL_ADMIN', 'SUPPORT_USER'];
const ROLES: readonly E2eStaffRole[] = [...REFUSED, 'CITY_ADMIN'];

const LINKS = call('shortLinksTable', `query E2eShortLinks { shortLinksTable(query: { page_size: 1 }) { total } }`);
const PRIVACY = [
  call('shortLinkPolicy', `query E2eShortLinkPolicy { shortLinkPolicy { __typename } }`),
  call('eraseShortLinkClicks', `mutation E2eEraseClicks($id: ID!) { eraseShortLinkClicks(id: $id) }`, { id: NO_ID }),
  call('deleteShortLink', `mutation E2eDeleteShortLink($id: ID!) { deleteShortLink(id: $id) }`, { id: NO_ID }),
];

describe('API · Short links and their click data by role', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('SL-01 CITY_ADMIN reads the short links', () => {
    asRole('CITY_ADMIN', (token) => expectTableRead(token, LINKS));
  });

  it('SL-02 ZONAL_ADMIN and SUPPORT_USER are refused the links, the click policy, erasing clicks and deleting', () => {
    expectRolesRefused(REFUSED, [LINKS, ...PRIVACY]);
  });
});
