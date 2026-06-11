import type { Page, Route } from '@playwright/test';

export type GqlData = Record<string, unknown>;
export type GqlFixture = GqlData | ((variables: Record<string, unknown>) => GqlData);
export type GqlFixtures = Record<string, GqlFixture>;

interface GqlBody {
  operationName?: string;
  variables?: Record<string, unknown>;
}

function resolve(fixtures: GqlFixtures, op: GqlBody) {
  const fx = op.operationName ? fixtures[op.operationName] : undefined;
  const data = typeof fx === 'function' ? fx(op.variables ?? {}) : fx;
  // Unmocked operations resolve to empty data — the app's `?? []`/optional
  // chaining guards render the corresponding empty state without crashing.
  return { data: data ?? {} };
}

/**
 * Stub the GraphQL endpoint. Every POST to `**​/graphql` is answered from the
 * `fixtures` map keyed by operationName (value may be a function of variables);
 * anything not in the map returns `{ data: {} }`. Handles Apollo's single and
 * batched request bodies.
 */
export async function mockGraphql(page: Page, fixtures: GqlFixtures): Promise<void> {
  await page.route('**/graphql', async (route: Route) => {
    let payload: GqlBody | GqlBody[] = {};
    try {
      payload = JSON.parse(route.request().postData() || '{}');
    } catch {
      payload = {};
    }
    const body = Array.isArray(payload)
      ? payload.map((op) => resolve(fixtures, op))
      : resolve(fixtures, payload);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

/** Block third-party map/analytics scripts so tests stay offline + fast. */
export async function blockThirdParty(page: Page): Promise<void> {
  await page.route(/maps\.googleapis\.com|google-analytics|googletagmanager/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
}
