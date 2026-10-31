/**
 * Footage beyond Drive, and the finishing steps, against a real database:
 * stock and uploaded assets with their licence, the voiceover and the
 * subtitles (Sarvam and the media store faked, the runs real), validation
 * kept on the project, the cover frame, and the analytics join through the
 * posts the composer stamped with the reel.
 */
jest.mock('@services/servam/servam.service', () => ({ servamService: { tts: jest.fn(), transcribe: jest.fn() } }));
jest.mock('@modules/platform/upload/upload.service', () => ({ pexelsSearch: jest.fn(), pexelsSearchVideos: jest.fn(), uploadToImagekit: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } } }));
jest.mock('../../reel.media', () => ({
  reelMediaLinks: async () => ({ media: (id: string) => `media:${id}`, thumbnail: (id: string) => `thumb:${id}` }),
}));
jest.mock('../../reel.drive', () => ({
  ...jest.requireActual('../../reel.drive'),
  driveAccountEmail: jest.fn(),
  driveFile: jest.fn(),
  driveFolder: jest.fn(),
  driveContent: jest.fn(),
}));

import { Types } from 'mongoose';
import { servamService } from '@services/servam/servam.service';
import { pexelsSearch, uploadToImagekit } from '@modules/platform/upload/upload.service';
import { SocialPostModel } from '@modules/crm/marketing/social/social.model';
import { SocialScheduledPostModel } from '@modules/crm/marketing/social/social.publish.model';
import { MarketingRunModel } from '@modules/crm/marketing/runs/marketingRun.model';
import { driveContent } from '../../reel.drive';
import { emptySpec } from '../../reel.edit';
import { ReelProjectModel } from '../../reel.model';
import { reelService } from '../../reel.service';
import { PEXELS_LICENCE } from '../../reel.stock';
import { VOICE_FOLDER } from '../../reel.voice';

const tts = servamService.tts as jest.Mock;
const transcribe = servamService.transcribe as jest.Mock;
const upload = uploadToImagekit as jest.Mock;
const photos = pexelsSearch as jest.Mock;
const drive = driveContent as jest.Mock;

const ACTOR = { id: new Types.ObjectId().toHexString(), email: 'reels@duncit.com' };
const BAD_INPUT = { extensions: { code: 'BAD_USER_INPUT' } };
const NOT_FOUND = { extensions: { code: 'NOT_FOUND' } };
const UPSTREAM = { extensions: { code: 'UPSTREAM_ERROR' } };
const PHOTO = 'https://images.pexels.com/photos/1/pexels-photo-1.jpeg';
const CLIP = 'https://videos.pexels.com/video-files/2/2-hd.mp4';
const VOICE_URL = 'https://ik.imagekit.io/duncit/marketing/reels/voice/voice-1.wav';
const VIDEO_URL = 'https://ik.imagekit.io/duncit/reels/talk.mp4';

const newReel = (name = 'Jam night recap') => reelService.create({ name }, ACTOR);
const unknownId = () => new Types.ObjectId().toString();
const lastRun = () => MarketingRunModel.findOne().sort({ created_at: -1 }).lean();
const stepsOf = (run: Awaited<ReturnType<typeof lastRun>>) => (run?.steps ?? []).map((step) => [step.key, step.status, step.tool]);
const stock = (provider_id: string, kind = 'IMAGE' as const, url = PHOTO) => ({ provider_id, kind, url, name: `Stock ${provider_id}`, width: 3000, height: 4500, duration_ms: 0, licence: PEXELS_LICENCE, attribution: `Photo by ${provider_id} on Pexels` });
const setSpec = (id: string, spec: unknown) => ReelProjectModel.updateOne({ _id: id }, { $set: { spec } });
const card = (text: string, duration_ms = 2000) => ({ duration_ms, texts: [{ text }] });

/** A canonical 16-bit mono WAV of `seconds` at `rate` Hz. */
function wav(rate: number, seconds: number): Buffer {
  const data = rate * 2 * seconds;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data, 4);
  header.write('WAVEfmt ', 8, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data, 40);
  return Buffer.concat([header, Buffer.alloc(data)]);
}

