/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';
import { rest } from '../../../support/api-other';

/**
 * Every portal table's "GET API", GET /table-api/:tableQueryName
 * (server/src/modules/platform/tableApi). The personal token (`dtt_…`, query
 * `token` or header `x-table-api-token`) runs the read through Apollo AS its
 * owner, so the resolver's own role check still decides; only `<name>Table`
 * Query fields are runnable. Scenario map: Other › Table GET API.
 *
 * The run account issues its own token (rotateMyTableApiToken — any signed-in
 * account may), reads with it, and revokes it at the end. Requests carrying it
 * are never logged (support/api-other.ts `rest`).
 */

const UNAUTHENTICATED = {
  error: 'UNAUTHENTICATED',
  message: 'Send your table API token as ?token= or the x-table-api-token header. Generate it in Tech → Table API → Settings.',
};
const ROTATE = 'mutation E2eRotateTableToken { rotateMyTableApiToken { token } }';
const REVOKE = 'mutation E2eRevokeTableToken { revokeMyTableApiToken { token } }';

interface TablePage {
  table: string;
  page: number;
  total: number;
  total_pages: number;
  next_page_url: string | null;
  previous_page_url: string | null;
  rows: unknown[];
}

const expectUnauthenticated = (init: { qs?: Record<string, string>; headers?: Record<string, string> }) =>
  rest('GET', '/table-api/myVenuesTable', init).then((res) => {
    expect(res.status).to.equal(401);
    expect(res.body).to.deep.equal(UNAUTHENTICATED);
  });

describe('API · Table GET API runs as its owner and nothing more', { testIsolation: false }, () => {
  let memberToken = '';
  let tableToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      cy.gql<{ rotateMyTableApiToken: { token: string } }>(ROTATE, {}, { token }).then((data) => {
        tableToken = data.rotateMyTableApiToken.token;
        expect(tableToken.startsWith('dtt_'), 'a table API token').to.equal(true);
      });
    });
  });

  it('TA-01 no token, a token of the wrong shape and an unknown token are 401', () => {
    expectUnauthenticated({});
    expectUnauthenticated({ qs: { token: 'e2e-not-a-token' } });
    expectUnauthenticated({ headers: { 'x-table-api-token': `dtt_${'0'.repeat(64)}` } });
  });

  it("TA-02 the owner's token reads a table the owner may see — their own, empty, venues", () => {
    rest<TablePage>('GET', '/table-api/myVenuesTable', { qs: { token: tableToken } }).then((res) => {
      expect(res.status).to.equal(200);
      expect(res.headers['cache-control']).to.equal('no-store, max-age=0');
      expect(res.body.table).to.equal('myVenuesTable');
      expect(res.body.page).to.equal(1);
      // The run account owns no venue, so the page is empty and leads nowhere.
      expect(res.body.total).to.equal(0);
      expect(res.body.rows).to.deep.equal([]);
      expect(res.body.next_page_url).to.be.null;
      expect(res.body.previous_page_url).to.be.null;
    });
  });

  it('TA-03 the header carries the token as well as the query string', () => {
    rest<TablePage>('GET', '/table-api/myVenuesTable', { headers: { 'x-table-api-token': tableToken } }).then((res) => {
      expect(res.status).to.equal(200);
      expect(res.body.table).to.equal('myVenuesTable');
    });
  });

  it("TA-04 a staff table refuses the member's token with the resolver's own 403", () => {
    rest('GET', '/table-api/paymentsTable', { qs: { token: tableToken } }).then((res) => {
      expect(res.status).to.equal(403);
      expect(res.body).to.deep.equal({ error: 'FORBIDDEN', message: 'Access Denied' });
    });
  });

  it('TA-05 mutations and non-table fields are not runnable', () => {
    ['deletePod', 'signOutEverywhere', 'me'].forEach((name) => {
      rest('GET', `/table-api/${name}`, { qs: { token: tableToken } }).then((res) => {
        expect(res.status, name).to.equal(404);
        expect(res.body, name).to.deep.equal({ error: 'NOT_FOUND', message: `"${name}" is not a table query.` });
      });
    });
  });

  it('TA-06 a revoked token stops working at once', () => {
    cy.gql<{ revokeMyTableApiToken: { token: string | null } }>(REVOKE, {}, { token: memberToken }).then((data) => {
      expect(data.revokeMyTableApiToken.token).to.be.null;
    });
    expectUnauthenticated({ qs: { token: tableToken } });
  });
});
