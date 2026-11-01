/**
 * The AI production line against a real database: ideas → script →
 * storyboard, the captions per network and the recommendation — each one a
 * REEL marketing run with its steps, its API log and its priced cost. Only
 * the AI funnel and the stock library are faked; the prompts are resolved
 * from the real catalogue, the runs and the reels are real rows.
 */
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@modules/platform/upload/upload.service', () => ({ pexelsSearch: jest.fn(), pexelsSearchVideos: jest.fn(), uploadToImagekit: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } } }));
jest.mock('../../reel.media', () => ({
  reelMediaLinks: async () => ({ media: (id: string) => `media:${id}`, thumbnail: (id: string) => `thumb:${id}` }),
}));

import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { openaiChat } from '@services/openai/openai.client';
import { pexelsSearch, pexelsSearchVideos } from '@modules/platform/upload/upload.service';
import { OpenAiModelPriceModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import { SocialPostModel } from '@modules/crm/marketing/social/social.model';
import { SocialScheduledPostModel } from '@modules/crm/marketing/social/social.publish.model';
import { MarketingRunModel } from '@modules/crm/marketing/runs/marketingRun.model';
import { REEL_LIMITS, emptySpec } from '../../reel.edit';
import { ReelProjectModel } from '../../reel.model';
import { reelService } from '../../reel.service';

const chat = openaiChat as jest.Mock;
const photos = pexelsSearch as jest.Mock;
const videos = pexelsSearchVideos as jest.Mock;

const ACTOR = { id: new Types.ObjectId().toHexString(), email: 'reels@duncit.com' };
const USAGE = { prompt_tokens: 1000, completion_tokens: 100, total_tokens: 1100 };
const POSTER = 'https://ik.imagekit.io/duncit/reels/poster.png';
const BAD_INPUT = { extensions: { code: 'BAD_USER_INPUT' } };
const NOT_FOUND = { extensions: { code: 'NOT_FOUND' } };
const UNAVAILABLE = { extensions: { code: 'AI_UNAVAILABLE' } };
const UNREADABLE = { extensions: { code: 'AI_UNREADABLE' } };
const CONCEPT = { title: 'Hosting is easy', hook: 'You already host', angle: 'Three everyday moments' };

const answer = (body: unknown, model = 'claude-test', usage = USAGE) =>
  chat.mockResolvedValueOnce({ ok: true, content: JSON.stringify(body), model, usage });
const userTurn = (call = 0): string => chat.mock.calls[call][0].messages[1].content;

const newReel = (name = 'Jam night recap') => reelService.create({ name }, ACTOR);
const unknownId = () => new Types.ObjectId().toString();
const runOf = (id: string) => MarketingRunModel.findById(id).lean();
const lastRun = () => MarketingRunModel.findOne().sort({ created_at: -1 }).lean();
const stepsOf = (run: Awaited<ReturnType<typeof lastRun>>) => (run?.steps ?? []).map((step) => [step.key, step.status, step.tool]);

const asset = (id: string, kind: string, name: string, duration_ms = 0) => ({ id, kind, source: 'UPLOAD', name, url: POSTER, duration_ms });
const withAssets = (id: string, assets: unknown[]) => ReelProjectModel.updateOne({ _id: id }, { $set: { assets } });
const card = (text: string, duration_ms = 2000) => ({ duration_ms, texts: [{ text }] });
const photo = { id: '77', width: 3000, height: 4500, photographer: 'Asha', src_original: 'https://images.pexels.com/photos/77/o.jpeg', src_large: 'https://images.pexels.com/photos/77/l.jpeg', src_medium: 'https://images.pexels.com/photos/77/m.jpeg' };

beforeEach(() => {
  videos.mockResolvedValue({ videos: [], next_page: null });
  photos.mockResolvedValue({ photos: [], next_page: null });
});

describe('reelProjects — the list', () => {
  const ACCOUNT = new Types.ObjectId().toHexString();
  const WHEN = new Date('2026-10-21T10:00:00Z');
  const CLIP = 'https://ik.imagekit.io/duncit/reels/clip.mp4';
  const target = (platform: string, external_id: string, status = 'PUBLISHED') => ({ account_id: ACCOUNT, platform, status, external_id, permalink: '', published_at: WHEN });

  it('carries the cover, the last validation and the posted numbers for every reel, read in one aggregation', async () => {
    const covered = await newReel('Covered');
    await ReelProjectModel.updateOne(
      { _id: covered.id },
      {
        $set: {
          assets: [asset('p1', 'IMAGE', 'poster.png'), { ...asset('v1', 'VIDEO', 'clip.mp4', 10_000), url: CLIP }],
          spec: { ...emptySpec(), scenes: [{ asset_id: 'p1', duration_ms: 2000 }, { asset_id: 'v1', duration_ms: 3000, transition: 'FADE' }] },
          cover_at_ms: 1600,
          checks: [{ name: 'sound', pass: true, detail: '' }, { name: 'hook', pass: false, detail: '' }],
        },
      }
    );
    const first = await newReel('First frame');
    await ReelProjectModel.updateOne(
      { _id: first.id },
      {
        $set: {
          assets: [{ id: 'd1', kind: 'VIDEO', source: 'DRIVE', name: 'shoot.mov', drive_file_id: 'drive-1', duration_ms: 8000 }],
          spec: { ...emptySpec(), scenes: [card('A card first'), { asset_id: 'd1', duration_ms: 3000 }] },
          checks: [{ name: 'sound', pass: true, detail: '' }],
        },
      }
    );
    const empty = await newReel('Empty');
    await SocialScheduledPostModel.create({ text: 'r', status: 'PARTIAL', reel_project_id: covered.id, targets: [target('INSTAGRAM', 'ig-1'), target('X', 'tw-1'), { ...target('THREADS', '', 'FAILED'), error: 'refused' }] });
    await SocialScheduledPostModel.create({ text: 'again', status: 'PUBLISHED', reel_project_id: covered.id, targets: [target('FACEBOOK', 'fb-1')] });
    await SocialScheduledPostModel.create({ text: 'other reel', status: 'PUBLISHED', reel_project_id: first.id, targets: [target('INSTAGRAM', 'ig-9')] });
    await SocialPostModel.create({ account_id: ACCOUNT, platform: 'INSTAGRAM', external_id: 'ig-1', published_at: WHEN, views: 500, engagement: 13 });
    await SocialPostModel.create({ account_id: ACCOUNT, platform: 'X', external_id: 'tw-1', published_at: WHEN, views: null, engagement: 7 });
    await SocialPostModel.create({ account_id: ACCOUNT, platform: 'INSTAGRAM', external_id: 'ig-9', published_at: WHEN, views: 40 });
    const aggregate = jest.spyOn(SocialScheduledPostModel, 'aggregate');

    const list = await reelService.list();

    expect(aggregate).toHaveBeenCalledTimes(1);
    const byName = Object.fromEntries(list.map((row) => [row.name, row]));
    // 1.6 s is inside the second scene, which arrives half a second early on its fade: the clip's frame.
    // Three networks reached (the refused one is not a post); the X network reports no views and Facebook is not synced yet.
    expect(byName.Covered).toMatchObject({ cover_url: CLIP, last_check_pass: false, posts_count: 3, views: 500, scene_count: 2 });
    // No cover chosen and a card first: the first scene with footage, a Drive frame being a signed link.
    expect(byName['First frame']).toMatchObject({ cover_url: 'thumb:drive-1', last_check_pass: true, posts_count: 1, views: 40 });
    expect(byName.Empty).toMatchObject({ id: empty.id, cover_url: '', last_check_pass: null, posts_count: 0, views: 0 });
    aggregate.mockRestore();
  });

  it('shows the first frame of a reel whose cover moment is before the fade, and nothing for a reel of cards', async () => {
    const reel = await newReel('Early cover');
    await ReelProjectModel.updateOne(
      { _id: reel.id },
      { $set: { assets: [asset('p1', 'IMAGE', 'poster.png'), { ...asset('v1', 'VIDEO', 'clip.mp4', 10_000), url: CLIP }], spec: { ...emptySpec(), scenes: [{ asset_id: 'p1', duration_ms: 2000 }, { asset_id: 'v1', duration_ms: 3000, transition: 'FADE' }] }, cover_at_ms: 1400 } }
    );
    const cards = await newReel('Cards');
    await ReelProjectModel.updateOne({ _id: cards.id }, { $set: { spec: { ...emptySpec(), scenes: [card('One'), card('Two')] }, cover_at_ms: 3000 } });
    const byName = Object.fromEntries((await reelService.list()).map((row) => [row.name, row]));
    expect(byName['Early cover'].cover_url).toBe(POSTER);
    expect(byName.Cards).toMatchObject({ cover_url: '', scene_count: 2 });
  });

  it('asks nothing of the posts when there are no reels', async () => {
    const aggregate = jest.spyOn(SocialScheduledPostModel, 'aggregate');
    await expect(reelService.list()).resolves.toEqual([]);
    expect(aggregate).not.toHaveBeenCalled();
    aggregate.mockRestore();
  });
});

describe('generateReelIdeas', () => {
  it('asks Claude with the brief and the footage, returns the concepts with ids, and records one REEL run with its priced cost', async () => {
    await OpenAiModelPriceModel.create({ model: 'claude-test', input_per_1m: 2, output_per_1m: 10 });
    const reel = await newReel();
    await withAssets(reel.id, [asset('v1', 'VIDEO', 'pickleball.mp4', 14_200), asset('p1', 'IMAGE', 'poster.png')]);
    answer({ concepts: [{ title: 'Hosting is easy', hook: 'You already host', angle: 'A', why: 'W' }, { title: '', hook: 'no title' }, 'junk', { title: 'Second', hook: 'Hook two' }, { title: 'Third', hook: 'Three' }] });

    const result = await reelService.generateIdeas(reel.id, '  Host onboarding  ', 2, ACTOR);

    expect(result.concepts).toEqual([
      { id: expect.stringMatching(/^[\da-f-]{8}$/), title: 'Hosting is easy', hook: 'You already host', angle: 'A', why: 'W' },
      { id: expect.any(String), title: 'Second', hook: 'Hook two', angle: '', why: '' },
    ]);
    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({ task: 'reels.ideas', detail: `reel:${reel.id}`, json: true, model: 'claude-opus-5-5', user_id: ACTOR.id, max_tokens: 3000 })
    );
    expect(userTurn()).toContain('Host onboarding');
    expect(userTurn()).toContain('- VIDEO "pickleball.mp4" 14.2s');
    expect(userTurn()).toContain('- IMAGE "poster.png"');
    expect(userTurn()).toContain('Return 2 concepts.');

    const run = await runOf(result.run_id);
    expect(run).toMatchObject({
      workflow: 'REEL',
      name: 'Reel ideas for "Jam night recap"',
      trigger: 'USER',
      status: 'COMPLETED',
      actor: { kind: 'USER', id: ACTOR.id, email: ACTOR.email },
      links: { reel_id: reel.id },
      // 1000 in at $2/M plus 100 out at $10/M.
      cost: { tokens_in: 1000, tokens_out: 100, amount: 0.003, currency: 'USD' },
    });
    expect(stepsOf(run)).toEqual([['ideas', 'OK', 'reels.ideas']]);
    expect(run?.steps[0]).toMatchObject({ label: '2 concepts', input_summary: 'Host onboarding' });
  });

  it('asks for five concepts by default and never fewer than one or more than ten', async () => {
    const reel = await newReel();
    const many = { concepts: Array.from({ length: 12 }, (_item, index) => ({ title: `T${index}`, hook: `H${index}` })) };
    answer(many);
    answer(many);
    answer(many);
    expect((await reelService.generateIdeas(reel.id, 'brief', null, ACTOR)).concepts).toHaveLength(5);
    expect((await reelService.generateIdeas(reel.id, 'brief', 50, ACTOR)).concepts).toHaveLength(10);
    expect((await reelService.generateIdeas(reel.id, 'brief', 0, ACTOR)).concepts).toHaveLength(1);
    expect(userTurn(0)).toContain('Return 5 concepts.');
    expect(userTurn(1)).toContain('Return 10 concepts.');
    expect(userTurn(2)).toContain('Return 1 concepts.');
    expect(userTurn(0)).toContain('(no footage added yet)');
  });

  it.each([
    ['   ', 'Say what the reel should do.'],
    ['x'.repeat(2001), 'at most 2000 characters'],
  ])('refuses the brief %p before asking anything or opening a run', async (brief, message) => {
    const reel = await newReel();
    await expect(reelService.generateIdeas(reel.id, brief, 5, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining(message) });
    expect(chat).not.toHaveBeenCalled();
    await expect(MarketingRunModel.countDocuments()).resolves.toBe(0);
  });

  it('answers not-found for a reel that is not there', async () => {
    await expect(reelService.generateIdeas(unknownId(), 'brief', 5, ACTOR)).rejects.toMatchObject(NOT_FOUND);
    expect(chat).not.toHaveBeenCalled();
  });

  it('records a refused call as a failed run and surfaces the reason', async () => {
    const reel = await newReel();
    chat.mockResolvedValueOnce({ ok: false, code: 'DISABLED', status: 0, message: 'This AI feature is switched off in the AI portal (AI Features).', model: 'claude-test' });
    await expect(reelService.generateIdeas(reel.id, 'brief', 5, ACTOR)).rejects.toMatchObject({ ...UNAVAILABLE, message: expect.stringContaining('switched off') });
    const run = await lastRun();
    expect(run).toMatchObject({ status: 'FAILED', error: expect.stringContaining('switched off'), cost: { tokens_in: 0, tokens_out: 0, amount: 0 } });
    expect(run?.steps[0]).toMatchObject({ key: 'ideas', status: 'FAILED', error: expect.stringContaining('switched off') });
  });

  it('treats an answer that is not JSON, or holds no usable concept, as unreadable — and still bills its tokens', async () => {
    const reel = await newReel();
    chat.mockResolvedValueOnce({ ok: true, content: 'Sure! Here are some ideas…', model: 'claude-test', usage: USAGE });
    await expect(reelService.generateIdeas(reel.id, 'brief', 5, ACTOR)).rejects.toMatchObject(UNREADABLE);
    expect(await lastRun()).toMatchObject({ status: 'FAILED', cost: { tokens_in: 1000, tokens_out: 100 } });
    answer({ concepts: [{ title: 'no hook' }] });
    await expect(reelService.generateIdeas(reel.id, 'brief', 5, ACTOR)).rejects.toMatchObject(UNREADABLE);
  });
});

