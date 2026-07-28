/// <reference types="cypress" />

export type GqlData = Record<string, unknown>;
export type GqlFixture = GqlData | ((variables: Record<string, unknown>) => GqlData);
export type GqlFixtures = Record<string, GqlFixture>;

interface GqlBody {
  operationName?: string;
  variables?: Record<string, unknown>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Stub the GraphQL endpoint, answering each operation from `fixtures`. */
      mockGraphql(fixtures: GqlFixtures): Chainable<void>;
      /** Visit an app route with the persisted auth token seeded (or cleared). */
      visitApp(path: string, options?: { signedIn?: boolean }): Chainable<void>;
      /** Query by the app's `testID` (react-native-web renders `data-testid`). */
      byTestId(
        testId: string,
        options?: Partial<Timeoutable & Loggable & Withinable>,
      ): Chainable<JQuery<HTMLElement>>;
    }
  }
}

const MOCK_KEY = '__gqlMock';
/** Secure-storage maps to localStorage on web, so the auth store hydrates from it. */
const TOKEN_KEY = 'duncit.auth.token';

function loadFixtures(): GqlFixtures {
  return (Cypress.env(MOCK_KEY) as GqlFixtures | undefined) ?? {};
}

function resolve(fixtures: GqlFixtures, op: GqlBody) {
  const fx = op.operationName ? fixtures[op.operationName] : undefined;
  const data = typeof fx === 'function' ? fx(op.variables ?? {}) : fx;
  // Unmocked operations resolve to empty data — the app's guards render the
  // corresponding empty state instead of crashing.
  return { data: data ?? {} };
}

beforeEach(() => {
  Cypress.env(MOCK_KEY, {});

  // The app posts cross-origin (EXPO_PUBLIC_API_URL), so answer the CORS
  // preflight here too — otherwise the OPTIONS escapes to the real server.
  cy.intercept({ method: 'OPTIONS', url: '**/graphql' }, (req) => {
    req.reply({
      statusCode: 204,
      headers: {
        'access-control-allow-origin': req.headers['origin'] ?? '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,x-duid',
        'access-control-allow-credentials': 'true',
      },
    });
  });
});

Cypress.Commands.add('mockGraphql', (fixtures: GqlFixtures) => {
  // Later calls layer over the beforeEach baseline (a spec may override a
  // single operation), matching how the suite stacked route handlers before.
  Cypress.env(MOCK_KEY, { ...loadFixtures(), ...fixtures });

  cy.intercept({ method: 'POST', url: '**/graphql' }, (req) => {
    const payload = req.body as GqlBody | GqlBody[];
    const current = loadFixtures();
    const body = Array.isArray(payload)
      ? payload.map((op) => resolve(current, op))
      : resolve(current, payload ?? {});
    req.reply({ statusCode: 200, body });
  }).as('graphql');
});

Cypress.Commands.add('visitApp', (path: string, options: { signedIn?: boolean } = {}) => {
  const signedIn = options.signedIn ?? true;
  cy.visit(path, {
    onBeforeLoad(win) {
      if (signedIn) {
        win.localStorage.setItem(TOKEN_KEY, 'e2e-token');
      } else {
        win.localStorage.removeItem(TOKEN_KEY);
      }
    },
  });
});

Cypress.Commands.add(
  'byTestId',
  (
    testId: string,
    options?: Partial<Cypress.Timeoutable & Cypress.Loggable & Cypress.Withinable>,
  ) => cy.get(`[data-testid="${testId}"]`, options),
);

export {};