describe('stock and uploaded footage', () => {
  it('keeps picked stock with its licence line, credit and library id, and adds nothing the reel already holds', async () => {
    const reel = await newReel();
    const added = await reelService.addStockAssets(reel.id, [stock('1'), stock('2', 'VIDEO', CLIP), stock('1')], ACTOR);
    expect(added.assets).toEqual([
      expect.objectContaining({ kind: 'IMAGE', source: 'STOCK', name: 'Stock 1', mime_type: 'image/jpeg', url: PHOTO, thumbnail_url: PHOTO, licence: PEXELS_LICENCE, attribution: 'Photo by 1 on Pexels', provider_id: '1', drive_file_id: '' }),
      expect.objectContaining({ kind: 'VIDEO', source: 'STOCK', mime_type: 'video/mp4', url: CLIP, provider_id: '2' }),
    ]);
    const again = await reelService.addStockAssets(reel.id, [stock('2', 'VIDEO', CLIP), stock('3')], ACTOR);
    expect(again.assets.map((asset) => asset.provider_id)).toEqual(['1', '2', '3']);
    expect((await ReelProjectModel.findById(reel.id).lean())?.updated_by).toBe(ACTOR.email);
  });

  it('refuses stock from elsewhere, stock that is sound, a reel that is gone, and a reel that is full — saving nothing', async () => {
    const reel = await newReel();
    await expect(reelService.addStockAssets(reel.id, [stock('1'), stock('9', 'IMAGE', 'https://ik.imagekit.io/duncit/p.jpeg')], ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining('stock library') });
    await expect(reelService.addStockAssets(reel.id, [stock('1', 'AUDIO' as never)], ACTOR)).rejects.toMatchObject(BAD_INPUT);
    await expect(reelService.addStockAssets(unknownId(), [stock('1')], ACTOR)).rejects.toMatchObject(NOT_FOUND);
    expect((await reelService.get(reel.id))?.assets).toEqual([]);
    await ReelProjectModel.updateOne({ _id: reel.id }, { $set: { assets: Array.from({ length: 60 }, (_item, index) => ({ id: `s${index}`, kind: 'IMAGE', source: 'UPLOAD', url: PHOTO })) } });
    await expect(reelService.addStockAssets(reel.id, [stock('1')], ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining('at most 60') });
  });

  it('adds media-store files with the kind read off the address, or none of them when one is not from the store', async () => {
    const reel = await newReel();
    const added = await reelService.addUploadAssets(
      reel.id,
      [
        { url: 'https://ik.imagekit.io/duncit/reels/clip.mp4', name: 'clip.mp4', size_bytes: 10 },
        { url: 'https://ik.imagekit.io/duncit/reels/poster.png', name: 'poster.png', width: 1080, height: 1920 },
        { url: 'https://ik.imagekit.io/duncit/reels/bed.mp3', name: 'bed.mp3' },
      ],
      ACTOR
    );
    expect(added.assets.map((asset) => [asset.kind, asset.mime_type, asset.source, asset.thumbnail_url])).toEqual([
      ['VIDEO', 'video/mp4', 'UPLOAD', 'https://ik.imagekit.io/duncit/reels/clip.mp4'],
      ['IMAGE', 'image/png', 'UPLOAD', 'https://ik.imagekit.io/duncit/reels/poster.png'],
      ['AUDIO', 'audio/mpeg', 'UPLOAD', ''],
    ]);
    await expect(
      reelService.addUploadAssets(reel.id, [{ url: 'https://ik.imagekit.io/duncit/ok.png', name: 'ok' }, { url: 'https://evil.example/clip.mp4', name: 'no' }], ACTOR)
    ).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining('media store') });
    expect((await reelService.get(reel.id))?.assets).toHaveLength(3);
  });

  it('searches the library through the service', async () => {
    photos.mockResolvedValue({ photos: [{ id: '5', width: 10, height: 20, photographer: 'A', src_large: PHOTO, src_medium: PHOTO, src_original: PHOTO }], next_page: null });
    const page = await reelService.mediaSearch({ query: 'dogs', kind: 'IMAGE' });
    expect(page.items.map((item) => item.provider_id)).toEqual(['5']);
    expect(photos).toHaveBeenCalledWith(expect.objectContaining({ orientation: 'portrait' }));
  });
});