describe('generateReelScript', () => {
  it('writes a script inside the reel’s limits and records the run', async () => {
    const reel = await newReel();
    answer({
      hooks: ['Stay', 'Wait', 3],
      scenes: [{ text: 'Line', shot: 'Shot', duration_ms: 100, asset_query: 'dog park' }, { text: 'Two', duration_ms: 4000 }, {}],
      cta: 'Tap Host',
    });
    const result = await reelService.generateScript(reel.id, CONCEPT, 20, 'warm', ACTOR);
    expect(result).toEqual({
      run_id: expect.any(String),
      hooks: ['Stay', 'Wait'],
      scenes: [
        { text: 'Line', shot: 'Shot', duration_ms: REEL_LIMITS.minSceneMs, asset_query: 'dog park' },
        { text: 'Two', shot: '', duration_ms: 4000, asset_query: '' },
      ],
      cta: 'Tap Host',
    });
    expect(chat).toHaveBeenCalledWith(expect.objectContaining({ task: 'reels.script', max_tokens: 4000 }));
    expect(userTurn()).toContain('Title: Hosting is easy\nHook: You already host\nAngle: Three everyday moments');
    expect(userTurn()).toContain('LENGTH: 20 seconds\nTONE: warm');
    const run = await runOf(result.run_id);
    expect(run).toMatchObject({ workflow: 'REEL', name: 'Script "Hosting is easy"', status: 'COMPLETED', links: { reel_id: reel.id } });
    expect(stepsOf(run)).toEqual([['script', 'OK', 'reels.script']]);
    expect(run?.steps[0].label).toBe('20s script');
  });

  it('asks in the brand’s usual tone when none is given', async () => {
    const reel = await newReel();
    answer({ scenes: [{ text: 'Line' }] });
    await reelService.generateScript(reel.id, CONCEPT, 15.6, '  ', ACTOR);
    expect(userTurn()).toContain('LENGTH: 16 seconds\nTONE: the brand’s usual');
  });

  it.each([3, 181, Number.NaN])('refuses a reel of %p seconds', async (length) => {
    const reel = await newReel();
    await expect(reelService.generateScript(reel.id, CONCEPT, length, null, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: 'A reel runs 5 to 180 seconds.' });
    expect(chat).not.toHaveBeenCalled();
  });

  it('refuses a concept without a title or a hook', async () => {
    const reel = await newReel();
    await expect(reelService.generateScript(reel.id, { ...CONCEPT, hook: ' ' }, 20, null, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: 'A concept needs a title and a hook.' });
  });

  it('treats a script with no scenes as unreadable', async () => {
    const reel = await newReel();
    answer({ hooks: ['Stay'], scenes: [], cta: 'Go' });
    await expect(reelService.generateScript(reel.id, CONCEPT, 20, null, ACTOR)).rejects.toMatchObject(UNREADABLE);
    expect(await lastRun()).toMatchObject({ status: 'FAILED' });
  });
});

