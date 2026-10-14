/// <reference types="cypress" />
import { ACCESS_DENIED, expectRefused, revokeRunRoles, signInRunAs, signInRunMember } from '../../../support/access-steps';
import { CALLS, expectRead } from '../../../support/api-staff';

/**
 * Portal shell › Session, boot and access gates — "Role revoked during a
 * session". The shell re-reads `me` on boot and drops the token when the
 * console role is gone; the server must refuse that token as well.
 */

const ME_ROLES = `query E2eSessionMeRoles { me { roles } }`;

describe('API · A revoked staff role during a session', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(['CITY_ADMIN']);
  });

  it('SB-01 once the role is revoked, `me` on the same session no longer lists it, which is what the shell checks on boot', () => {
    signInRunAs(['CITY_ADMIN']).then((token) => {
      revokeRunRoles(['CITY_ADMIN']);
      cy.gql<{ me: { roles: string[] } }>(ME_ROLES, {}, { token }).then((data) => {
        expect(data.me.roles, 'roles the shell sees after the revoke').to.deep.equal(['USER']);
      });
    });
  });

  // The context runs each request with the token's roles cut down to the ones the
  // account still holds (server access/auth/current-roles.ts), and the revoke drops
  // the cached set as it commits — so the very next request is refused, no wait.
  it('SB-02 a token issued before the revoke is refused the staff operation the role allowed', () => {
    signInRunAs(['CITY_ADMIN']).then((token) => {
      expectRead(token, CALLS.dashboardTotals);
      revokeRunRoles(['CITY_ADMIN']);
      cy.gqlRaw(CALLS.dashboardTotals.query, {}, { token }).then((body) =>
        expectRefused(CALLS.dashboardTotals.field, body, ACCESS_DENIED),
      );
      // Only the role stopped: the same token is still a signed-in member.
      cy.gql<{ me: { roles: string[] } }>(ME_ROLES, {}, { token }).then((data) => {
        expect(data.me.roles, 'the session outlives the revoked role').to.deep.equal(['USER']);
      });
    });
  });
});
