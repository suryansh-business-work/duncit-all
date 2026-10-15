jest.mock('@config/runtimeEnv', () => ({
  getRuntimeEnvValue: jest.fn(async () => ''),
}));

import { makeContext } from '@test/harness';
import { mechanicalChangelog, buildChangelog, type ReleaseCommit } from '../../appRelease.changelog';
import { buildReleaseVars } from '../../appRelease.email';
import { appReleaseResolvers } from '../../appRelease.resolver';

const meta = { appName: 'Duncit', version: '1.4.19', rangeLabel: 'since v1.4.18' };

const COMMITS: ReleaseCommit[] = [
  { hash: 'aaaaaaa1', subject: 'feat(auth): add forgot-password flow' },
  { hash: 'bbbbbbb2', subject: 'fix(pod): correct spot count' },
  { hash: 'ccccccc3', subject: 'chore: bump deps' },
  { hash: 'ddddddd4', subject: 'random note without prefix' },
  { hash: 'eeeeeee5', subject: 'Merge pull request #125 from x/y' },
];

describe('appRelease changelog', () => {
  it('groups commits by conventional type and skips merges', () => {
    const cl = mechanicalChangelog(COMMITS, meta);
    const titles = cl.sections.map((s) => s.title);
    expect(titles).toContain('New Features');
    expect(titles).toContain('Fixes');
    expect(titles).toContain('Improvements');
    expect(titles).toContain('Other changes');
    const features = cl.sections.find((s) => s.title === 'New Features');
    expect(features?.items).toEqual(['auth: Add forgot-password flow']);
    // Merge commit is excluded from every bucket.
    expect(JSON.stringify(cl.sections)).not.toContain('Merge pull request');
    expect(cl.intro).toContain('since v1.4.18');
  });

  it('buildChangelog falls back to the mechanical changelog when OpenAI is unconfigured', async () => {
    const cl = await buildChangelog(COMMITS, meta);
    expect(cl).toEqual(mechanicalChangelog(COMMITS, meta));
  });

  it('handles an empty commit list', () => {
    const cl = mechanicalChangelog([], meta);
    expect(cl.sections).toEqual([]);
    expect(cl.intro).toContain('0 changes');
  });
});

describe('appRelease template vars', () => {
  const vars = buildReleaseVars({
    version: '1.4.19',
    buildName: 'duncit-18-july-2026-build-1 V1.4.19',
    apkUrl: 'https://ik.imagekit.io/x/app-builds/duncit.apk',
    apkSizeMb: 63.4,
    builtOn: 'Sat, 18 Jul 2026 10:00:00 GMT',
    rangeLabel: 'since v1.4.18',
    changelog: mechanicalChangelog(COMMITS, meta),
    commits: [{ hash: 'aaaaaaa1', subject: '<script>alert(1)</script>' }],
    filesChanged: 12,
    insertions: 340,
    deletions: 88,
  });

  it('fills the version, download link, size and stats', () => {
    expect(vars.version).toBe('1.4.19');
    expect(vars.apk_url).toBe('https://ik.imagekit.io/x/app-builds/duncit.apk');
    expect(vars.apk_size).toBe('63.4 MB');
    expect(vars.files_changed).toBe('12');
    expect(vars.insertions).toBe('+340');
    expect(vars.deletions).toBe('-88');
    expect(vars.commits_count).toBe('1');
  });

  it('escapes commit text so it cannot break the markup', () => {
    expect(vars.commits_html).toContain('&lt;script&gt;');
    expect(vars.commits_html).not.toContain('<script>alert(1)</script>');
  });

  it('shows a dash for stats the pipeline did not report', () => {
    const bare = buildReleaseVars({
      version: '1.4.19',
      buildName: 'b',
      apkUrl: 'u',
      apkSizeMb: 0,
      builtOn: 'now',
      changelog: mechanicalChangelog([], meta),
      commits: [],
    });
    expect(bare.apk_size).toBe('APK');
    expect(bare.files_changed).toBe('—');
    expect(bare.range_label).toBe('—');
    expect(bare.commits_html).toBe('—');
  });
});

describe('appRelease resolver', () => {
  it('is gated to tech/super admin roles', async () => {
    await expect(
      (appReleaseResolvers.Mutation as any).sendAppReleaseEmail(
        {},
        { input: { version: '1', build_name: 'b', apk_url: 'u', apk_size_mb: 1, commits: [] } },
        makeContext({ roles: ['USER'] })
      )
    ).rejects.toThrow(/access denied/i);
  });
});