describe('applyReelStoryboard', () => {
  const SCRIPT = {
    hooks: ['Stay for this'],
    scenes: [
      { text: '', shot: 'Pickleball rally', duration_ms: 2000, asset_query: 'sunday pickleball' },
      { text: 'Our poster', shot: '', duration_ms: 2500, asset_query: 'final poster' },
      { text: 'Golden hour', shot: 'Dogs at sunset', duration_ms: 3000, asset_query: 'dog park sunset' },
      { text: 'See you Sunday', shot: 'A closing card', duration_ms: 2000, asset_query: '' },
    ],
    cta: 'Tap Host on Duncit',
  };

  async function footage() {
    const reel = await newReel();
    await withAssets(reel.id, [asset('v1', 'VIDEO', 'sunday-pickleball.mp4', 14_200), asset('p1', 'IMAGE', 'poster-final.png'), asset('a1', 'AUDIO', 'bed.mp3', 60_000)]);
    return reel;
  }

  it('lays each scene on matching footage, else stock, else a card — and saves it like a chat reply', async () => {
    const reel = await footage();
    photos.mockResolvedValueOnce({ photos: [photo], next_page: null });

    const after = await reelService.applyStoryboard(reel.id, SCRIPT, true, ACTOR);

    const stock = after.assets.find((item) => item.source === 'STOCK');
    expect(stock).toMatchObject({ kind: 'IMAGE', name: 'dog park sunset (stock photo)', url: photo.src_large, licence: expect.stringContaining('Pexels'), attribution: 'Photo by Asha on Pexels', provider_id: '77' });
    expect(after.assets).toHaveLength(4);
    const [one, two, three, four] = after.spec.scenes;
    expect(one).toMatchObject({ asset_id: 'v1', duration_ms: 2000, transition: 'NONE', transition_ms: 0, motion: 'NONE', texts: [expect.objectContaining({ text: 'Stay for this', style: 'SUBTITLE', position: 'BOTTOM' })] });
    expect(two).toMatchObject({ asset_id: 'p1', duration_ms: 2500, transition: 'FADE', transition_ms: 500, motion: 'ZOOM_IN', texts: [expect.objectContaining({ text: 'Our poster' })] });
    expect(three).toMatchObject({ asset_id: stock?.id, duration_ms: 3000, motion: 'ZOOM_IN', texts: [expect.objectContaining({ text: 'Golden hour' })] });
    expect(four).toMatchObject({ asset_id: '', duration_ms: 2000 });
    expect(four.texts.map((text) => [text.text, text.style, text.position])).toEqual([
      ['See you Sunday', 'TITLE', 'CENTER'],
      ['Tap Host on Duncit', 'TITLE', 'CENTER'],
    ]);
    expect(after.messages.at(-1)).toMatchObject({ role: 'ASSISTANT', text: 'Storyboard applied', restorable: true, failed: false, asset_ids: [stock?.id] });
    expect(videos).toHaveBeenCalledTimes(1);
    expect(videos).toHaveBeenCalledWith({ query: 'dog park sunset', page: 1, perPage: 1, orientation: 'portrait' });
    expect(photos).toHaveBeenCalledWith({ query: 'dog park sunset', page: 1, perPage: 1, orientation: 'portrait' });

    const run = await lastRun();
    expect(run).toMatchObject({ workflow: 'REEL', name: 'Storyboard for "Jam night recap" — 4 scenes', status: 'COMPLETED', links: { reel_id: reel.id }, cost: { amount: 0 } });
    expect(stepsOf(run)).toEqual([
      ['match', 'OK', ''],
      ['stock', 'OK', 'pexels.search'],
      ['spec', 'OK', ''],
    ]);
    expect(run?.steps.map((step) => step.output_summary)).toEqual(['2 of 4 matched', '1 found', '4 scenes, 1 cards']);
    expect(run?.api_log).toEqual([expect.objectContaining({ service: 'Pexels', method: 'GET', status: 200, summary: 'dog park sunset → Photo by Asha on Pexels' })]);
    // Stored as the chat stores it: the version can be put back.
    const stored = await ReelProjectModel.findById(reel.id).lean();
    expect(stored?.messages.at(-1)?.spec).toMatchObject({ scenes: expect.any(Array) });
  });

  it('keeps a first scene’s own line over the hook, and does not say the cta twice', async () => {
    const reel = await footage();
    const script = { ...SCRIPT, scenes: [{ ...SCRIPT.scenes[0], text: 'Own line' }, { ...SCRIPT.scenes[3], text: 'Tap Host on Duncit' }] };
    const after = await reelService.applyStoryboard(reel.id, script, false, ACTOR);
    expect(after.spec.scenes[0].texts.map((text) => text.text)).toEqual(['Own line']);
    expect(after.spec.scenes[1].texts.map((text) => text.text)).toEqual(['Tap Host on Duncit']);
  });

  it('with auto_media off, a scene nothing matches is a colour card and the library is never asked', async () => {
    const reel = await footage();
    const after = await reelService.applyStoryboard(reel.id, SCRIPT, null, ACTOR);
    expect(after.spec.scenes.map((scene) => scene.asset_id)).toEqual(['v1', 'p1', '', '']);
    expect(after.spec.scenes[2].texts).toEqual([expect.objectContaining({ text: 'Golden hour', style: 'TITLE', position: 'CENTER' })]);
    expect(after.assets).toHaveLength(3);
    expect(videos).not.toHaveBeenCalled();
    expect(stepsOf(await lastRun())).toEqual([
      ['match', 'OK', ''],
      ['spec', 'OK', ''],
    ]);
  });

  it('keeps the stock it found when one lookup fails, lands the rest on cards, and marks the run partial', async () => {
    const reel = await newReel();
    photos.mockResolvedValueOnce({ photos: [photo], next_page: null });
    videos.mockResolvedValueOnce({ videos: [], next_page: null }).mockRejectedValueOnce(new GraphQLError('Pexels video search failed: rate limited', { extensions: { code: 'UPSTREAM_ERROR' } }));
    const script = { hooks: [], cta: '', scenes: [{ text: 'a', shot: '', duration_ms: 2000, asset_query: 'first query' }, { text: 'b', shot: '', duration_ms: 2000, asset_query: 'second query' }] };

    const after = await reelService.applyStoryboard(reel.id, script, true, ACTOR);

    expect(after.assets).toHaveLength(1);
    expect(after.spec.scenes.map((scene) => scene.asset_id)).toEqual([after.assets[0].id, '']);
    const run = await lastRun();
    expect(run?.status).toBe('PARTIAL');
    expect(run?.steps[1]).toMatchObject({ key: 'stock', status: 'FAILED', error: '1 of 2 stock lookups failed — second query: Pexels video search failed: rate limited' });
    expect(run?.api_log.map((entry) => entry.status)).toEqual([200, 0]);
  });

  it('stops asking once the library says it is not set up', async () => {
    const reel = await newReel();
    videos.mockRejectedValue(new GraphQLError('Pexels is not configured', { extensions: { code: 'CONFIG_ERROR' } }));
    const script = { hooks: [], cta: '', scenes: ['one', 'two', 'three'].map((query) => ({ text: query, shot: '', duration_ms: 2000, asset_query: query })) };
    const after = await reelService.applyStoryboard(reel.id, script, true, ACTOR);
    expect(after.spec.scenes.map((scene) => scene.asset_id)).toEqual(['', '', '']);
    expect(videos).toHaveBeenCalledTimes(1);
    expect((await lastRun())?.status).toBe('PARTIAL');
  });

  it('refuses a script with nothing to lay down, a reel that is gone, and a reel with no room for the stock it would need', async () => {
    await expect(reelService.applyStoryboard(unknownId(), SCRIPT, false, ACTOR)).rejects.toMatchObject(NOT_FOUND);
    const reel = await newReel();
    await expect(reelService.applyStoryboard(reel.id, { hooks: [], scenes: [], cta: '' }, false, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining('no scenes') });
    await withAssets(reel.id, Array.from({ length: 60 }, (_item, index) => asset(`s${index}`, 'IMAGE', `seed-${index}.png`)));
    await expect(reelService.applyStoryboard(reel.id, SCRIPT, true, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining('at most 60') });
    expect(videos).not.toHaveBeenCalled();
    expect((await lastRun())?.status).toBe('FAILED');
  });
});

