jest.mock('@config/runtimeEnv', () => ({
  getRuntimeEnvValue: jest.fn(async () => ''),
}));

import { makeContext } from '@test/harness';
import { mechanicalChangelog, buildChangelog, type ReleaseCommit } from '../../appRelease.changelog';
import { buildReleaseMjml } from '../../appRelease.mjml';
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
    expect(titles).toContain('✨ New Features');
    expect(titles).toContain('🐛 Fixes');
    expect(titles).toContain('🔧 Improvements');
    expect(titles).toContain('📦 Other changes');
    const features = cl.sections.find((s) => s.title === '✨ New Features');
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

describe('appRelease MJML', () => {
  const mjml = buildReleaseMjml({
    appName: 'Duncit',
    logoUrl: 'https://cdn.example/logo.png',
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

  it('embeds the version, download link and stats', () => {
    expect(mjml).toContain('<mjml>');
    expect(mjml).toContain('v1.4.19');
    expect(mjml).toContain('https://ik.imagekit.io/x/app-builds/duncit.apk');
    expect(mjml).toContain('Download APK');
    expect(mjml).toContain('63.4 MB');
    expect(mjml).toContain('12 files changed');
  });

  it('escapes commit text so it cannot break the markup', () => {
    expect(mjml).toContain('&lt;script&gt;');
    expect(mjml).not.toContain('<script>alert(1)</script>');
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
