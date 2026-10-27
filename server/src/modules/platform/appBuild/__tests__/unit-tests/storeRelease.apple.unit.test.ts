import { listAppleReleases } from '../../storeRelease.apple';
import { asc, ascToken, findApp } from '../../appStoreConnect.gateway';
import { requireAscConfig } from '../../iosSigning.service';

jest.mock('../../appStoreConnect.gateway', () => ({ asc: { get: jest.fn() }, ascToken: jest.fn(), findApp: jest.fn() }));
jest.mock('../../iosSigning.service', () => ({ requireAscConfig: jest.fn() }));

const get = asc.get as jest.Mock;

function arrange(versions: unknown, submissions: unknown) {
  (requireAscConfig as jest.Mock).mockResolvedValue({ creds: { key: 'k' }, bundleId: 'com.duncit.app' });
  (ascToken as jest.Mock).mockReturnValue('jwt');
  (findApp as jest.Mock).mockResolvedValue({ id: 'app1', name: 'Duncit' });
  get.mockImplementation(async (_token: string, path: string) => (path.includes('/reviewSubmissions') ? submissions : versions));
}

describe('listAppleReleases', () => {
  it('fails with Apple-style words when the app is not on App Store Connect', async () => {
    arrange({}, {});
    (findApp as jest.Mock).mockResolvedValue(null);
    await expect(listAppleReleases()).rejects.toThrow('App Store Connect has no app with bundle ID com.duncit.app.');
    expect(findApp).toHaveBeenCalledWith('jwt', 'com.duncit.app');
  });

  it('asks for the versions with their build and the submissions with their items', async () => {
    arrange({}, {});
    await listAppleReleases();
    expect(get).toHaveBeenCalledWith('jwt', `/apps/app1/appStoreVersions?${new URLSearchParams({ 'filter[platform]': 'IOS', include: 'build', 'fields[builds]': 'version', limit: '200' })}`);
    expect(get).toHaveBeenCalledWith('jwt', `/reviewSubmissions?${new URLSearchParams({ 'filter[app]': 'app1', 'filter[platform]': 'IOS', include: 'items', limit: '50' })}`);
  });

  it('returns no rows for an app with no versions, tolerating non-list answers', async () => {
    arrange({ data: null, included: 'x' }, { data: 'x', included: null });
    await expect(listAppleReleases()).resolves.toEqual({
      appId: 'app1', appName: 'Duncit', url: 'https://appstoreconnect.apple.com/apps/app1/distribution', rows: [],
    });
  });

  it('joins each version with its build number and its newest review submission, newest version first', async () => {
    arrange(
      {
        data: [
          { id: 'v1', attributes: { versionString: '1.0.0', appVersionState: 'READY_FOR_SALE', createdDate: '2026-01-01T00:00:00Z' }, relationships: { build: { data: { id: 'b1' } } } },
          { id: 'v2', attributes: { versionString: '1.1.0', appStoreState: 'REJECTED', createdDate: '2026-02-01T00:00:00Z' }, relationships: { build: { data: { id: 'b2' } } } },
          { id: 'v3', attributes: { versionString: '1.2.0', createdDate: '' }, relationships: {} },
          { id: 'v4' },
        ],
        included: [
          { type: 'builds', id: 'b1', attributes: { version: '101' } },
          { type: 'builds', id: 'b2', attributes: {} },
          { type: 'apps', id: 'x', attributes: { version: 'ignored' } },
        ],
      },
      {
        data: [
          { id: 's-none0', attributes: {} },
          { id: 's-old', attributes: { state: 'COMPLETE', submittedDate: '2026-01-02T00:00:00Z' }, relationships: { items: { data: [{ id: 'i1' }] } } },
          { id: 's-new', attributes: { state: 'UNRESOLVED_ISSUES', submittedDate: '2026-02-02T00:00:00Z' }, relationships: { items: { data: [{ id: 'i2' }, { id: 'i1' }, { id: 'unknown' }, null] } } },
          { id: 's-none', attributes: {}, relationships: {} },
        ],
        included: [
          { type: 'reviewSubmissionItems', id: 'i1', relationships: { appStoreVersion: { data: { id: 'v1' } } } },
          { type: 'reviewSubmissionItems', id: 'i2', relationships: { appStoreVersion: { data: { id: 'v2' } } } },
          { type: 'reviewSubmissionItems', id: 'i3', relationships: {} },
          { type: 'other', id: 'i4', relationships: { appStoreVersion: { data: { id: 'v3' } } } },
          null,
        ],
      }
    );
    const out = await listAppleReleases();
    expect(out.rows.map((r) => r.store_ref)).toEqual(['v2', 'v1', 'v3', 'v4']);
    expect(out.rows[0]).toMatchObject({
      id: 'APP_STORE:v2', store: 'APP_STORE', version: '1.1.0', build_number: '', state: 'REJECTED', track: '',
      review_state: 'UNRESOLVED_ISSUES', created_at: '2026-02-01T00:00:00Z', submitted_at: '2026-02-02T00:00:00Z', rollout_pct: null,
    });
    // v1 was in the older submission and ALSO the newer one; the newer one wins.
    expect(out.rows[1]).toMatchObject({ build_number: '101', state: 'READY_FOR_SALE', review_state: 'UNRESOLVED_ISSUES', submitted_at: '2026-02-02T00:00:00Z' });
    expect(out.rows[2]).toMatchObject({ version: '1.2.0', state: '', build_number: '', review_state: '', created_at: null, submitted_at: null });
    expect(out.rows[3]).toMatchObject({ version: '', state: '', created_at: null });
  });

  it('keeps a submission with no date and an unknown state as plain text', async () => {
    arrange(
      { data: [{ id: 'v1', attributes: { versionString: '1', createdDate: '2026-01-01T00:00:00Z' }, relationships: {} }], included: [] },
      {
        data: [{ id: 's1', attributes: {}, relationships: { items: { data: [{ id: 'i1' }] } } }],
        included: [{ type: 'reviewSubmissionItems', id: 'i1', relationships: { appStoreVersion: { data: { id: 'v1' } } } }],
      }
    );
    const out = await listAppleReleases();
    expect(out.rows[0]).toMatchObject({ review_state: '', submitted_at: null });
  });
});
