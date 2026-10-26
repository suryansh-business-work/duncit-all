/// <reference types="cypress" />
import { firstError, graphqlHttp } from '../../../support/api-other';

/**
 * GraphQL hardening — the transport rules every operation passes before any
 * resolver runs. Scenario map: Other › GraphQL hardening ("Query depth over 10
 * is rejected"), plus the CSRF and GET-mutation refusals Apollo enforces.
 *
 *   depth  server/src/utils/graphqlDepthLimit.ts (MAX_QUERY_DEPTH = 10), wired
 *          as an Apollo validation rule in server/src/index.ts
 *   CSRF   @apollo/server preventCsrf: on by default, not switched off in index.ts
 *   GET    @apollo/server requestPipeline: GET may only carry a query (405)
 *
 * Every probe selects nothing that exists or reads only `__typename`, so even a
 * broken rule could not run a resolver.
 */

const DEPTH_LIMIT = 10;
const depthMessage = (depth: number) =>
  `Query is ${depth} levels deep; the limit is ${DEPTH_LIMIT}. Split it into smaller queries.`;

/** `depth` nested field selections; the field names exist nowhere, so nothing can resolve. */
const nested = (depth: number): string => (depth === 1 ? 'e2eDepth' : `e2eDepth { ${nested(depth - 1)} }`);

const CSRF_PREFIX = 'This operation has been blocked as a potential Cross-Site Request Forgery (CSRF).';
const TYPENAME = 'query E2eTypename { __typename }';

describe('API · GraphQL refuses deep, cross-site and GET-mutation requests', { testIsolation: false }, () => {
  it('GH-01 an operation 11 levels deep fails validation before any resolver runs', () => {
    graphqlHttp({ method: 'POST', body: { query: `query E2eTooDeep { ${nested(DEPTH_LIMIT + 1)} }` } }).then((res) => {
      expect(res.status, 'validation failures are a bad request').to.equal(400);
      const depthError = (res.body.errors ?? []).find((error) => error.message === depthMessage(DEPTH_LIMIT + 1));
      expect(depthError, 'the depth rule names the depth and the limit').to.exist;
      expect(depthError?.extensions?.code).to.equal('GRAPHQL_VALIDATION_FAILED');
      expect(res.body.data, 'nothing executed').to.be.undefined;
    });
  });

  it('GH-02 exactly 10 levels is within the limit (the depth rule stays silent)', () => {
    graphqlHttp({ method: 'POST', body: { query: `query E2eAtLimit { ${nested(DEPTH_LIMIT)} }` } }).then((res) => {
      // The unknown field is still refused by the schema — but not for its depth.
      const messages = (res.body.errors ?? []).map((error) => error.message);
      expect(messages, 'the unknown field is reported').to.not.be.empty;
      expect(messages.filter((message) => message.includes('levels deep'))).to.be.empty;
    });
  });

  it('GH-03 a text/plain POST (a form any site can submit) is refused as a CSRF attempt', () => {
    graphqlHttp({
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ query: TYPENAME }),
    }).then((res) => {
      expect(res.status).to.equal(400);
      const error = firstError(res.body, 'a text/plain POST');
      expect(error.code).to.equal('BAD_REQUEST');
      expect(error.message.startsWith(CSRF_PREFIX), error.message).to.equal(true);
      expect(res.body.data).to.be.undefined;
    });
  });

  it('GH-04 a urlencoded POST is refused the same way', () => {
    graphqlHttp({
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `query=${encodeURIComponent(TYPENAME)}`,
    }).then((res) => {
      expect(res.status).to.equal(400);
      expect(firstError(res.body, 'a urlencoded POST').message.startsWith(CSRF_PREFIX)).to.equal(true);
    });
  });

  it('GH-05 a GET without a preflight header is refused as a CSRF attempt', () => {
    graphqlHttp({ method: 'GET', qs: { query: TYPENAME } }).then((res) => {
      expect(res.status).to.equal(400);
      expect(firstError(res.body, 'a bare GET').message.startsWith(CSRF_PREFIX)).to.equal(true);
    });
  });

  it('GH-06 a GET query with the preflight header is answered (the control for GH-07)', () => {
    graphqlHttp({ method: 'GET', qs: { query: TYPENAME }, headers: { 'apollo-require-preflight': 'true' } }).then(
      (res) => {
        expect(res.status).to.equal(200);
        expect(res.body.errors).to.be.undefined;
        expect(res.body.data).to.deep.equal({ __typename: 'Query' });
      },
    );
  });

  it('GH-07 a mutation sent as GET is refused with 405 and Allow: POST', () => {
    graphqlHttp({
      method: 'GET',
      qs: { query: 'mutation E2eGetMutation { signOutEverywhere }' },
      headers: { 'apollo-require-preflight': 'true' },
    }).then((res) => {
      expect(res.status).to.equal(405);
      expect(res.headers.allow).to.equal('POST');
      expect(firstError(res.body, 'a GET mutation').message).to.equal(
        'GET requests only support query operations, not mutation operations',
      );
      expect(res.body.data).to.be.undefined;
    });
  });
});
