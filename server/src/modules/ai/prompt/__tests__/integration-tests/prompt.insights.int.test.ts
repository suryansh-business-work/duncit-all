import { Types } from 'mongoose';
import { openaiChat } from '@services/openai/openai.client';
import { makeContext } from '@test/harness';
import { aiPromptService } from '../../prompt.service';
import { AiPromptModel } from '../../prompt.model';
import { AiPromptEventModel } from '../../prompt.analytics.model';
import { clampRange, promptAnalytics, recordPromptEvent } from '../../prompt.analytics';
import { contentHash, parseQuality, scorePrompt } from '../../prompt.quality';
import { aiPromptLibraryResolvers } from '../../prompt.library.resolver';

jest.mock('@services/openai/openai.client', () => ({
  ...jest.requireActual('@services/openai/openai.client'),
  openaiChat: jest.fn(),
}));

const mockChat = openaiChat as jest.Mock;
const review = { score: 72, summary: 'Clear task, no output format.', strengths: ['Clear role'], improvements: ['Name the output format'] };
const answer = (body: unknown = review) =>
  mockChat.mockResolvedValue({ ok: true, content: JSON.stringify(body), model: 'gpt-4o-mini', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } });

const manager = () => makeContext({ id: new Types.ObjectId().toString(), roles: ['AI_MANAGER'] });

beforeEach(() => mockChat.mockReset());

describe('prompt analytics', () => {
  it('counts hits by type, platform, source, device and day, with unique visitors', async () => {
    const p = await aiPromptService.create({ name: 'Counted', content: 'Count me.' });
    const staffId = new Types.ObjectId().toString();
    await recordPromptEvent({ promptId: p.id, type: 'DETAIL_VIEW', surface: 'PORTAL', userId: staffId });
    await recordPromptEvent({ promptId: p.id, type: 'PUBLIC_VIEW', surface: 'PUBLIC', visitor: 'a', source: 'newsletter' });
    await recordPromptEvent({ promptId: p.id, type: 'OPEN_IN_PLATFORM', surface: 'PUBLIC', visitor: 'a', platform: 'CHATGPT', referrer: 'https://t.co/x' });
    await recordPromptEvent({ promptId: p.id, type: 'OPEN_IN_PLATFORM', surface: 'PUBLIC', visitor: 'b', platform: 'GROK', userAgent: 'Mozilla/5.0 (Windows NT 10.0)' });

    const stats = await promptAnalytics(p.id, 7);
    expect(stats.range_days).toBe(7);
    expect(stats.total_hits).toBe(4);
    expect(stats.unique_visitors).toBe(3); // a, b and the staff member
    expect(stats.by_type).toEqual([
      { key: 'OPEN_IN_PLATFORM', count: 2 },
      { key: 'DETAIL_VIEW', count: 1 },
      { key: 'PUBLIC_VIEW', count: 1 },
    ]);
    expect(stats.by_platform).toEqual([
      { key: 'CHATGPT', count: 1 },
      { key: 'GROK', count: 1 },
    ]);
    expect(stats.by_source).toEqual(
      expect.arrayContaining([
        { key: 'portal', count: 1 },
        { key: 'newsletter', count: 1 },
        { key: 't.co', count: 1 },
        { key: 'direct', count: 1 },
      ]),
    );
    expect(stats.by_device).toEqual(expect.arrayContaining([{ key: 'desktop', count: 1 }, { key: 'unknown', count: 3 }]));
    expect(stats.by_day).toEqual([{ day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), count: 4 }]);
    expect((await AiPromptModel.findById(p.id).lean())?.stats?.total_hits).toBe(4);
  });

  it('leaves events older than the range out of the totals', async () => {
    const p = await aiPromptService.create({ name: 'Aged', content: 'Old hits.' });
    // Raw insert: the model's timestamps would stamp "now" over an explicit date.
    await AiPromptEventModel.collection.insertOne({
      prompt_id: new Types.ObjectId(p.id),
      type: 'FEED_HIT',
      surface: 'FEED',
      created_at: new Date(Date.now() - 40 * 86_400_000),
    });
    await recordPromptEvent({ promptId: p.id, type: 'FEED_HIT', surface: 'FEED' });
    expect((await promptAnalytics(p.id)).total_hits).toBe(1);
    expect((await promptAnalytics(p.id, 365)).total_hits).toBe(2);
  });

  it('refuses unknown types and ids without writing, and answers an empty report for a bad id', async () => {
    const p = await aiPromptService.create({ name: 'Strict', content: 'x' });
    expect(await recordPromptEvent({ promptId: p.id, type: 'HACK' as never, surface: 'PORTAL' })).toBe(false);
    expect(await recordPromptEvent({ promptId: 'nope', type: 'COPY_PROMPT', surface: 'PORTAL' })).toBe(false);
    expect(await AiPromptEventModel.countDocuments({})).toBe(0);
    expect((await promptAnalytics('nope')).total_hits).toBe(0);
  });

  it('clamps the range to 1-365 days, defaulting to 30', () => {
    expect([clampRange(undefined), clampRange(0), clampRange(-5), clampRange(9999), clampRange(14.7)]).toEqual([30, 30, 1, 365, 14]);
  });
});