describe('generateReelVariants', () => {
  async function reelWithLines() {
    const reel = await newReel();
    await ReelProjectModel.updateOne(
      { _id: reel.id },
      {
        $set: {
          spec: { ...emptySpec(), scenes: [card('Line one'), card('Line two', 3000)] },
          variants: [{ platform: 'LINKEDIN', caption: 'old', hashtags: [], title: 'old' }, { platform: 'X', caption: 'stale', hashtags: ['#old'], title: '' }],
        },
      }
    );
    return reel;
  }

  it('writes one variant per network asked for, cleans the hashtags, keeps the others, and records the run', async () => {
    const reel = await reelWithLines();
    answer({
      variants: [
        { platform: 'x', caption: 'Short and sweet', hashtags: ['#duncit', 'duncit', 'Pods', '#Duncit', 7, ''], title: 'T' },
        { platform: 'INSTAGRAM', caption: 'Insta caption', hashtags: ['#a'], title: 't'.repeat(150) },
        { platform: 'FACEBOOK', caption: 'not asked for' },
        { platform: 'X', caption: 'a second one for X' },
        { platform: 'X' },
      ],
    });

    const after = await reelService.generateVariants(reel.id, ['X', 'INSTAGRAM', 'X'], ACTOR);

    expect(after.variants).toEqual([
      { platform: 'LINKEDIN', caption: 'old', hashtags: [], title: 'old' },
      { platform: 'X', caption: 'Short and sweet', hashtags: ['#duncit', '#Pods'], title: 'T' },
      { platform: 'INSTAGRAM', caption: 'Insta caption', hashtags: ['#a'], title: 't'.repeat(100) },
    ]);
    expect(userTurn()).toContain('LINES ON SCREEN:\nLine one\nLine two');
    expect(userTurn()).toContain('REEL: Jam night recap (5.0 s)');
    expect(userTurn()).toContain('X (max 280 characters)\nINSTAGRAM (max 2200 characters)');
    const run = await lastRun();
    expect(run).toMatchObject({ workflow: 'REEL', name: 'Captions for "Jam night recap" on 2 networks', status: 'COMPLETED', links: { reel_id: reel.id } });
    expect(stepsOf(run)).toEqual([['variants', 'OK', 'reels.variants']]);
    expect(run?.steps[0].label).toBe('X, INSTAGRAM');
  });

  it('keeps the caption and its hashtags inside the network’s ceiling — the caption is cut first, then tags are dropped from the end', async () => {
    const reel = await reelWithLines();
    answer({ variants: [{ platform: 'X', caption: 'a'.repeat(300), hashtags: ['#one', '#two'] }, { platform: 'THREADS', caption: 'b'.repeat(495), hashtags: ['#one', '#two'] }] });
    const after = await reelService.generateVariants(reel.id, ['X', 'THREADS'], ACTOR);
    const x = after.variants.find((variant) => variant.platform === 'X');
    const threads = after.variants.find((variant) => variant.platform === 'THREADS');
    expect(x).toMatchObject({ caption: 'a'.repeat(280), hashtags: [] });
    // 495 + " #one" fits in 500; " #two" would not.
    expect(threads).toMatchObject({ caption: 'b'.repeat(495), hashtags: ['#one'] });
  });

  it('refuses no networks, and treats an answer with nothing for the networks asked for as unreadable', async () => {
    const reel = await reelWithLines();
    await expect(reelService.generateVariants(reel.id, [], ACTOR)).rejects.toMatchObject(BAD_INPUT);
    expect(chat).not.toHaveBeenCalled();
    answer({ variants: [{ platform: 'FACEBOOK', caption: 'wrong network' }] });
    await expect(reelService.generateVariants(reel.id, ['X'], ACTOR)).rejects.toMatchObject(UNREADABLE);
    expect((await ReelProjectModel.findById(reel.id).lean())?.variants).toHaveLength(2);
  });
});

