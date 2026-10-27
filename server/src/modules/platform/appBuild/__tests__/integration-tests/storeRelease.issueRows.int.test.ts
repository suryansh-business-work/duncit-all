/**
 * The Releases page decorates each live row with the issue that belongs to it:
 * an OPEN issue wins over a resolved one for the same version and build, and
 * a rejection logged by hand for a version the store no longer lists stays a
 * row of its own. Store readers are mocked; the issue documents are real.
 */
jest.mock('@modules/platform/appBuild/iosSigning.service', () => ({ readAscConfig: jest.fn() }));
jest.mock('@modules/platform/appBuild/playRelease.service', () => ({
  playStoreSettings: jest.fn(),
  requirePlayConfig: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/storeRelease.apple', () => ({ listAppleReleases: jest.fn() }));
jest.mock('@modules/platform/appBuild/storeRelease.play', () => ({ listPlayReleases: jest.fn() }));
jest.mock('@modules/platform/appBuild/storeRelease.advice', () => ({ adviseIssue: jest.fn() }));
jest.mock('@modules/platform/appBuild/storeRelease.notice', () => ({ notifyIssue: jest.fn() }));
jest.mock('@modules/platform/appBuild/appBuild.service', () => ({
  appBuildService: { pushToAppStore: jest.fn(), pushToPlayStore: jest.fn() },
}));

import { AppBuildModel } from '../../appBuild.model';
import { playStoreSettings, requirePlayConfig } from '../../playRelease.service';
import { listPlayReleases } from '../../storeRelease.play';
import { StoreReleaseIssueModel } from '../../storeRelease.model';
import { storeReleases } from '../../storeRelease.service';

const m = (fn: unknown) => fn as jest.Mock;

const playRow = (over: Record<string, unknown> = {}) => ({
  id: 'GOOGLE_PLAY:production:10', store: 'GOOGLE_PLAY', version: '1.0.0', build_number: '10, 11', state: 'production/completed',
  status: 'LIVE', track: 'production', review_state: '', created_at: null, submitted_at: null, rollout_pct: null, store_ref: '1.0.0', ...over,
});

const issue = (over: Record<string, unknown>) =>
  StoreReleaseIssueModel.create({
    store: 'GOOGLE_PLAY', kind: 'REJECTION', source: 'MANUAL', version: '1.0.0', build_number: '10, 11', state: 'MANUAL',
    reviewer_message: 'Policy', store_ref: '1.0.0', dedupe_key: `k-${Math.random()}`, detected_at: new Date('2026-01-01T00:00:00Z'), ...over,
  });

beforeEach(() => {
  m(playStoreSettings).mockResolvedValue({ configured: true, packageName: 'com.duncit.app' });
  m(requirePlayConfig).mockResolvedValue({});
  m(listPlayReleases).mockResolvedValue({ url: 'https://play.google.com/console/', rows: [playRow()] });
});

describe('storeReleases (Google Play) issue rows', () => {
  it('attaches the open issue even when a newer resolved one exists for the same version and build', async () => {
    await issue({ detected_at: new Date('2026-01-01T00:00:00Z'), resolved_at: null });
    await issue({ detected_at: new Date('2026-01-02T00:00:00Z'), resolved_at: new Date('2026-01-03T00:00:00Z'), resolved_reason: 'BY:ops' });
    const page = await storeReleases('GOOGLE_PLAY');
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0].issue).toMatchObject({ version: '1.0.0', resolved_at: null });
  });

  it('keeps the newest issue when both are resolved or both open, and resolves the build number to its build', async () => {
    await AppBuildModel.create({ build_no: 'DUN-BLD-5', platform: 'ANDROID', status: 'SUCCESS', version: '1.0.0', build_number: '10' });
    await issue({ detected_at: new Date('2026-01-02T00:00:00Z'), reviewer_message: 'newest' });
    await issue({ detected_at: new Date('2026-01-01T00:00:00Z'), reviewer_message: 'older' });
    const page = await storeReleases('GOOGLE_PLAY');
    expect(page.rows[0].issue?.reviewer_message).toBe('newest');
    expect(page.rows[0].build_no).toBe('DUN-BLD-5');
  });

  it('lists a hand-logged rejection the store no longer shows as a rejected row of its own', async () => {
    await issue({ version: '0.9.0', build_number: '5', store_ref: '0.9.0', review_state: 'policy' });
    const page = await storeReleases('GOOGLE_PLAY');
    const orphan = page.rows.find((r) => r.version === '0.9.0');
    expect(orphan).toMatchObject({ status: 'REJECTED', state: 'MANUAL', build_no: '', store: 'GOOGLE_PLAY', track: '', review_state: 'policy' });
    expect(orphan?.issue?.reviewer_message).toBe('Policy');
  });

  it('does not list a store-reported issue for a version the store no longer shows', async () => {
    await issue({ version: '0.8.0', build_number: '4', source: 'STORE' });
    const page = await storeReleases('GOOGLE_PLAY');
    expect(page.rows.map((r) => r.version)).toEqual(['1.0.0']);
  });
});