describe('prompt quality score', () => {
  it('asks ChatGPT once per body, stores the review, and serves the stored one until the body changes', async () => {
    await aiPromptService.seedDefaults();
    answer();
    const p = await aiPromptService.create({ name: 'Scored', description: 'Greets', content: 'Greet {{name}}.' });

    const first = await scorePrompt(p.id, false, null);
    expect(first).toMatchObject({ score: 72, summary: review.summary, stale: false, model: 'gpt-4o-mini' });
    expect(mockChat).toHaveBeenCalledTimes(1);
    const req = mockChat.mock.calls[0][0];
    expect(req).toMatchObject({ task: 'ai.prompt_quality', json: true });
    expect(req.messages[1].content).toContain('Greet {{name}}.');
    expect(req.messages[1].content).toContain('Description: Greets');

    expect(await scorePrompt(p.id, false, null)).toMatchObject({ score: 72 });
    expect(mockChat).toHaveBeenCalledTimes(1);

    await scorePrompt(p.id, true, null);
    expect(mockChat).toHaveBeenCalledTimes(2);

    await aiPromptService.update(p.id, { content: 'Greet {{name}} warmly.' });
    const stored = (await AiPromptModel.findById(p.id).lean())?.quality;
    expect(stored?.content_hash).toBe(contentHash('Greet {{name}}.'));
    await scorePrompt(p.id, false, null);
    expect(mockChat).toHaveBeenCalledTimes(3);
  });

  it('does not move updated_at or write a version when it stores a review', async () => {
    answer();
    const p = await aiPromptService.create({ name: 'Untouched', content: 'Stay.' });
    const before = await AiPromptModel.findById(p.id).lean();
    await scorePrompt(p.id, false, null);
    const after = await AiPromptModel.findById(p.id).lean();
    expect(after?.updated_at).toEqual(before?.updated_at);
    expect(after?.revision).toBe(before?.revision);
  });

  it('surfaces an OpenAI failure with its code, and a non-JSON answer as AI_INVALID_JSON', async () => {
    const p = await aiPromptService.create({ name: 'Unlucky', content: 'Try.' });
    mockChat.mockResolvedValue({ ok: false, code: 'DISABLED', status: 0, message: 'off', model: '' });
    await expect(scorePrompt(p.id, false, null)).rejects.toMatchObject({ extensions: { code: 'AI_FEATURE_DISABLED' } });
    mockChat.mockResolvedValue({ ok: true, content: 'not json', model: 'm', usage: {} });
    await expect(scorePrompt(p.id, false, null)).rejects.toMatchObject({ extensions: { code: 'AI_INVALID_JSON' } });
    await expect(scorePrompt(new Types.ObjectId().toString(), false, null)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('holds the model to the rubric’s shape', () => {
    expect(parseQuality(JSON.stringify({ score: 140, summary: ' ok ', strengths: ['a', 3, ''], improvements: 'x' }))).toEqual({
      score: 100,
      summary: 'ok',
      strengths: ['a'],
      improvements: [],
    });
    expect(parseQuality(JSON.stringify({ score: -3 }))?.score).toBe(0);
    expect(parseQuality(JSON.stringify({ score: 'high' }))).toBeNull();
    expect(parseQuality('[1]')).toBeNull();
    expect(parseQuality('nope')).toBeNull();
  });
});

describe('aiPromptLibraryResolvers', () => {
  it('keeps every field to SUPER_ADMIN and AI_MANAGER', () => {
    const outsider = makeContext({ roles: ['HOST'] });
    expect(() => aiPromptLibraryResolvers.Query.aiPromptDetail(null, { id: 'x' }, outsider)).toThrow();
    expect(() => aiPromptLibraryResolvers.Mutation.archiveAiPrompt(null, { id: 'x' }, outsider)).toThrow();
  });

  it('records portal interactions as the signed-in staff member, and refuses public-only types', async () => {
    const p = await aiPromptService.create({ name: 'Copied', content: 'Copy me.' });
    const ctx = manager();
    await expect(aiPromptLibraryResolvers.Mutation.recordAiPromptEvent(null, { id: p.id, type: 'COPY_SCRIPT', platform: 'PERPLEXITY' }, ctx)).resolves.toBe(true);
    const [event] = await AiPromptEventModel.find({}).lean();
    expect(event).toMatchObject({ surface: 'PORTAL', source: 'portal', platform: 'PERPLEXITY' });
    expect(String(event.user_id)).toBe(ctx.user?.id);
    expect(() => aiPromptLibraryResolvers.Mutation.recordAiPromptEvent(null, { id: p.id, type: 'PUBLIC_VIEW' }, ctx)).toThrow(/own route/);
  });

  it('shares, scores and reads the detail through the resolvers', async () => {
    answer();
    const p = await aiPromptService.create({ name: 'Wired', content: 'Wire me.' });
    const ctx = manager();
    const share = await aiPromptLibraryResolvers.Mutation.enableAiPromptPublicShare(null, { id: p.id }, ctx);
    expect(share.enabled).toBe(true);
    await aiPromptLibraryResolvers.Mutation.scoreAiPrompt(null, { id: p.id }, ctx);
    const detail = await aiPromptLibraryResolvers.Query.aiPromptDetail(null, { id: p.id }, ctx);
    expect(detail).toMatchObject({ share: { enabled: true }, quality: { score: 72, stale: false } });
    const analytics = await aiPromptLibraryResolvers.Query.aiPromptAnalytics(null, { id: p.id, range_days: 3 }, ctx);
    expect(analytics.range_days).toBe(3);
  });
});
