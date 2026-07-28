/// <reference types="cypress" />

export type GqlData = Record<string, unknown>;
export type GqlFixture = GqlData | ((variables: Record<string, unknown>) => GqlData);
export type GqlFixtures = Record<string, GqlFixture>;

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

interface GqlBody {
  operationName?: string;
  variables?: Record<string, unknown>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Stub every `**​/graphql` POST from a map keyed by operationName. */
      mockGraphql(fixtures: GqlFixtures): Chainable<void>;
      /** Block third-party map/analytics scripts so tests stay offline + fast. */
      blockThirdParty(): Chainable<void>;
      /** Boot the next `visitApp` signed in (RequireAuth lets authed routes render). */
      seedAuth(): Chainable<void>;
      /** Boot the next `visitApp` signed out (auth screens). */
      clearAuth(): Chainable<void>;
      /** Answer `navigator.geolocation.getCurrentPosition` with these coords. */
      useGeolocation(coords: GeoCoords): Chainable<void>;
      /** `cy.visit` with the splash skipped and the seeded auth/geolocation applied. */
      visitApp(path: string): Chainable<AUTWindow>;
      /** The form control associated with a `<label>` (label-first field lookup). */
      fieldByLabel(label: string | RegExp): Chainable<JQuery<HTMLElement>>;
    }
  }
}

const FIXTURES_KEY = '__gqlFixtures';
const AUTH_KEY = '__authState';
const GEO_KEY = '__geoCoords';

function loadFixtures(): GqlFixtures {
  return (Cypress.env(FIXTURES_KEY) as GqlFixtures | undefined) ?? {};
}

/**
 * Resolve one operation against the fixture map. Unmocked operations resolve to
 * empty data — the app's `?? []` / optional-chaining guards render the
 * corresponding empty state without crashing.
 */
function resolveOperation(fixtures: GqlFixtures, op: GqlBody) {
  const fixture = op.operationName ? fixtures[op.operationName] : undefined;
  const data = typeof fixture === 'function' ? fixture(op.variables ?? {}) : fixture;
  return { data: data ?? {} };
}

function parseBody(raw: unknown): GqlBody | GqlBody[] {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as GqlBody | GqlBody[];
    } catch {
      return {};
    }
  }
  return (raw as GqlBody | GqlBody[]) ?? {};
}

beforeEach(() => {
  Cypress.env(FIXTURES_KEY, {});
  Cypress.env(AUTH_KEY, 'anon');
  Cypress.env(GEO_KEY, undefined);

  // The app opens a notifications EventSource and a socket.io channel against
  // its own origin. The static preview server answers both with index.html, so
  // they reconnect forever and keep re-rendering the page under test. 204 tells
  // EventSource to stop reconnecting; socket.io gets the same dead end.
  cy.intercept({ method: 'GET', url: '**/notifications/stream*' }, { statusCode: 204, body: '' });
  cy.intercept('**/socket.io/**', { statusCode: 204, body: '' });

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

Cypress.Commands.add('mockGraphql', (fixtures: GqlFixtures) => {
  Cypress.env(FIXTURES_KEY, { ...loadFixtures(), ...fixtures });

  // Handles Apollo's single and batched request bodies.
  cy.intercept({ method: 'POST', url: '**/graphql' }, (req) => {
    const payload = parseBody(req.body);
    const current = loadFixtures();
    const body = Array.isArray(payload)
      ? payload.map((op) => resolveOperation(current, op))
      : resolveOperation(current, payload);
    req.reply({ statusCode: 200, body });
  }).as('graphql');
});

Cypress.Commands.add('blockThirdParty', () => {
  cy.intercept(/maps\.googleapis\.com|google-analytics|googletagmanager/, (req) => {
    req.reply({ statusCode: 200, headers: { 'content-type': 'application/javascript' }, body: '' });
  });
});

Cypress.Commands.add('seedAuth', () => {
  Cypress.env(AUTH_KEY, 'authed');
});

Cypress.Commands.add('clearAuth', () => {
  Cypress.env(AUTH_KEY, 'anon');
});

Cypress.Commands.add('useGeolocation', (coords: GeoCoords) => {
  Cypress.env(GEO_KEY, coords);
});

Cypress.Commands.add('visitApp', (path: string) => {
  const authed = Cypress.env(AUTH_KEY) === 'authed';
  const coords = Cypress.env(GEO_KEY) as GeoCoords | undefined;

  return cy.visit(path, {
    onBeforeLoad(win) {
      // Skip the boot splash overlay so it never intercepts clicks in tests.
      win.sessionStorage.setItem('duncit_splash_shown', '1');
      if (authed) {
        win.localStorage.setItem('token', 'e2e-token');
        win.localStorage.setItem('duncit_duid', 'e2e-duid');
      } else {
        win.localStorage.removeItem('token');
      }
      if (coords) {
        cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake(
          (success: PositionCallback) => {
            success({
              coords: {
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: 20,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
                toJSON: () => ({}),
              },
              timestamp: Date.now(),
              toJSON: () => ({}),
            } as GeolocationPosition);
          },
        );
      }
    },
  });
});

Cypress.Commands.add('fieldByLabel', (label: string | RegExp) =>
  cy.contains('label', label).then(($label) => {
    const id = $label.attr('for');
    // MUI ids come from React's useId (`:r1:`) — never usable as a CSS #id.
    expect(id, `label "${String(label)}" is bound to a control`).to.be.a('string').and.not.be.empty;
    return cy.get(`[id="${id}"]`);
  }),
);

export {};