describe('validateReel', () => {
  it('checks the reel against the networks and keeps the result on the project', async () => {
    const reel = await newReel();
    await setSpec(reel.id, { ...emptySpec(), scenes: [card('Stay', 50_000), card('', 50_000)] });
    const checks = await reelService.validate(reel.id, ['INSTAGRAM', 'LINKEDIN']);
    const byName = Object.fromEntries(checks.map((check) => [check.name, check.pass]));
    expect(byName).toEqual({ 'duration:INSTAGRAM': false, 'duration:LINKEDIN': true, 'aspect:INSTAGRAM': true, sound: false, text: true, hook: true, watermark: false });
    expect((await reelService.get(reel.id))?.checks).toEqual(checks);
  });

  it('refuses no networks and a reel that is gone', async () => {
    const reel = await newReel();
    await expect(reelService.validate(reel.id, [])).rejects.toMatchObject(BAD_INPUT);
    await expect(reelService.validate(unknownId(), ['X'])).rejects.toMatchObject(NOT_FOUND);
    expect((await reelService.get(reel.id))?.checks).toEqual([]);
  });
});

describe('setReelCover', () => {
  it('keeps a moment inside the reel, rounded, and refuses one outside it', async () => {
    const reel = await newReel();
    await setSpec(reel.id, { ...emptySpec(), scenes: [card('a', 2000), card('b', 3000)] });
    expect((await reelService.setCover(reel.id, 2500.4, ACTOR)).cover_at_ms).toBe(2500);
    expect((await reelService.setCover(reel.id, 5000, ACTOR)).cover_at_ms).toBe(5000);
    await expect(reelService.setCover(reel.id, 5001, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: 'Pick a moment between 0 and 5000 ms.' });
    await expect(reelService.setCover(reel.id, -1, ACTOR)).rejects.toMatchObject(BAD_INPUT);
    await expect(reelService.setCover(unknownId(), 0, ACTOR)).rejects.toMatchObject(NOT_FOUND);
    expect((await reelService.get(reel.id))?.cover_at_ms).toBe(5000);
  });

  it('starts with no cover frame chosen', async () => {
    expect((await newReel()).cover_at_ms).toBeNull();
  });
});

