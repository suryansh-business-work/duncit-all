/// <reference types="cypress" />

/**
 * The live suite's commands. Nothing here stubs GraphQL: `gql` talks to the
 * real API for setup and teardown, `apiLogin` turns a real password into the
 * token the app reads from localStorage, and `interceptOperation` only WATCHES
 * a request so a spec can wait for the server's answer before asserting.
 */

type GqlVariables = Record<string, unknown>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** POST one operation to the real API and yield its `data`. Fails the test on a GraphQL error. */
      gql<T = any>(query: string, variables?: GqlVariables, options?: { token?: string | null }): Chainable<T>;
      /** Sign in through the API and keep the token for the next `visitApp`. */
      apiLogin(email: string, password: string): Chainable<string>;
      /** Forget the API token so the next `visitApp` boots signed out. */
      clearAuth(): Chainable<void>;
      /** `cy.visit` with the splash skipped and the current token applied. */
      visitApp(path: string): Chainable<AUTWindow>;
      /** The form control associated with a `<label>` (label-first field lookup). */
      fieldByLabel(label: string | RegExp): Chainable<JQuery<HTMLElement>>;
      /** Alias the next request carrying this operation so `cy.wait('@Name')` can wait for the real answer. */
      interceptOperation(name: string, match?: (variables: GqlVariables) => boolean, alias?: string): Chainable<void>;
      /** Open a MUI Autocomplete by its label and pick the first option, or the one matching `option`. */
      pickOption(label: string | RegExp, option?: string | RegExp): Chainable<void>;
      /** Open a MUI Select by its field `name` and pick the option whose text matches. */
      selectOption(fieldName: string, option: string | RegExp): Chainable<void>;
      /** Block third-party map/analytics scripts so tests stay offline + fast. */
      blockThirdParty(): Chainable<void>;
      /** The six digits the server handed back in a "Test code: 123456" notice. */
      readTestCode(): Chainable<string>;
    }
  }
}

const TOKEN_KEY = '__liveToken';
const DUID = 'e2e-live-duid';
const TEST_CODE_RE = /Test code:\s*(\d{6})/;

const LOGIN = `mutation Login($input: LoginInput!) {
  login(input: $input) { token user { user_id onboarding_survey_completed } }
}`;

beforeEach(() => {
  // The app opens a notifications EventSource and a socket.io channel. Neither
  // is under test, and both would keep the page re-rendering under a spec.
  cy.intercept({ method: 'GET', url: '**/notifications/stream*' }, { statusCode: 204, body: '' });
  cy.intercept('**/socket.io/**', { statusCode: 204, body: '' });
});

Cypress.Commands.add('gql', (query: string, variables: GqlVariables = {}, options = {}) => {
  const token = options.token === undefined ? Cypress.env(TOKEN_KEY) : options.token;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-duncit-surface': 'MWEB',
    'x-duncit-app': 'mweb',
    'x-duid': DUID,
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const operation = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? 'operation';
  return cy
    .request({ method: 'POST', url: Cypress.env('GRAPHQL_URL'), headers, body: { query, variables }, failOnStatusCode: false })
    .then((res) => {
      const errors = res.body?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        throw new Error(`${operation} failed: ${errors[0].message}`);
      }
      if (res.status !== 200) throw new Error(`${operation} answered HTTP ${res.status}`);
      return res.body.data;
    });
});

Cypress.Commands.add('apiLogin', (email: string, password: string) =>
  cy.gql(LOGIN, { input: { email, password } }, { token: null }).then((data) => {
    const token = data.login.token as string;
    Cypress.env(TOKEN_KEY, token);
    return token;
  }),
);

Cypress.Commands.add('clearAuth', () => {
  Cypress.env(TOKEN_KEY, null);
});

Cypress.Commands.add('visitApp', (path: string) => {
  const token = Cypress.env(TOKEN_KEY) as string | null;
  return cy.visit(path, {
    onBeforeLoad(win) {
      // Skip the boot splash overlay so it never intercepts clicks in tests.
      win.sessionStorage.setItem('duncit_splash_shown', '1');
      win.localStorage.setItem('duncit_duid', DUID);
      if (token) {
        win.localStorage.setItem('token', token);
      } else {
        win.localStorage.removeItem('token');
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

Cypress.Commands.add('interceptOperation', (name: string, match?: (variables: GqlVariables) => boolean, alias?: string) => {
  cy.intercept({ method: 'POST', url: '**/graphql' }, (req) => {
    const body = req.body as { operationName?: string; variables?: GqlVariables } | undefined;
    if (body?.operationName !== name) return;
    if (match && !match(body.variables ?? {})) return;
    req.alias = alias ?? name;
  });
});

Cypress.Commands.add('pickOption', (label: string | RegExp, option?: string | RegExp) => {
  cy.fieldByLabel(label).click();
  const options = cy.get('.MuiAutocomplete-popper [role="option"]');
  if (option === undefined) {
    options.first().click();
  } else {
    options.contains(option).click();
  }
});

Cypress.Commands.add('selectOption', (fieldName: string, option: string | RegExp) => {
  // MUI's Select puts a stable id on its combobox, derived from the field name.
  cy.get(`#mui-component-select-${fieldName}`).click();
  cy.get('[role="listbox"] [role="option"]').contains(option).click();
});

Cypress.Commands.add('blockThirdParty', () => {
  cy.intercept(/maps\.googleapis\.com|google-analytics|googletagmanager/, (req) => {
    req.reply({ statusCode: 200, headers: { 'content-type': 'application/javascript' }, body: '' });
  });
});

Cypress.Commands.add('readTestCode', () =>
  cy
    .contains(TEST_CODE_RE)
    .invoke('text')
    .then((text) => {
      const code = TEST_CODE_RE.exec(text)?.[1];
      expect(code, 'the server handed back a test code').to.be.a('string');
      return code as string;
    }),
);

export {};
