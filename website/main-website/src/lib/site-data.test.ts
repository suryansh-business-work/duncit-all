import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type SiteNavGroup } from './site-data';
let siteData: typeof import('./site-data');

interface FakeResponse {
  ok: boolean;
  json: () => Promise<unknown>;
}

const ok = (data: unknown, errors?: unknown[]): FakeResponse => ({
  ok: true,
  json: async () => ({ data, errors }),
});

const fetchMock = vi.fn();

/**
 * A FRESH module per test.
 *
 * site-data keeps a module-level `inFlight` map so a static build makes one
 * request per distinct query however many pages ask for it. Left in place
 * between tests it does the same thing to the suite: only the first call per
 * query reaches `fetch`, and every later test reads the first one's answer
 * instead of its own. Resetting the registry is what makes each case actually
 * exercise the code it names.
 */
beforeEach(async () => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  siteData = await import('./site-data');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchBranding', () => {
  it('merges the remote branding over the bundled fallback', async () => {
    fetchMock.mockResolvedValue(ok({ branding: { app_name: 'Duncit Home', support_phone: '123' } }));
    const branding = await siteData.fetchBranding();
    expect(branding.app_name).toBe('Duncit Home');
    expect(branding.support_phone).toBe('123');
    // The default support email comes from the site's url config.
    expect(branding.support_email).toBe('support@duncit.com');
  });

  it('returns the fallback when the request is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    expect((await siteData.fetchBranding()).app_name).toBe('Duncit');
  });

  it('returns the fallback when the network throws', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    expect((await siteData.fetchBranding()).app_name).toBe('Duncit');
  });

  it('returns the fallback when the response carries GraphQL errors', async () => {
    fetchMock.mockResolvedValue(ok(null, [{ message: 'boom' }]));
    expect((await siteData.fetchBranding()).app_name).toBe('Duncit');
  });
});

describe('fetchPolicies', () => {
  it('returns the policies from the API', async () => {
    fetchMock.mockResolvedValue(ok({ publicPolicies: [{ id: 'p1', slug: 'terms', title: 'Terms' }] }));
    await expect(siteData.fetchPolicies()).resolves.toEqual([{ id: 'p1', slug: 'terms', title: 'Terms' }]);
  });

  it('returns an empty list when there is no data', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(siteData.fetchPolicies()).resolves.toEqual([]);
  });

  it('tolerates an empty errors array', async () => {
    fetchMock.mockResolvedValue(ok({ publicPolicies: [] }, []));
    await expect(siteData.fetchPolicies()).resolves.toEqual([]);
  });
});

describe('fetchNavGroups', () => {
  const fallback: SiteNavGroup[] = [{ label: 'Fallback', links: [] }];

  it('queries the given site and groups the links for the area', async () => {
    fetchMock.mockResolvedValue(
      ok({
        publicWebsiteNav: [
          { id: '1', area: 'HEADER', group_label: 'Product', label: 'A', url: '/a', sort_order: 1 },
          { id: '2', area: 'HEADER', group_label: 'Product', label: 'B', url: '/b', sort_order: 2 },
          { id: '3', area: 'HEADER', group_label: '', label: 'C', url: '/c', sort_order: 3 },
          { id: '4', area: 'FOOTER', group_label: 'Legal', label: 'D', url: '/d', sort_order: 4 },
        ],
      }),
    );

    const groups = await siteData.fetchNavGroups('MAIN', 'HEADER', fallback);
    expect(groups.map((group) => group.label)).toEqual(['Product', 'More']);
    expect(groups[0].links.map((link) => link.id)).toEqual(['1', '2']);
    expect(groups[1].links.map((link) => link.id)).toEqual(['3']);

    // The site is a parameter here (this site drives every marketing site's nav).
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.variables.site).toBe('MAIN');
  });

  it('falls back when no links match the requested area', async () => {
    fetchMock.mockResolvedValue(
      ok({
        publicWebsiteNav: [
          { id: '1', area: 'HEADER', group_label: 'Product', label: 'A', url: '/a', sort_order: 1 },
        ],
      }),
    );
    await expect(siteData.fetchNavGroups('PARTNERS', 'FOOTER', fallback)).resolves.toBe(fallback);
  });

  it('falls back when the request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(siteData.fetchNavGroups('ADS', 'HEADER', fallback)).resolves.toBe(fallback);
  });
});

describe('fetchGrievanceOfficer', () => {
  it('returns the officer once they have a name against them', async () => {
    const officer = {
      name: 'Asha Rao',
      email: 'grievance@duncit.com',
      phone: '+91 9876543210',
      address: 'Bengaluru',
    };
    fetchMock.mockResolvedValue(ok({ grievanceOfficer: officer }));

    await expect(siteData.fetchGrievanceOfficer()).resolves.toEqual(officer);
  });

  /**
   * A row exists from the Legal portal's first save, so the record being there
   * is not the same as the officer being published — the name is what says
   * somebody has actually been appointed.
   */
  it('treats a row with no name as nobody appointed yet', async () => {
    fetchMock.mockResolvedValue(
      ok({ grievanceOfficer: { name: '', email: '', phone: '', address: '' } }),
    );

    await expect(siteData.fetchGrievanceOfficer()).resolves.toBeNull();
  });

  it('answers null when the request fails, rather than breaking the build', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    await expect(siteData.fetchGrievanceOfficer()).resolves.toBeNull();
  });
});

describe('the build-time request cache', () => {
  /**
   * A static build renders many pages and every one of them asks for the same
   * branding. Without this they would each POST again — more chances to hit
   * the fetch timeout, and none of them able to return anything new, because a
   * build is a single moment in time.
   */
  it('asks once per distinct query however many pages want the answer', async () => {
    fetchMock.mockResolvedValue(ok({ branding: { app_name: 'Duncit' } }));

    const [first, second] = await Promise.all([
      siteData.fetchBranding(),
      siteData.fetchBranding(),
    ]);
    const third = await siteData.fetchBranding();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it('asks again for the same query with different variables', async () => {
    const fallback: SiteNavGroup[] = [{ label: 'Fallback', links: [] }];
    fetchMock.mockResolvedValue(ok({ publicWebsiteNav: [] }));

    await siteData.fetchNavGroups('MAIN', 'HEADER', fallback);
    await siteData.fetchNavGroups('ADS', 'HEADER', fallback);

    // Keyed on the variables too, or every site would render the first one's nav.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
