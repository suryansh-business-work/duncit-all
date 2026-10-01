import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { directReel } from '../../reel.director';
import { driveAccountEmail, driveFile, driveFolder, type DriveEntry } from '../../reel.drive';
import { ReelProjectModel } from '../../reel.model';
import { reelService, type ReelUploadInput } from '../../reel.service';
import { emptySpec } from '../../reel.edit';

jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn() } } }));
jest.mock('../../reel.director', () => ({ directReel: jest.fn() }));
jest.mock('../../reel.drive', () => ({
  ...jest.requireActual('../../reel.drive'),
  driveAccountEmail: jest.fn(),
  driveFile: jest.fn(),
  driveFolder: jest.fn(),
}));
jest.mock('../../reel.media', () => ({
  reelMediaLinks: async () => ({
    media: (id: string) => `media:${id}`,
    thumbnail: (id: string) => `thumb:${id}`,
  }),
}));

const mockDirect = directReel as jest.Mock;
const mockEmail = driveAccountEmail as jest.Mock;
const mockFile = driveFile as jest.Mock;
const mockFolder = driveFolder as jest.Mock;
const mockError = logs.server.error as jest.Mock;

const ACTOR = { id: 'user-1', email: 'reels@duncit.com' };
const EDITOR = { id: 'user-2', email: 'editor@duncit.com' };
const FOLDER_ID = '1AbCdEfGhIjKlMnOp';
const FOLDER_URL = `https://drive.google.com/drive/folders/${FOLDER_ID}`;
const POSTER = 'https://ik.imagekit.io/duncit/reels/poster.png';
const BAD_INPUT = { extensions: { code: 'BAD_USER_INPUT' } };
const NOT_FOUND = { extensions: { code: 'NOT_FOUND' } };

const entry = (id: string, kind: DriveEntry['kind']): DriveEntry => ({
  id,
  name: `${id}.bin`,
  mime_type: '',
  kind,
  size_bytes: 2048,
  duration_ms: kind === 'IMAGE' ? 0 : 10_000,
  width: 1080,
  height: 1920,
});

const card = (duration_ms: number) => ({ duration_ms });
const specOf = (scenes: unknown[]) => ({ ...emptySpec(), scenes });
const reply = (text: string, spec: unknown = null) => ({ ok: true, reply: text, spec });
const newReel = (name = 'Jam night recap') => reelService.create({ name }, ACTOR);
const unknownId = () => new Types.ObjectId().toString();

/** Fill a reel to its limit without going through sixty Drive reads. */
async function fillAssets(id: string): Promise<void> {
  const assets = Array.from({ length: 60 }, (_item, index) => ({
    id: `seed-${index}`,
    kind: 'IMAGE',
    source: 'UPLOAD',
    url: POSTER,
  }));
  await ReelProjectModel.updateOne({ _id: id }, { $set: { assets } });
}

