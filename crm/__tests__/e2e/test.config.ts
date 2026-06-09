/**
 * Hardcoded URL map for cypress runs. Pick the environment via
 *
 *   CYPRESS_ENV=local      pnpm test:e2e   (default — uses vite preview + mocks)
 *   CYPRESS_ENV=production pnpm test:e2e   (smoke-test the deployed app)
 *
 * Local runs intercept GraphQL via `cy.mockGraphql` regardless of which URL
 * the app would otherwise hit, but the URL is hard-coded here so it shows
 * up plainly in test logs and stays stable across environments. The
 * production block exists so the same suite can run against the deployed
 * CRM without any code edits — just an env var.
 */

export interface TestEnvConfig {
  /** App entrypoint Cypress should `cy.visit('/')` against (baseUrl). */
  appUrl: string;
  /** GraphQL endpoint the bundled app calls. Used by `cy.intercept` matchers. */
  graphqlUrl: string;
  /** True when tests should mock the backend (local). False when running against real prod. */
  useMocks: boolean;
}

export const TEST_ENVIRONMENTS: Record<'local' | 'production', TestEnvConfig> = {
  local: {
    appUrl: 'http://localhost:2007',
    graphqlUrl: 'http://localhost:2001/graphql',
    useMocks: true,
  },
  production: {
    appUrl: 'https://crm.duncit.com',
    graphqlUrl: 'https://server.duncit.com/graphql',
    useMocks: false,
  },
};

export type TestEnvKey = keyof typeof TEST_ENVIRONMENTS;

/** Resolve the active environment from `CYPRESS_ENV`. Defaults to `local`. */
export function resolveTestEnv(): TestEnvConfig {
  const key = (process.env.CYPRESS_ENV as TestEnvKey) ?? 'local';
  return TEST_ENVIRONMENTS[key] ?? TEST_ENVIRONMENTS.local;
}

/**
 * Default test credentials. Used by `cy.login()` when no override is passed.
 * Backing user is seeded on the local server and is expected to exist on
 * production for smoke tests. Credentials are read from the environment
 * (`CYPRESS_TEST_EMAIL` / `CYPRESS_TEST_PASSWORD`) so no secret is hard-coded;
 * set them in CI and your local `.env` before running the e2e suite.
 */
export const TEST_USER = {
  email: process.env.CYPRESS_TEST_EMAIL ?? 'admin@duncit.com',
  password: process.env.CYPRESS_TEST_PASSWORD ?? '',
} as const;
