/// <reference types="cypress" />
import {
  APP_POPUP_DISMISSED_KEY,
  E2E_ONE_TIME_CODE_QUERY,
  E2E_PURGE_MUTATION,
  E2E_TRAFFIC_HEADER,
  E2E_TRAFFIC_KEY_QUERY,
  type E2eCodePurpose,
} from '@duncit/utils';

/**
 * The live suite's commands — the same names and signatures as mWeb's, so the
 * surfaces read alike. Nothing here stubs the app's GraphQL: `gql` talks to the
 * real API, `apiLogin` turns a real password into the token the app reads from
 * its secure storage (localStorage on web), `readOtp` asks the OTP testing API
 * for the code the run account was sent, and `interceptOperation` only WATCHES
 * a request so a spec can wait for the server's answer.
 */

type GqlVariables = Record<string, unknown>;

/** A held code's destination: a mailbox, or a WhatsApp number. */
export interface CodeTarget {
  email?: string;
  phone?: string;
}

/** What a spec may add to a boot: a stand-in for a browser API the page reaches for. */
export interface VisitAppOptions {
  onBeforeLoad?: (win: Cypress.AUTWindow) => void;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** POST one operation to the real API and yield its `data`. A GraphQL error fails the test. */
      gql<T = any>(
        query: string,
        variables?: GqlVariables,
        options?: { token?: string | null },
      ): Chainable<T>;
      /** The same, signed with the staging release token (the OTP testing API and the purge). */
      staffGql<T = any>(query: string, variables?: GqlVariables): Chainable<T>;
      /** Tag every app request with the run's traffic key, so its sign-ins skip the rate limit. */
      useRunTraffic(): Chainable<void>;
      /** When the newest held code for this purpose was issued, or '' when none has been. */
      lastOtpIssuedAt(purpose: E2eCodePurpose, target: CodeTarget): Chainable<string>;
      /** Wait for a held code issued after `after` (from `lastOtpIssuedAt`) and yield it. */
      readOtp(purpose: E2eCodePurpose, target: CodeTarget, after?: string): Chainable<string>;
      /** Remove the run account outright, so its address and phone are free again. */
      purgeRunAccount(): Chainable<void>;
      /** Sign in through the API and keep the token for the next `visitApp`. */
      apiLogin(email: string, password: string): Chainable<string>;
      /** Forget the token so the next `visitApp` boots signed out. */
      clearAuth(): Chainable<void>;
      /**
       * `cy.visit` with the current token applied and the marketing popup already closed;
       * `options.onBeforeLoad` then installs whatever stand-in the scenario needs.
       */
      visitApp(path: string, options?: VisitAppOptions): Chainable<AUTWindow>;
      /** Alias the next request carrying this operation so `cy.wait('@Name')` waits for the real answer. */
      interceptOperation(name: string, alias?: string): Chainable<void>;
      /** An element by the app's `testID` (react-native-web renders it as `data-testid`). */
      byTestId(
        testId: string,
        options?: Partial<Cypress.Timeoutable & Cypress.Loggable>,
      ): Chainable<JQuery<HTMLElement>>;
      /**
       * Every element whose `data-testid` starts with `prefix` (and ends with `suffix`), in page
       * order — for rows keyed by an id the spec cannot know (`chip-<categoryId>`).
       */
      byTestIdPrefix(prefix: string, suffix?: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

/** Where the app keeps its session: `src/services/auth-token.ts` over `secure-storage.web.ts`. */
export const APP_TOKEN_KEY = 'duncit.auth.token';

const TOKEN_KEY = '__liveToken';
const TRAFFIC_KEY = '__trafficKey';
const DUID = 'e2e-live-duid';
/** `DUID_STORAGE_KEY` in @duncit/user-core, which the app reads through secure storage. */
const DUID_KEY = 'duncit_duid';
const OTP_POLL_MS = 1000;
const OTP_POLL_TRIES = 30;

const graphqlUrl = (): string => String(Cypress.env('GRAPHQL_URL'));

function post<T>(
  query: string,
  variables: GqlVariables,
  token: string | null,
): Cypress.Chainable<T> {
  // The headers `src/services/graphql.client.ts` sends from the app.
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-duncit-surface': 'NATIVE',
    'x-duncit-app': 'native',
    'x-duid': DUID,
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const traffic = Cypress.env(TRAFFIC_KEY) as string | undefined;
  if (traffic) headers[E2E_TRAFFIC_HEADER] = traffic;
  const operation = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? 'operation';
  // log: false — the staff token must never appear in the command log or the video.
  return cy
    .request({
      method: 'POST',
      url: graphqlUrl(),
      headers,
      body: { query, variables },
      failOnStatusCode: false,
      log: false,
    })
    .then((res) => {
      const errors = res.body?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        throw new Error(`${operation} failed: ${errors[0].message}`);
      }
      if (res.status !== 200) throw new Error(`${operation} answered HTTP ${res.status}`);
      return cy.wrap(res.body.data as T, { log: false });
    });
}

Cypress.Commands.add('gql', (query: string, variables: GqlVariables = {}, options = {}) => {
  const token =
    options.token === undefined ? (Cypress.env(TOKEN_KEY) as string | null) : options.token;
  return post(query, variables, token);
});

Cypress.Commands.add('staffGql', (query: string, variables: GqlVariables = {}) => {
  const token = String(Cypress.env('E2E_RELEASE_TOKEN') ?? '');
  if (!token) {
    throw new Error(
      'CYPRESS_E2E_RELEASE_TOKEN is not set: the OTP testing API needs the staging release token.',
    );
  }
  return post(query, variables, token);
});

Cypress.Commands.add('useRunTraffic', () => {
  const tag = (key: string) => {
    cy.intercept({ method: 'POST', url: graphqlUrl() }, (req) => {
      req.headers[E2E_TRAFFIC_HEADER] = key;
    });
  };
  const known = Cypress.env(TRAFFIC_KEY) as string | undefined;
  if (known) {
    tag(known);
    return;
  }
  cy.staffGql<{ e2eTrafficKey: string }>(E2E_TRAFFIC_KEY_QUERY, {
    stamp: Cypress.env('E2E_STAMP'),
  }).then((data) => {
    Cypress.env(TRAFFIC_KEY, data.e2eTrafficKey);
    tag(data.e2eTrafficKey);
  });
});

type HeldCode = { e2eOneTimeCode: { code: string; issued_at: string } | null };

Cypress.Commands.add('lastOtpIssuedAt', (purpose: E2eCodePurpose, target: CodeTarget) =>
  cy
    .staffGql<HeldCode>(E2E_ONE_TIME_CODE_QUERY, { purpose, ...target })
    .then((data) => data.e2eOneTimeCode?.issued_at ?? ''),
);

Cypress.Commands.add('readOtp', (purpose: E2eCodePurpose, target: CodeTarget, after = '') => {
  const attempt = (triesLeft: number): Cypress.Chainable<string> =>
    cy.staffGql<HeldCode>(E2E_ONE_TIME_CODE_QUERY, { purpose, ...target }).then((data) => {
      const held = data.e2eOneTimeCode;
      if (held && held.issued_at !== after) return cy.wrap(held.code, { log: false });
      if (triesLeft <= 0) throw new Error(`No ${purpose} code was held for the run account.`);
      return cy.wait(OTP_POLL_MS, { log: false }).then(() => attempt(triesLeft - 1));
    });
  return attempt(OTP_POLL_TRIES);
});

Cypress.Commands.add('purgeRunAccount', () => {
  cy.staffGql(E2E_PURGE_MUTATION, {
    input: { stamp: Cypress.env('E2E_STAMP'), signup_email: Cypress.env('E2E_SIGNUP_EMAIL') },
  });
});

const LOGIN = `mutation Login($input: LoginInput!) {
  login(input: $input) { token }
}`;

Cypress.Commands.add('apiLogin', (email: string, password: string) =>
  cy
    .gql<{ login: { token: string } }>(LOGIN, { input: { email, password } }, { token: null })
    .then((data) => {
      Cypress.env(TOKEN_KEY, data.login.token);
      return data.login.token;
    }),
);

Cypress.Commands.add('clearAuth', () => {
  Cypress.env(TOKEN_KEY, null);
});

/**
 * The popup the server would open over this account's first screen (App.tsx
 * mounts <AppPopup/> above every route). Closed in advance by writing its id
 * where the app keeps closed popups, so it can never sit over a control a spec
 * presses. `WEB` is what `clientPlatform()` reports for a desktop browser.
 */
const ACTIVE_APP_POPUP = `query ActiveAppPopup($platform: AppPopupClientPlatform!) {
  activeAppPopup(platform: $platform) { id }
}`;

const closedPopups = (token: string | null): Cypress.Chainable<string[]> => {
  if (!token) return cy.wrap<string[]>([], { log: false });
  return cy
    .gql<{ activeAppPopup: { id: string } | null }>(ACTIVE_APP_POPUP, { platform: 'WEB' })
    .then((data) => (data.activeAppPopup ? [data.activeAppPopup.id] : []));
};

Cypress.Commands.add('visitApp', (path: string, options: VisitAppOptions = {}) => {
  const token = Cypress.env(TOKEN_KEY) as string | null;
  return closedPopups(token).then((popupIds) =>
    cy.visit(path, {
      onBeforeLoad(win) {
        // The boot splash (<SplashOverlay/>) is pointer-events: none and fades
        // on its own timer, so it never needs skipping.
        win.localStorage.setItem(DUID_KEY, DUID);
        win.localStorage.setItem(APP_POPUP_DISMISSED_KEY, JSON.stringify(popupIds));
        if (token) {
          win.localStorage.setItem(APP_TOKEN_KEY, token);
        } else {
          win.localStorage.removeItem(APP_TOKEN_KEY);
        }
        options.onBeforeLoad?.(win);
      },
    }),
  );
});

Cypress.Commands.add('interceptOperation', (name: string, alias?: string) => {
  cy.intercept({ method: 'POST', url: graphqlUrl() }, (req) => {
    if ((req.body as { operationName?: string } | undefined)?.operationName === name) {
      req.alias = alias ?? name;
    }
  });
});

Cypress.Commands.add(
  'byTestId',
  (testId: string, options?: Partial<Cypress.Timeoutable & Cypress.Loggable>) =>
    cy.get(`[data-testid="${testId}"]`, options),
);

Cypress.Commands.add('byTestIdPrefix', (prefix: string, suffix = '') => {
  // `$=""` matches nothing in CSS, so the suffix clause only exists when there is one.
  const ends = suffix ? `[data-testid$="${suffix}"]` : '';
  return cy.get(`[data-testid^="${prefix}"]${ends}`);
});

export {};
