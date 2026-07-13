import type { Page, Route } from '@playwright/test';

export type GqlData = Record<string, unknown>;
export type GqlFixture = GqlData | ((variables: Record<string, unknown>) => GqlData);
export type GqlFixtures = Record<string, GqlFixture>;

interface GqlBody {
  operationName?: string;
  variables?: Record<string, unknown>;
}

/** GraphQL error payload for a named operation (drives the app's error states). */
export function gqlError(message: string): GqlData {
  return { __error: message };
}

function resolve(fixtures: GqlFixtures, op: GqlBody) {
  const fx = op.operationName ? fixtures[op.operationName] : undefined;
  const data = typeof fx === 'function' ? fx(op.variables ?? {}) : fx;
  if (data && typeof data === 'object' && '__error' in data) {
    return { data: null, errors: [{ message: String((data as { __error: string }).__error) }] };
  }
  // Unmocked operations resolve to empty data — the app's `?? []`/optional
  // chaining guards render the corresponding empty state without crashing.
  return { data: data ?? {} };
}

/**
 * Stub the GraphQL endpoint. Every POST to `**​/graphql` is answered from the
 * `fixtures` map keyed by operationName (value may be a function of variables,
 * or `gqlError(...)` to return a GraphQL error); anything not in the map returns
 * `{ data: {} }`. Handles Apollo's single and batched request bodies.
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
