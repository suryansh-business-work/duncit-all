import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBranding, fetchNavGroups, fetchPolicies, type SiteNavGroup } from './site-data';

interface FakeResponse {
  ok: boolean;
  json: () => Promise<unknown>;
}

const ok = (data: unknown, errors?: unknown[]): FakeResponse => ({
  ok: true,
  json: async () => ({ data, errors }),
});

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchBranding', () => {
  it('merges the remote branding over the bundled fallback', async () => {
    fetchMock.mockResolvedValue(ok({ branding: { app_name: 'Earn', support_phone: '123' } }));
    const branding = await fetchBranding();
    expect(branding.app_name).toBe('Earn');
    expect(branding.support_phone).toBe('123');
    expect(branding.support_email).toBe('support@duncit.com');
  });

  it('returns the fallback when the request is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    expect((await fetchBranding()).app_name).toBe('Duncit');
  });

  it('returns the fallback when the network throws', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    expect((await fetchBranding()).app_name).toBe('Duncit');
  });

  it('returns the fallback when the response carries GraphQL errors', async () => {
    fetchMock.mockResolvedValue(ok(null, [{ message: 'boom' }]));
    expect((await fetchBranding()).app_name).toBe('Duncit');
  });
});

describe('fetchPolicies', () => {
  it('returns the policies from the API', async () => {
    fetchMock.mockResolvedValue(ok({ publicPolicies: [{ id: 'p1', slug: 'terms', title: 'Terms' }] }));
    await expect(fetchPolicies()).resolves.toEqual([{ id: 'p1', slug: 'terms', title: 'Terms' }]);
  });

  it('returns an empty list when there is no data', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(fetchPolicies()).resolves.toEqual([]);
  });

  it('tolerates an empty errors array', async () => {
    fetchMock.mockResolvedValue(ok({ publicPolicies: [] }, []));
    await expect(fetchPolicies()).resolves.toEqual([]);
  });
});

describe('fetchNavGroups', () => {
  const fallback: SiteNavGroup[] = [{ label: 'Fallback', links: [] }];

  it('queries with this site and groups the links for the area', async () => {
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

    const groups = await fetchNavGroups('HEADER', fallback);
    expect(groups.map((group) => group.label)).toEqual(['Product', 'More']);
    expect(groups[0].links.map((link) => link.id)).toEqual(['1', '2']);
    expect(groups[1].links.map((link) => link.id)).toEqual(['3']);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.variables.site).toBe('EARNWITH');
  });

  it('falls back when no links match the requested area', async () => {
    fetchMock.mockResolvedValue(
      ok({
        publicWebsiteNav: [
          { id: '1', area: 'HEADER', group_label: 'Product', label: 'A', url: '/a', sort_order: 1 },
        ],
      }),
    );
    await expect(fetchNavGroups('FOOTER', fallback)).resolves.toBe(fallback);
  });

  it('falls back when the request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(fetchNavGroups('HEADER', fallback)).resolves.toBe(fallback);
  });
});
