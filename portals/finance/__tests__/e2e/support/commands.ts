/// <reference types="cypress" />

export type GraphQLMockMap = Record<
  string,
  | { data?: unknown; errors?: { message: string; extensions?: Record<string, unknown> }[] }
  | ((variables: Record<string, unknown>) => {
      data?: unknown;
      errors?: { message: string; extensions?: Record<string, unknown> }[];
    })
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mockGraphql(map: GraphQLMockMap): Chainable<void>;
      /**
       * Visit `path` with a session token already in `localStorage`, so
       * `RequireAuth` renders the route instead of bouncing to `/login`.
       * The token is written in `onBeforeLoad` — i.e. BEFORE the app's own
       * scripts run — which is the only point early enough for the route guard
       * to see it (a post-visit `cy.window()` write is too late).
       */
      visitAuthed(path: string, token?: string): Chainable<void>;
    }
  }
}

// Finance stores its auth token at localStorage[`finance_token`] (appConfig).
const TOKEN_KEY = 'finance_token';

function loadCurrentMap(): GraphQLMockMap {
  return (Cypress.env('__gqlMock') as GraphQLMockMap | undefined) ?? {};
}

function saveCurrentMap(map: GraphQLMockMap) {
  Cypress.env('__gqlMock', map);
}

beforeEach(() => {
  Cypress.env('__gqlMock', {});

  // Satisfy the CORS preflight Apollo fires before a cross-origin POST so the
  // OPTIONS never hits the real server.
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

Cypress.Commands.add('mockGraphql', (map: GraphQLMockMap) => {
  const merged: GraphQLMockMap = { ...loadCurrentMap(), ...map };
  saveCurrentMap(merged);

  cy.intercept({ method: 'POST', url: '**/graphql' }, (req) => {
    const body = req.body as { operationName?: string; variables?: Record<string, unknown> };
    const opName = body?.operationName ?? '';
    const current = loadCurrentMap();
    const handler = current[opName];
    if (!handler) {
      req.reply({
        statusCode: 200,
        body: { errors: [{ message: `No mock registered for operation '${opName}'`, extensions: { code: 'TEST_NO_MOCK' } }] },
      });
      return;
    }
    const response = typeof handler === 'function' ? handler(body.variables ?? {}) : handler;
    req.reply({ statusCode: 200, body: response });
  }).as('graphql');
});

Cypress.Commands.add('visitAuthed', (path: string, token = 'cypress-test-token') => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(TOKEN_KEY, token);
    },
  });
});

export {};
