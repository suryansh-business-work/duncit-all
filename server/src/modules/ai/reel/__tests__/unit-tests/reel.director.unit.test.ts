import { openaiChat } from '@services/openai/openai.client';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { logs } from '@observability/log';
import { directReel, type DirectorInput } from '../../reel.director';
import { driveThumbnail } from '../../reel.drive';
import type { ReelAsset, ReelMessage } from '../../reel.model';
import { emptySpec } from '../../reel.edit';

jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn() } } }));
jest.mock('../../reel.drive', () => ({ driveThumbnail: jest.fn() }));

const mockChat = openaiChat as jest.Mock;
const mockPrompt = resolvePrompt as jest.Mock;
const mockThumbnail = driveThumbnail as jest.Mock;
const mockWarn = logs.server.warn as jest.Mock;

const asset = (over: Partial<ReelAsset>): ReelAsset => ({
  id: 'a1',
  kind: 'VIDEO',
  source: 'DRIVE',
  name: 'jam.mp4',
  mime_type: 'video/mp4',
  drive_file_id: 'drive-a1',
  url: '',
  duration_ms: 10_000,
  width: 1080,
  height: 1920,
  size_bytes: 1,
  added_at: new Date('2026-10-01T10:00:00Z'),
  ...over,
});

const message = (over: Partial<ReelMessage>): ReelMessage => ({
  id: 'm1',
  role: 'USER',
  text: 'open on the drums',
  asset_ids: [],
  spec: null,
  failed: false,
  at: new Date('2026-10-01T10:00:00Z'),
  ...over,
});

const input = (over: Partial<DirectorInput> = {}): DirectorInput => ({
  projectId: 'DUN-REEL-1',
  assets: [],
  spec: emptySpec(),
  history: [],
  request: 'make it punchy',
  userId: 'user-1',
  ...over,
});

/** The variables the user prompt was resolved with. */
const promptVariables = () => mockPrompt.mock.calls.find(([key]) => key === 'reels.director.user')?.[1];
/** The picture parts that followed the request text. */
const pictures = () => mockChat.mock.calls[0][0].messages[1].content.slice(1);

beforeEach(() => {
  mockPrompt.mockImplementation(async (key: string) => ({ content: `prompt:${key}`, model: '' }));
  mockChat.mockResolvedValue({ ok: true, content: '{}' });
});

describe('directReel — the answer', () => {
  it('reports the failure when the model cannot be reached', async () => {
    mockChat.mockResolvedValue({ ok: false, message: 'OpenAI is not configured.' });
    await expect(directReel(input())).resolves.toEqual({ ok: false, reply: 'OpenAI is not configured.', spec: null });
  });

  it.each(['not json at all', '[1, 2]', 'null'])('refuses an answer it cannot read: %s', async (content) => {
    mockChat.mockResolvedValue({ ok: true, content });
    const turn = await directReel(input());
    expect(turn).toMatchObject({ ok: false, spec: null });
    expect(turn.reply).toContain('could not read');
  });

  it('returns the reply and the sanitized edit', async () => {
    mockChat.mockResolvedValue({
      ok: true,
      content: JSON.stringify({ reply: '  Opened on the drums.  ', spec: { scenes: [{ duration_ms: 2000 }, 'junk'] } }),
    });
    const turn = await directReel(input());
    expect(turn.ok).toBe(true);
    expect(turn.reply).toBe('Opened on the drums.');
    expect(turn.spec?.scenes).toHaveLength(1);
  });

  it('says what happened when the model sent no words', async () => {
    mockChat.mockResolvedValue({ ok: true, content: JSON.stringify({ reply: 7, spec: {} }) });
    await expect(directReel(input())).resolves.toMatchObject({ reply: 'Updated the reel.', spec: emptySpec() });

    mockChat.mockResolvedValue({ ok: true, content: JSON.stringify({ spec: null }) });
    await expect(directReel(input())).resolves.toEqual({ ok: true, reply: 'Nothing to change.', spec: null });
  });
});