describe('reelService — projects', () => {
  it.each([
    ['   ', 'Give the reel a name.'],
    ['x'.repeat(81), 'at most 80 characters'],
  ])('refuses the name %p', async (name, message) => {
    await expect(reelService.create({ name }, ACTOR)).rejects.toMatchObject({
      ...BAD_INPUT,
      message: expect.stringContaining(message),
    });
  });

  it('refuses a link that is not a Drive folder', async () => {
    await expect(reelService.create({ name: 'Recap', drive_url: 'https://example.com/shoot' }, ACTOR)).rejects.toMatchObject({
      ...BAD_INPUT,
      message: expect.stringContaining('not a Google Drive folder link'),
    });
  });

  it('creates an empty reel under the operator who made it', async () => {
    const reel = await reelService.create({ name: '  Jam night recap ', drive_url: ` ${FOLDER_URL} ` }, ACTOR);
    expect(reel).toMatchObject({
      name: 'Jam night recap',
      drive_url: FOLDER_URL,
      drive_folder_id: FOLDER_ID,
      assets: [],
      spec: emptySpec(),
      duration_ms: 0,
      messages: [],
      created_by: ACTOR.email,
    });
    expect(reel.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(reel.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('creates a reel with no Drive folder yet', async () => {
    await expect(reelService.create({ name: 'Recap', drive_url: null }, ACTOR)).resolves.toMatchObject({
      drive_url: '',
      drive_folder_id: '',
    });
  });

  it('reads one reel, and nothing for an id that is wrong or gone', async () => {
    const reel = await newReel();
    await expect(reelService.get(reel.id)).resolves.toMatchObject({ id: reel.id, name: 'Jam night recap' });
    await expect(reelService.get('not-an-id')).resolves.toBeNull();
    await expect(reelService.get(unknownId())).resolves.toBeNull();
  });

  it('lists reels newest edit first, each with its counts', async () => {
    const first = await newReel('First');
    await newReel('Second');
    await ReelProjectModel.updateOne(
      { _id: first.id },
      { $set: { spec: specOf([card(2000), card(3000)]), assets: [{ id: 'a1', kind: 'IMAGE', source: 'UPLOAD', url: POSTER }] } }
    );
    const [newest, older] = await reelService.list();
    expect(newest).toMatchObject({ name: 'First', asset_count: 1, scene_count: 2, duration_ms: 5000, created_by: ACTOR.email });
    expect(older).toMatchObject({ name: 'Second', asset_count: 0, scene_count: 0, duration_ms: 0 });
  });

  it('lists a reel stored before its dates were recorded', async () => {
    await ReelProjectModel.collection.insertOne({ name: 'Legacy' } as never);
    await expect(reelService.list()).resolves.toEqual([
      expect.objectContaining({ name: 'Legacy', created_at: null, updated_at: null }),
    ]);
  });

  it('renames a reel and records who did', async () => {
    const reel = await newReel();
    await expect(reelService.update(reel.id, { name: 'Final cut', drive_url: FOLDER_URL }, EDITOR)).resolves.toMatchObject({
      name: 'Final cut',
      drive_folder_id: FOLDER_ID,
    });
    const stored = await ReelProjectModel.findById(reel.id);
    expect(stored?.updated_by).toBe(EDITOR.email);
  });

  it.each(['not-an-id', unknownId()])('cannot edit or delete a reel that is not there: %s', async (id) => {
    await expect(reelService.update(id, { name: 'x' }, ACTOR)).rejects.toMatchObject(NOT_FOUND);
    await expect(reelService.remove(id)).rejects.toMatchObject(NOT_FOUND);
  });

  it('deletes a reel', async () => {
    const reel = await newReel();
    await expect(reelService.remove(reel.id)).resolves.toBe(true);
    await expect(reelService.get(reel.id)).resolves.toBeNull();
  });
});

describe('reelService — Drive', () => {
  it('reports whether Drive is connected, and as whom', async () => {
    mockEmail.mockResolvedValueOnce('');
    await expect(reelService.driveStatus()).resolves.toEqual({ configured: false, service_account_email: '' });
    mockEmail.mockResolvedValueOnce('reels@duncit-drive.iam.gserviceaccount.com');
    await expect(reelService.driveStatus()).resolves.toEqual({
      configured: true,
      service_account_email: 'reels@duncit-drive.iam.gserviceaccount.com',
    });
  });

  it('refuses to open something that is not a folder link', async () => {
    await expect(reelService.driveFolder('  ')).rejects.toMatchObject(BAD_INPUT);
    expect(mockFolder).not.toHaveBeenCalled();
  });

  it('lists a folder with a preview for everything that has a picture', async () => {
    mockFolder.mockResolvedValue({
      id: FOLDER_ID,
      name: 'Jam shoot',
      truncated: true,
      entries: [entry('v1', 'VIDEO'), entry('p1', 'IMAGE'), entry('s1', 'AUDIO'), entry('sub', 'FOLDER')],
    });
    const listing = await reelService.driveFolder(FOLDER_URL);
    expect(mockFolder).toHaveBeenCalledWith(FOLDER_ID);
    expect(listing).toMatchObject({ id: FOLDER_ID, name: 'Jam shoot', truncated: true });
    expect(listing.entries.map((item) => item.thumbnail_url)).toEqual(['thumb:v1', 'thumb:p1', '', '']);
  });

  it('adds the picked files once each, skipping folders and files it cannot play', async () => {
    const reel = await newReel();
    mockFile.mockImplementation(async (id: string) => {
      if (id === 'f-video') return entry('f-video', 'VIDEO');
      if (id === 'f-song') return entry('f-song', 'AUDIO');
      return id === 'f-folder' ? entry('f-folder', 'FOLDER') : null;
    });
    const added = await reelService.addDriveAssets(reel.id, ['f-video', ' f-video ', '', 'f-song', 'f-folder', 'f-doc'], EDITOR);
    expect(mockFile).toHaveBeenCalledTimes(4);
    expect(added.assets).toEqual([
      expect.objectContaining({
        kind: 'VIDEO',
        source: 'DRIVE',
        name: 'f-video.bin',
        drive_file_id: 'f-video',
        url: 'media:f-video',
        thumbnail_url: 'thumb:f-video',
        duration_ms: 10_000,
        size_bytes: 2048,
      }),
      expect.objectContaining({ kind: 'AUDIO', url: 'media:f-song', thumbnail_url: '' }),
    ]);

    // A file the reel already holds is not read from Drive a second time.
    const again = await reelService.addDriveAssets(reel.id, ['f-video'], EDITOR);
    expect(mockFile).toHaveBeenCalledTimes(4);
    expect(again.assets).toHaveLength(2);
  });

  it('refuses to hold more than sixty clips and pictures', async () => {
    const reel = await newReel();
    await fillAssets(reel.id);
    await expect(reelService.addDriveAssets(reel.id, ['one-more'], ACTOR)).rejects.toMatchObject({
      ...BAD_INPUT,
      message: expect.stringContaining('at most 60'),
    });
    expect(mockFile).not.toHaveBeenCalled();
  });

  it('removes a clip together with the scenes that used it', async () => {
    const reel = await newReel();
    mockFile.mockResolvedValue(entry('f-video', 'VIDEO'));
    const { assets } = await reelService.addDriveAssets(reel.id, ['f-video'], ACTOR);
    await ReelProjectModel.updateOne(
      { _id: reel.id },
      { $set: { spec: specOf([{ asset_id: assets[0].id, duration_ms: 2000 }, card(1500)]) } }
    );
    const after = await reelService.removeAsset(reel.id, assets[0].id, EDITOR);
    expect(after.assets).toEqual([]);
    expect(after.spec.scenes).toHaveLength(1);
    expect(after.duration_ms).toBe(1500);
  });
});

describe('reelService — the conversation', () => {
  it.each<[string, ReelUploadInput[], string]>([
    ['   ', [], 'Write what the reel should do.'],
    ['x'.repeat(2001), [], 'at most 2000 characters'],
    ['add these', Array.from({ length: 7 }, () => ({ url: POSTER, name: 'p.png' })), 'at most 6 pictures'],
  ])('refuses a message before saving anything: %#', async (text, uploads, message) => {
    const reel = await newReel();
    await expect(reelService.sendMessage({ project_id: reel.id, text, uploads }, ACTOR)).rejects.toMatchObject({
      ...BAD_INPUT,
      message: expect.stringContaining(message),
    });
    expect(mockDirect).not.toHaveBeenCalled();
  });

  it('refuses a message for a reel that is not there, or one that is already full', async () => {
    await expect(reelService.sendMessage({ project_id: unknownId(), text: 'hi' }, ACTOR)).rejects.toMatchObject(NOT_FOUND);
    const reel = await newReel();
    await fillAssets(reel.id);
    await expect(
      reelService.sendMessage({ project_id: reel.id, text: 'use this', uploads: [{ url: POSTER, name: 'p.png' }] }, ACTOR)
    ).rejects.toMatchObject(BAD_INPUT);
  });

  it('refuses a picture that did not come from the media store', async () => {
    const reel = await newReel();
    await expect(
      reelService.sendMessage(
        { project_id: reel.id, text: 'use this', uploads: [{ url: 'https://evil.example/p.png', name: 'p.png' }] },
        ACTOR
      )
    ).rejects.toMatchObject({ ...BAD_INPUT, message: expect.stringContaining('media store') });
  });

  it('stores the request, its pictures, the reply and the new edit', async () => {
    const reel = await newReel();
    mockDirect.mockResolvedValue(reply('Opened on the poster.', specOf([card(2000)])));
    const after = await reelService.sendMessage(
      {
        project_id: reel.id,
        text: '  open on the poster  ',
        uploads: [
          { url: POSTER, name: '  poster.png ', width: 1079.6, height: 1920, size_bytes: 4096.2 },
          { url: POSTER, name: '  ', height: null },
          { url: POSTER, name: 'tiny.png', width: -5, height: -5, size_bytes: -1 },
        ],
      },
      ACTOR
    );

    expect(after.assets).toEqual([
      expect.objectContaining({ kind: 'IMAGE', source: 'UPLOAD', name: 'poster.png', url: POSTER, thumbnail_url: POSTER, width: 1080, height: 1920, size_bytes: 4096 }),
      expect.objectContaining({ name: 'image', width: 0, height: 0, size_bytes: 0 }),
      expect.objectContaining({ name: 'tiny.png', width: 0, height: 0, size_bytes: 0 }),
    ]);
    expect(after.messages).toEqual([
      expect.objectContaining({
        role: 'USER',
        text: 'open on the poster',
        asset_ids: after.assets.map((asset) => asset.id),
        restorable: false,
        failed: false,
      }),
      expect.objectContaining({ role: 'ASSISTANT', text: 'Opened on the poster.', asset_ids: [], restorable: true, failed: false }),
    ]);
    expect(after.messages[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(after.spec.scenes).toHaveLength(1);
    expect(after.duration_ms).toBe(2000);
    expect(mockDirect).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: reel.id, history: [], request: 'open on the poster', userId: ACTOR.id })
    );
  });

  it('keeps the edit as it was when the reply changes nothing, and replays the conversation next time', async () => {
    const reel = await newReel();
    mockDirect.mockResolvedValue(reply('Which clip do you mean?'));
    const first = await reelService.sendMessage({ project_id: reel.id, text: 'trim it' }, ACTOR);
    expect(first.spec.scenes).toEqual([]);
    expect(first.messages[1]).toMatchObject({ restorable: false, failed: false });

    await reelService.sendMessage({ project_id: reel.id, text: 'the first one' }, ACTOR);
    const { history } = mockDirect.mock.calls[1][0];
    expect(history.map((message: { text: string }) => message.text)).toEqual(['trim it', 'Which clip do you mean?']);
  });

  it.each([
    [new Error('OpenAI timed out'), 'OpenAI timed out'],
    ['boom', 'The editor could not be reached.'],
  ])('records a failed turn as the reply, so the request is never left unanswered: %p', async (failure, text) => {
    const reel = await newReel();
    mockDirect.mockRejectedValue(failure);
    const after = await reelService.sendMessage({ project_id: reel.id, text: 'make it punchy' }, ACTOR);
    expect(after.messages.map((message) => message.text)).toEqual(['make it punchy', text]);
    expect(after.messages[1]).toMatchObject({ failed: true, restorable: false });
    expect(mockError).toHaveBeenCalledWith('reel', 'director', expect.objectContaining({ project_id: reel.id }));
  });

  it('answers not-found when the reel was deleted while the editor was thinking', async () => {
    const reel = await newReel();
    mockDirect.mockImplementation(async () => {
      await ReelProjectModel.deleteOne({ _id: reel.id });
      return reply('Done.');
    });
    await expect(reelService.sendMessage({ project_id: reel.id, text: 'go' }, ACTOR)).rejects.toMatchObject(NOT_FOUND);
  });

  it('puts an earlier version of the reel back', async () => {
    const reel = await newReel();
    mockDirect.mockResolvedValueOnce(reply('One scene.', specOf([card(2000)])));
    const first = await reelService.sendMessage({ project_id: reel.id, text: 'one scene' }, ACTOR);
    mockDirect.mockResolvedValueOnce(reply('Two scenes.', specOf([card(2000), card(3000)])));
    const second = await reelService.sendMessage({ project_id: reel.id, text: 'add another' }, ACTOR);
    expect(second.spec.scenes).toHaveLength(2);

    const restored = await reelService.restoreVersion(reel.id, first.messages[1].id, EDITOR);
    expect(restored.spec.scenes).toHaveLength(1);
    expect(restored.duration_ms).toBe(2000);
  });

  it('refuses to restore from a message that holds no version', async () => {
    const reel = await newReel();
    mockDirect.mockResolvedValue(reply('Nothing to change.'));
    const after = await reelService.sendMessage({ project_id: reel.id, text: 'hello' }, ACTOR);
    await expect(reelService.restoreVersion(reel.id, after.messages[0].id, ACTOR)).rejects.toMatchObject(BAD_INPUT);
    await expect(reelService.restoreVersion(reel.id, 'no-such-message', ACTOR)).rejects.toMatchObject(BAD_INPUT);
  });
});