describe('analytics and the posts a reel went out in', () => {
  const ACCOUNT_A = new Types.ObjectId().toHexString();
  const ACCOUNT_B = new Types.ObjectId().toHexString();
  const WHEN = new Date('2026-10-20T10:00:00Z');

  it('joins every published target to the synced post and sums the numbers; an unsynced network counts as zeros', async () => {
    const reel = await newReel();
    const other = await newReel('Other');
    await SocialScheduledPostModel.create({
      text: 'the reel',
      status: 'PARTIAL',
      reel_project_id: reel.id,
      targets: [
        { account_id: ACCOUNT_A, platform: 'INSTAGRAM', status: 'PUBLISHED', external_id: 'ig-1', permalink: 'https://instagram.com/p/1', published_at: WHEN },
        { account_id: ACCOUNT_B, platform: 'X', status: 'PUBLISHED', external_id: 'tw-1', permalink: '', published_at: WHEN },
        { account_id: ACCOUNT_B, platform: 'THREADS', status: 'FAILED', external_id: '', permalink: '', error: 'refused' },
      ],
    });
    await SocialScheduledPostModel.create({ text: 'again', status: 'PUBLISHED', reel_project_id: reel.id, targets: [{ account_id: ACCOUNT_A, platform: 'FACEBOOK', status: 'PUBLISHED', external_id: 'fb-1', permalink: 'https://fb/1', published_at: WHEN }] });
    await SocialScheduledPostModel.create({ text: 'another reel', status: 'PUBLISHED', reel_project_id: other.id, targets: [{ account_id: ACCOUNT_A, platform: 'INSTAGRAM', status: 'PUBLISHED', external_id: 'ig-9', permalink: 'https://instagram.com/p/9', published_at: WHEN }] });
    await SocialPostModel.create({ account_id: ACCOUNT_A, platform: 'INSTAGRAM', external_id: 'ig-1', published_at: WHEN, likes: 10, comments: 2, shares: 1, views: 500, engagement: 13 });
    await SocialPostModel.create({ account_id: ACCOUNT_B, platform: 'X', external_id: 'tw-1', permalink: 'https://x.com/1', published_at: WHEN, likes: 4, comments: 0, shares: 3, views: null, engagement: 7 });
    await SocialPostModel.create({ account_id: ACCOUNT_A, platform: 'INSTAGRAM', external_id: 'ig-9', published_at: WHEN, likes: 999, engagement: 999 });

    const analytics = await reelService.analytics(reel.id);

    expect(analytics).toEqual({
      posts: [
        { platform: 'INSTAGRAM', permalink: 'https://instagram.com/p/1', published_at: WHEN.toISOString(), views: 500, likes: 10, comments: 2, shares: 1, engagement: 13 },
        // No permalink on the target: the synced post's serves. No views reported: zero.
        { platform: 'X', permalink: 'https://x.com/1', published_at: WHEN.toISOString(), views: 0, likes: 4, comments: 0, shares: 3, engagement: 7 },
        { platform: 'FACEBOOK', permalink: 'https://fb/1', published_at: WHEN.toISOString(), views: 0, likes: 0, comments: 0, shares: 0, engagement: 0 },
      ],
      views: 500,
      likes: 14,
      comments: 2,
      shares: 4,
      engagement: 20,
    });
    expect((await reelService.get(reel.id))?.posts).toEqual([
      expect.objectContaining({ platform: 'INSTAGRAM', permalink: 'https://instagram.com/p/1', published_at: WHEN.toISOString() }),
      expect.objectContaining({ platform: 'X', permalink: '' }),
      expect.objectContaining({ platform: 'FACEBOOK', permalink: 'https://fb/1' }),
    ]);
    expect((await reelService.get(reel.id))?.posts.map((post) => Types.ObjectId.isValid(post.post_id))).toEqual([true, true, true]);
  });

  it('is zeros for a reel never posted, and not found for one that is gone', async () => {
    const reel = await newReel();
    await expect(reelService.analytics(reel.id)).resolves.toEqual({ posts: [], views: 0, likes: 0, comments: 0, shares: 0, engagement: 0 });
    expect(reel.posts).toEqual([]);
    await expect(reelService.analytics(unknownId())).rejects.toMatchObject(NOT_FOUND);
  });
});