describe('directReel — what the model is sent', () => {
  it('sends the system prompt, the request and the model the prompt names', async () => {
    mockPrompt.mockImplementation(async (key: string) => ({ content: `prompt:${key}`, model: 'gpt-reels' }));
    await directReel(input());
    expect(mockChat).toHaveBeenCalledWith(
      expect.objectContaining({
        task: 'reels.director',
        detail: 'reel:DUN-REEL-1',
        model: 'gpt-reels',
        json: true,
        user_id: 'user-1',
        messages: [
          { role: 'system', content: 'prompt:reels.director' },
          { role: 'user', content: [{ type: 'text', text: 'prompt:reels.director.user' }] },
        ],
      })
    );
  });

  it('leaves the model to the default when the prompt names none', async () => {
    await directReel(input());
    expect(mockChat.mock.calls[0][0].model).toBeUndefined();
  });

  it('says so when there is no footage and no conversation yet', async () => {
    await directReel(input());
    expect(promptVariables()).toMatchObject({
      assets: '(no footage added yet)',
      history: '(nothing yet)',
      request: 'make it punchy',
      spec: JSON.stringify(emptySpec()),
    });
  });

  it('describes each asset by id, kind, name, length and size', async () => {
    mockThumbnail.mockResolvedValue(null);
    await directReel(
      input({
        assets: [
          asset({ id: 'v1' }),
          asset({ id: 'v2', duration_ms: 0, width: 0, height: 0 }),
          asset({ id: 'p1', kind: 'IMAGE', name: 'cover.png' }),
        ],
      })
    );
    expect(promptVariables().assets).toBe(
      [
        '- id: v1 | VIDEO | "jam.mp4" | 10.0s | 1080x1920',
        '- id: v2 | VIDEO | "jam.mp4" | length unknown',
        '- id: p1 | IMAGE | "cover.png" | 1080x1920',
      ].join('\n')
    );
  });

  it('replays only the recent turns that worked', async () => {
    const history = [
      message({ id: 'old', text: 'turn 0' }),
      ...Array.from({ length: 8 }, (_item, index) =>
        message({ id: `m${index}`, role: index % 2 === 0 ? 'USER' : 'ASSISTANT', text: `turn ${index + 1}` })
      ),
      message({ id: 'bad', role: 'ASSISTANT', text: 'the editor failed', failed: true }),
    ];
    await directReel(input({ history }));
    const lines = promptVariables().history.split('\n');
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe('OPERATOR: turn 1');
    expect(lines[1]).toBe('EDITOR: turn 2');
    expect(promptVariables().history).not.toContain('the editor failed');
  });
});

describe('directReel — the pictures', () => {
  it('shows an uploaded picture by its own address, and nothing for sound or an uploaded clip', async () => {
    await directReel(
      input({
        assets: [
          asset({ id: 'song', kind: 'AUDIO' }),
          asset({ id: 'up', kind: 'IMAGE', source: 'UPLOAD', name: 'poster.png', url: 'https://ik.imagekit.io/duncit/poster.png' }),
          asset({ id: 'upclip', kind: 'VIDEO', source: 'UPLOAD' }),
        ],
      })
    );
    expect(pictures()).toEqual([
      { type: 'text', text: 'Asset up (poster.png):' },
      { type: 'image_url', image_url: { url: 'https://ik.imagekit.io/duncit/poster.png', detail: 'low' } },
    ]);
    expect(mockThumbnail).not.toHaveBeenCalled();
  });

  it('sends a Drive preview frame as a data URL', async () => {
    mockThumbnail
      .mockResolvedValueOnce(new Response(Buffer.from('png-bytes'), { headers: { 'content-type': 'image/png' } }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));
    await directReel(
      input({
        assets: [
          asset({ id: 'newer', added_at: new Date('2026-10-01T12:00:00Z') }),
          asset({ id: 'older', added_at: new Date('2026-10-01T09:00:00Z') }),
        ],
      })
    );
    const urls = pictures()
      .filter((part: { type: string }) => part.type === 'image_url')
      .map((part: { image_url: { url: string } }) => part.image_url.url);
    // Newest first, and a frame with no stated type is taken as a JPEG.
    expect(urls).toEqual([
      `data:image/png;base64,${Buffer.from('png-bytes').toString('base64')}`,
      `data:image/jpeg;base64,${Buffer.from([1, 2, 3]).toString('base64')}`,
    ]);
    expect(mockThumbnail).toHaveBeenNthCalledWith(1, 'drive-a1');
  });

  it('carries on without a frame Drive has not made or cannot serve', async () => {
    mockThumbnail.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('Drive is down'));
    await directReel(input({ assets: [asset({ id: 'one' }), asset({ id: 'two' })] }));
    expect(pictures()).toEqual([]);
    expect(mockWarn).toHaveBeenCalledWith('reel', 'frame', expect.objectContaining({ asset_id: expect.any(String) }));
  });

  it('shows at most sixteen pictures', async () => {
    const assets = Array.from({ length: 20 }, (_item, index) =>
      asset({ id: `p${index}`, kind: 'IMAGE', source: 'UPLOAD', url: `https://ik.imagekit.io/duncit/${index}.png` })
    );
    await directReel(input({ assets }));
    expect(pictures().filter((part: { type: string }) => part.type === 'image_url')).toHaveLength(16);
  });
});