describe('recommendNextReel', () => {
  const ACCOUNT = new Types.ObjectId().toHexString();
  const WHEN = new Date('2026-10-20T10:00:00Z');

  it('reads the reel’s numbers and the account’s best recent posts, then returns the run and at most five recommendations', async () => {
    const reel = await newReel();
    await ReelProjectModel.updateOne(
      { _id: reel.id },
      { $set: { spec: { ...emptySpec(), scenes: [card('Stay for this')] }, variants: [{ platform: 'INSTAGRAM', caption: 'Cap', hashtags: ['#a'], title: '' }] } }
    );
    await SocialScheduledPostModel.create({
      text: 'the reel',
      status: 'PUBLISHED',
      reel_project_id: reel.id,
      targets: [{ account_id: ACCOUNT, platform: 'INSTAGRAM', status: 'PUBLISHED', external_id: 'ig-1', permalink: 'https://instagram.com/p/1', published_at: WHEN }],
    });
    await SocialPostModel.create({ account_id: ACCOUNT, platform: 'INSTAGRAM', external_id: 'ig-1', text: 'the reel', published_at: WHEN, likes: 10, comments: 2, shares: 1, views: 500, engagement: 13 });
    await SocialPostModel.create({ account_id: ACCOUNT, platform: 'INSTAGRAM', external_id: 'ig-2', text: 'Saturday pod at Cubbon park', published_at: new Date('2026-10-18T10:00:00Z'), engagement: 40, views: null });
    answer({ recommendations: [...Array.from({ length: 6 }, (_item, index) => ({ title: `Next ${index}`, why: 'because', evidence: '40 vs 13' })), { why: 'no title' }] });

    const result = await reelService.recommendNext(reel.id, ACTOR);

    expect(result.recommendations).toHaveLength(5);
    expect(result.recommendations[0]).toEqual({ title: 'Next 0', why: 'because', evidence: '40 vs 13' });
    const turn = userTurn();
    expect(turn).toContain('HOW IT PERFORMED:\nINSTAGRAM: 500 views · 10 likes · 2 comments · 1 shares · engagement 13');
    expect(turn).toContain('CAPTIONS PER NETWORK:\nINSTAGRAM: Cap #a');
    expect(turn).toContain('LINES ON SCREEN:\nStay for this');
    // Best first, the figure a network does not report shown as a dash.
    expect(turn.indexOf('engagement 40 · views —')).toBeLessThan(turn.indexOf('engagement 13 · views 500'));
    expect(turn).toContain('"Saturday pod at Cubbon park"');
    const run = await runOf(result.run_id);
    expect(run).toMatchObject({ workflow: 'REEL', name: 'What to make after "Jam night recap"', status: 'COMPLETED', links: { reel_id: reel.id } });
    expect(stepsOf(run)).toEqual([
      ['numbers', 'OK', ''],
      ['recommend', 'OK', 'reels.recommend'],
    ]);
  });

  it('says so when the reel has not been posted, no captions were written and nothing is synced', async () => {
    const reel = await newReel();
    answer({ recommendations: [{ title: 'Start with a hook', why: 'w', evidence: 'no numbers yet' }] });
    const result = await reelService.recommendNext(reel.id, ACTOR);
    expect(result.recommendations).toHaveLength(1);
    expect(userTurn()).toContain('(not posted from the studio yet)');
    expect(userTurn()).toContain('(no captions written)');
    expect(userTurn()).toContain('(no posts synced yet)');
    expect(userTurn()).toContain('(no text on screen yet)');
  });

  it('treats an answer with no recommendation as unreadable, and a missing reel as not found', async () => {
    const reel = await newReel();
    answer({ recommendations: [] });
    await expect(reelService.recommendNext(reel.id, ACTOR)).rejects.toMatchObject(UNREADABLE);
    expect((await lastRun())?.status).toBe('FAILED');
    await expect(reelService.recommendNext(unknownId(), ACTOR)).rejects.toMatchObject(NOT_FOUND);
  });
});