describe('generateReelVoiceover', () => {
  const AUDIO = wav(22_050, 1);

  it('speaks the text, keeps the sound in the media store as a GENERATED asset, plays it under the reel, and records the run', async () => {
    const reel = await newReel();
    await setSpec(reel.id, { ...emptySpec(), scenes: [card('Welcome')] });
    tts.mockResolvedValue({ ok: true, message: 'ok', audio: AUDIO, contentType: 'audio/wav' });
    upload.mockResolvedValue({ url: VOICE_URL, fileId: 'f1' });

    const after = await reelService.generateVoiceover(reel.id, '  Welcome to Sunday pods  ', 'anushka', 'en-IN', ACTOR);

    expect(after.assets).toEqual([
      expect.objectContaining({ kind: 'AUDIO', source: 'GENERATED', name: 'Voiceover — Welcome to Sunday pods', mime_type: 'audio/wav', url: VOICE_URL, thumbnail_url: '', duration_ms: 1000, size_bytes: AUDIO.length, licence: '', attribution: '', provider_id: '' }),
    ]);
    expect(after.spec.voiceover).toEqual({ asset_id: after.assets[0].id, volume: 1 });
    expect(after.spec.scenes).toHaveLength(1);
    expect(tts).toHaveBeenCalledWith({ text: 'Welcome to Sunday pods', voice: 'anushka', language: 'en-IN', sample_rate: 22_050 });
    expect(upload).toHaveBeenCalledWith({ fileBytes: AUDIO, fileName: expect.stringMatching(new RegExp(`^voice-${reel.id}-\\d+\\.wav$`)), folder: VOICE_FOLDER, tags: ['reel', 'voiceover'] });
    const run = await lastRun();
    expect(run).toMatchObject({ workflow: 'REEL', name: 'Voiceover for "Jam night recap"', status: 'COMPLETED', links: { reel_id: reel.id }, cost: { amount: 0 } });
    expect(stepsOf(run)).toEqual([
      ['tts', 'OK', 'sarvam.tts'],
      ['upload', 'OK', 'imagekit.upload'],
      ['spec', 'OK', ''],
    ]);
    expect(run?.steps[0]).toMatchObject({ input_summary: 'Welcome to Sunday pods', output_summary: `${AUDIO.length} bytes, 1000 ms` });
    expect(run?.api_log).toEqual([expect.objectContaining({ service: 'Sarvam', method: 'POST', url: 'text-to-speech', status: 200, summary: `${AUDIO.length} bytes` })]);
  });

  it('speaks in the default voice and language when none is given', async () => {
    const reel = await newReel();
    tts.mockResolvedValue({ ok: true, message: 'ok', audio: AUDIO, contentType: 'audio/wav' });
    upload.mockResolvedValue({ url: VOICE_URL, fileId: 'f1' });
    await reelService.generateVoiceover(reel.id, 'Hello', ' ', null, ACTOR);
    expect(tts).toHaveBeenCalledWith({ text: 'Hello', voice: null, language: null, sample_rate: 22_050 });
  });

  it('records a refusal from Sarvam as a failed run, uploads nothing and leaves the reel as it was', async () => {
    const reel = await newReel();
    tts.mockResolvedValue({ ok: false, message: 'Servam AI is not configured. Set SERVAM_AI_API_KEY in the Tech portal.' });
    await expect(reelService.generateVoiceover(reel.id, 'Hello', null, null, ACTOR)).rejects.toMatchObject({ ...UPSTREAM, message: expect.stringContaining('not configured') });
    expect(upload).not.toHaveBeenCalled();
    const run = await lastRun();
    expect(run).toMatchObject({ status: 'FAILED', error: expect.stringContaining('not configured') });
    expect(run?.steps[0]).toMatchObject({ key: 'tts', status: 'FAILED' });
    expect(run?.api_log).toEqual([expect.objectContaining({ service: 'Sarvam', status: 0, summary: expect.stringContaining('not configured') })]);
    expect((await reelService.get(reel.id))?.assets).toEqual([]);
  });

  it.each([
    ['   ', 'Write what the voice should say.'],
    ['x'.repeat(1501), 'at most 1500 characters'],
  ])('refuses the text %p before speaking or opening a run', async (text, message) => {
    const reel = await newReel();
    await expect(reelService.generateVoiceover(reel.id, text, null, null, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining(message) });
    expect(tts).not.toHaveBeenCalled();
    await expect(MarketingRunModel.countDocuments()).resolves.toBe(0);
  });

  it('refuses a reel that is gone or full', async () => {
    await expect(reelService.generateVoiceover(unknownId(), 'Hello', null, null, ACTOR)).rejects.toMatchObject(NOT_FOUND);
    const reel = await newReel();
    await ReelProjectModel.updateOne({ _id: reel.id }, { $set: { assets: Array.from({ length: 60 }, (_item, index) => ({ id: `s${index}`, kind: 'IMAGE', source: 'UPLOAD', url: PHOTO })) } });
    await expect(reelService.generateVoiceover(reel.id, 'Hello', null, null, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining('at most 60') });
    expect(tts).not.toHaveBeenCalled();
  });
});

