/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';

/**
 * Tech › Table API — every signed-in person can mint a personal token for the
 * table GET API; a URL carrying it runs AS that person, so each table's own
 * role check still decides what it returns (platform/tableApi/tableApi.resolver.ts,
 * tableApi.router.ts). Rotating replaces the token; revoking deletes it.
 * Only the run account's own token is touched. Scenario map: Staff › Table API
 * "Rotate and revoke my table API token".
 */

interface Access {
  token: string | null;
  base_url: string;
}

const ACCESS_FIELDS = 'token base_url';
const MY_ACCESS = `query E2eMyTableApiAccess { myTableApiAccess { ${ACCESS_FIELDS} } }`;
const ROTATE = `mutation E2eRotateTableApiToken { rotateMyTableApiToken { ${ACCESS_FIELDS} } }`;
const REVOKE = `mutation E2eRevokeTableApiToken { revokeMyTableApiToken { ${ACCESS_FIELDS} } }`;

/** The API this suite runs against — never the base URL a server reports, which could name another host. */
const tableUrl = (table: string): string =>
  `${new URL(String(Cypress.env('GRAPHQL_URL'))).origin}/table-api/${table}`;

const getTable = (table: string, token: string) =>
  cy.request<{ error?: string; message?: string }>({
    method: 'GET',
    url: tableUrl(table),
    headers: { 'x-table-api-token': token },
    failOnStatusCode: false,
    log: false,
  });

describe('API · My table API token', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    cy.gql(REVOKE, {}, { token: memberToken });
  });

  it('TA-01 rotating issues a token that runs as its owner: a member is refused a staff table', () => {
    cy.gql<{ rotateMyTableApiToken: Access }>(ROTATE, {}, { token: memberToken }).then(({ rotateMyTableApiToken }) => {
      expect(rotateMyTableApiToken.token, 'issued token').to.match(/^dtt_[0-9a-f]{64}$/);
      expect(rotateMyTableApiToken.base_url, 'where the GET API lives').to.match(/\/table-api$/);
      getTable('rolesTable', String(rotateMyTableApiToken.token)).then((res) => {
        expect(res.status, 'the role check of rolesTable still applies').to.equal(403);
        expect(res.body.error).to.equal('FORBIDDEN');
        expect(res.body.message).to.equal('Access Denied');
      });
    });
  });

  it('TA-02 rotating again retires the previous token; revoking retires the current one', () => {
    cy.gql<{ myTableApiAccess: Access }>(MY_ACCESS, {}, { token: memberToken }).then(({ myTableApiAccess }) => {
      const previous = String(myTableApiAccess.token);
      cy.gql<{ rotateMyTableApiToken: Access }>(ROTATE, {}, { token: memberToken }).then(({ rotateMyTableApiToken }) => {
        const current = String(rotateMyTableApiToken.token);
        expect(current, 'a fresh token').to.not.equal(previous);
        getTable('rolesTable', previous).then((res) => {
          expect(res.status, 'the retired token').to.equal(401);
          expect(res.body.error).to.equal('UNAUTHENTICATED');
        });
        getTable('rolesTable', current).then((res) => expect(res.status, 'the live token').to.equal(403));
        cy.gql<{ revokeMyTableApiToken: Access }>(REVOKE, {}, { token: memberToken }).then(({ revokeMyTableApiToken }) => {
          expect(revokeMyTableApiToken.token, 'no token after a revoke').to.be.null;
        });
        getTable('rolesTable', current).then((res) => expect(res.status, 'the revoked token').to.equal(401));
      });
    });
  });
});
