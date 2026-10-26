/**
 * The release notes when OpenAI is on the line: what it is asked, what is done
 * with an answer that is not the shape the email renders, and the plain notes
 * that ship regardless. Singular and plural wording and the optional range
 * label are pinned too, since they end up in front of the whole team.
 */
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { buildChangelog, mechanicalChangelog, type Changelog, type ReleaseCommit } from '../../appRelease.changelog';

jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));

const chat = openaiChat as jest.Mock;
const prompt = resolvePrompt as jest.Mock;
const meta = { appName: 'Duncit', version: '1.4.19', rangeLabel: 'since v1.4.18' };
const commits: ReleaseCommit[] = [
  { hash: 'a1', subject: 'feat(auth): add forgot-password flow', body: 'Lets people  reset\nthemselves.\n' + 'x'.repeat(300) },
  { hash: 'b2', subject: 'fix: spot count' },
  { hash: 'c3', subject: 'Merge pull request #1 from x/y' },
];
const good: Changelog = { headline: 'Hello', intro: 'Intro', sections: [{ title: 'New', items: ['One'] }] };

beforeEach(() => {
  jest.resetAllMocks();
  prompt.mockImplementation(async (key: string) => ({ content: `prompt:${key}`, model: 'm-1' }));
});

describe('mechanicalChangelog wording', () => {
  it('says "change" for one and "changes" for several, counting merges out', () => {
    expect(mechanicalChangelog([commits[1]], meta).intro).toBe('This build bundles 1 change (since v1.4.18). Highlights below.');
    expect(mechanicalChangelog(commits, meta).intro).toBe('This build bundles 2 changes (since v1.4.18). Highlights below.');
  });

  it('leaves the range out when none is given', () => {
    expect(mechanicalChangelog([commits[1]], { appName: 'Duncit', version: '1.0.0' }).intro).toBe('This build bundles 1 change. Highlights below.');
    expect(mechanicalChangelog([commits[1]], { appName: 'Duncit', version: '1.0.0', rangeLabel: null }).headline).toBe('Duncit 1.0.0 is ready to test');
  });

  it('orders sections as features, fixes, performance, improvements, then the rest', () => {
    const titles = mechanicalChangelog(
      [
        { hash: '1', subject: 'something odd' },
        { hash: '2', subject: 'perf: faster' },
        { hash: '3', subject: 'chore: tidy' },
        { hash: '4', subject: 'fix: a' },
        { hash: '5', subject: 'feat: b' },
      ],
      meta,
    ).sections.map((s) => s.title);
    expect(titles).toEqual(['New Features', 'Fixes', 'Performance', 'Improvements', 'Other changes']);
  });
});

describe('buildChangelog with OpenAI', () => {
  it('asks with the commits (merges dropped, bodies flattened and cut) and returns a well-formed answer as is', async () => {
    chat.mockResolvedValue({ ok: true, content: JSON.stringify(good) });
    await expect(buildChangelog(commits, meta)).resolves.toEqual(good);
    const user = prompt.mock.calls.find((c) => c[0] === 'release.changelog.user');
    expect(user[1]).toMatchObject({ app_name: 'Duncit', version: '1.4.19', range: 'since v1.4.18' });
    expect(user[1].commits).toContain('- feat(auth): add forgot-password flow\n    Lets people reset themselves.');
    expect(user[1].commits).toContain('- fix: spot count');
    expect(user[1].commits).not.toContain('Merge pull request');
    expect(user[1].commits.split('\n')[1].trim().length).toBeLessThanOrEqual(200);
    expect(chat.mock.calls[0][0]).toMatchObject({ task: 'platform.release_notes', detail: '1.4.19', model: 'm-1', json: true });
  });

  it('describes the range as "recent commits" when there is none', async () => {
    chat.mockResolvedValue({ ok: true, content: JSON.stringify(good) });
    await buildChangelog(commits, { appName: 'Duncit', version: '1.0.0' });
    expect(prompt.mock.calls.find((c) => c[0] === 'release.changelog.user')[1].range).toBe('recent commits');
  });

  it('does not bother OpenAI when there are no commits', async () => {
    await expect(buildChangelog([], meta)).resolves.toEqual(mechanicalChangelog([], meta));
    expect(chat).not.toHaveBeenCalled();
  });

  it('ships the plain notes when OpenAI is not configured, errors or answers with something that is not JSON', async () => {
    const plain = mechanicalChangelog(commits, meta);
    chat.mockResolvedValueOnce({ ok: false, message: 'not configured' });
    await expect(buildChangelog(commits, meta)).resolves.toEqual(plain);
    chat.mockRejectedValueOnce(new Error('timeout'));
    await expect(buildChangelog(commits, meta)).resolves.toEqual(plain);
    chat.mockResolvedValueOnce({ ok: true, content: 'Sure! Here are your notes' });
    await expect(buildChangelog(commits, meta)).resolves.toEqual(plain);
  });

  it.each([
    ['null', 'null'],
    ['a string', '"hello"'],
    ['a list', '[1,2]'],
    ['no headline', JSON.stringify({ intro: 'i', sections: [] })],
    ['a headline that is not text', JSON.stringify({ headline: 1, intro: 'i', sections: [] })],
    ['no intro', JSON.stringify({ headline: 'h', sections: [] })],
    ['sections that are not a list', JSON.stringify({ headline: 'h', intro: 'i', sections: 'none' })],
    ['a section with no title', JSON.stringify({ headline: 'h', intro: 'i', sections: [{ items: [] }] })],
    ['a section with no items', JSON.stringify({ headline: 'h', intro: 'i', sections: [{ title: 't' }] })],
    ['a section that is null', JSON.stringify({ headline: 'h', intro: 'i', sections: [null] })],
  ])('refuses an answer that is %s and ships the plain notes instead', async (_label, content) => {
    chat.mockResolvedValue({ ok: true, content });
    await expect(buildChangelog(commits, meta)).resolves.toEqual(mechanicalChangelog(commits, meta));
  });

  it('accepts an answer with no sections at all, since an empty list is still the right shape', async () => {
    const empty = { headline: 'h', intro: 'i', sections: [] };
    chat.mockResolvedValue({ ok: true, content: JSON.stringify(empty) });
    await expect(buildChangelog(commits, meta)).resolves.toEqual(empty);
  });
});