describe('generateReelSubtitles', () => {
  const cue = (start_ms: number, end_ms: number, text: string) => ({ start_ms, end_ms, text });
  const voice = { id: 'vo', kind: 'AUDIO', source: 'GENERATED', name: 'Voiceover — hi', mime_type: 'audio/wav', url: VOICE_URL, duration_ms: 5000 };
  const talk = { id: 'tk', kind: 'VIDEO', source: 'UPLOAD', name: 'talk.mp4', mime_type: 'video/mp4', url: VIDEO_URL, duration_ms: 10_000 };
  const poster = { id: 'po', kind: 'IMAGE', source: 'UPLOAD', name: 'poster.png', mime_type: 'image/png', url: PHOTO };
  const onDrive = { id: 'dr', kind: 'VIDEO', source: 'DRIVE', name: 'shoot.mov', mime_type: 'video/quicktime', drive_file_id: 'drive-1', duration_ms: 8000 };

  async function reelWith(assets: unknown[], spec: Record<string, unknown>) {
    const reel = await newReel();
    await ReelProjectModel.updateOne({ _id: reel.id }, { $set: { assets, spec: { ...emptySpec(), ...spec } } });
    return reel;
  }

  it('transcribes the voiceover and lays the lines as captions on the scenes under it, timed from each scene’s start', async () => {
    const reel = await reelWith([voice], { voiceover: { asset_id: 'vo', volume: 1 }, scenes: [{ duration_ms: 2000, texts: [{ text: 'Title', style: 'TITLE' }] }, { duration_ms: 3000 }] });
    transcribe.mockResolvedValue({ ok: true, message: 'Transcript ready', transcript: 'Hello there friends', cues: [cue(0, 900, 'Hello'), cue(900, 1800, 'there'), cue(2100, 3500, 'friends')] });

    const after = await reelService.generateSubtitles(reel.id, 'vo', 'en-IN', ACTOR);

    const [one, two] = after.spec.scenes;
    expect(one.texts.map((text) => [text.text, text.style, text.start_ms, text.duration_ms])).toEqual([
      ['Title', 'TITLE', 0, 0],
      ['Hello', 'CAPTION', 0, 900],
      ['there', 'CAPTION', 900, 900],
    ]);
    expect(two.texts.map((text) => [text.text, text.style, text.start_ms, text.duration_ms])).toEqual([['friends', 'CAPTION', 100, 1400]]);
    expect(transcribe).toHaveBeenCalledWith({ audioUrl: VOICE_URL, fileName: 'Voiceover — hi', contentType: 'audio/wav', language: 'en-IN', withTimestamps: true });
    const run = await lastRun();
    expect(run).toMatchObject({ workflow: 'REEL', name: 'Subtitles for "Jam night recap" from Voiceover — hi', status: 'COMPLETED', links: { reel_id: reel.id } });
    expect(stepsOf(run)).toEqual([
      ['transcribe', 'OK', 'sarvam.transcribe'],
      ['spec', 'OK', ''],
    ]);
    expect(run?.steps.map((step) => step.output_summary)).toEqual(['3 cues', '3 captions']);
    expect(run?.api_log).toEqual([expect.objectContaining({ service: 'Sarvam', url: 'speech-to-text', status: 200, summary: '3 cues' })]);
  });

  it('maps a clip’s transcript through the scene’s trim, replacing captions made earlier', async () => {
    const reel = await reelWith([talk], { scenes: [{ asset_id: 'tk', duration_ms: 3000, trim_start_ms: 2000, texts: [{ text: 'old caption', style: 'CAPTION' }] }] });
    transcribe.mockResolvedValue({ ok: true, message: 'ok', transcript: 't', cues: [cue(500, 1500, 'early'), cue(2500, 3200, 'middle')] });
    const after = await reelService.generateSubtitles(reel.id, 'tk', null, ACTOR);
    expect(after.spec.scenes[0].texts.map((text) => [text.text, text.start_ms, text.duration_ms])).toEqual([['middle', 500, 700]]);
    expect(transcribe).toHaveBeenCalledWith(expect.objectContaining({ audioUrl: VIDEO_URL, contentType: 'video/mp4', language: null }));
  });

  it('downloads a Drive clip whole and sends its bytes', async () => {
    const reel = await reelWith([onDrive], { scenes: [{ asset_id: 'dr', duration_ms: 3000 }] });
    drive.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-length': '3' } }));
    transcribe.mockResolvedValue({ ok: true, message: 'ok', transcript: 't', cues: [cue(0, 500, 'hi')] });
    await reelService.generateSubtitles(reel.id, 'dr', null, ACTOR);
    expect(drive).toHaveBeenCalledWith('drive-1', '', expect.any(AbortSignal));
    expect(transcribe).toHaveBeenCalledWith({ bytes: Buffer.from([1, 2, 3]), fileName: 'shoot.mov', contentType: 'video/quicktime', language: null, withTimestamps: true });
  });

  it('refuses a Drive clip Drive will not send, or one too large to transcribe', async () => {
    const reel = await reelWith([onDrive], { scenes: [{ asset_id: 'dr', duration_ms: 3000 }] });
    drive.mockResolvedValueOnce(new Response('no', { status: 403 }));
    await expect(reelService.generateSubtitles(reel.id, 'dr', null, ACTOR)).rejects.toMatchObject({ ...UPSTREAM, message: expect.stringContaining('HTTP 403') });
    drive.mockResolvedValueOnce(new Response(new Uint8Array(4), { status: 200, headers: { 'content-length': String(30 * 1024 * 1024) } }));
    await expect(reelService.generateSubtitles(reel.id, 'dr', null, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining('too large') });
    expect(transcribe).not.toHaveBeenCalled();
    expect((await lastRun())?.status).toBe('FAILED');
  });

  it('refuses a picture, a sound no scene plays, and a clip that is not in the reel — without a run', async () => {
    const reel = await reelWith([voice, poster], { scenes: [{ duration_ms: 2000 }] });
    await expect(reelService.generateSubtitles(reel.id, 'po', null, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: 'A picture has no sound to transcribe.' });
    await expect(reelService.generateSubtitles(reel.id, 'vo', null, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining('No scene plays that sound yet') });
    await expect(reelService.generateSubtitles(reel.id, 'nope', null, ACTOR)).rejects.toMatchObject({ ...BAD_INPUT, message: 'That clip is not in this reel.' });
    await expect(reelService.generateSubtitles(unknownId(), 'vo', null, ACTOR)).rejects.toMatchObject(NOT_FOUND);
    expect(transcribe).not.toHaveBeenCalled();
    await expect(MarketingRunModel.countDocuments()).resolves.toBe(0);
  });

  it('records a transcript that failed, or came without timing, as a failed run and leaves the reel as it was', async () => {
    const reel = await reelWith([voice], { voiceover: { asset_id: 'vo', volume: 1 }, scenes: [{ duration_ms: 2000 }] });
    transcribe.mockResolvedValueOnce({ ok: false, message: 'Servam transcription failed (HTTP 429): slow down' });
    await expect(reelService.generateSubtitles(reel.id, 'vo', null, ACTOR)).rejects.toMatchObject({ ...UPSTREAM, message: expect.stringContaining('HTTP 429') });
    expect((await lastRun())?.steps[0]).toMatchObject({ key: 'transcribe', status: 'FAILED', error: expect.stringContaining('HTTP 429') });
    transcribe.mockResolvedValueOnce({ ok: true, message: 'ok', transcript: 'words', cues: [] });
    await expect(reelService.generateSubtitles(reel.id, 'vo', null, ACTOR)).rejects.toMatchObject({ ...UPSTREAM, message: expect.stringContaining('no timing') });
    expect((await reelService.get(reel.id))?.spec.scenes[0].texts).toEqual([]);
  });
});
