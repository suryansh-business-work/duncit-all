/**
 * Images and PDFs attached to a chat question: only files the person may open,
 * only images and PDFs, at most five; images reach the model as images, PDFs
 * as fenced text within a budget, and an unreadable file is named, not dropped.
 */
import { MAX_CHAT_ATTACHMENTS, isChatAttachmentType, questionContent, resolveAttachments } from '../../chat/intel.attachments';
import { IntelMessageModel } from '../../chat/intelChat.models';
import { extractDocumentText } from '../../media/intelMedia.extract';
import { IntelMediaModel } from '../../media/intelMedia.model';
import { readFile } from '../../media/intelMedia.storage';

jest.mock('../../media/intelMedia.model', () => ({ IntelMediaModel: { find: jest.fn(), findById: jest.fn() } }));
jest.mock('../../media/intelMedia.storage', () => ({ readFile: jest.fn() }));
jest.mock('../../media/intelMedia.extract', () => ({ extractDocumentText: jest.fn() }));
jest.mock('../../chat/intelChat.models', () => ({ IntelMessageModel: { findById: jest.fn() } }));

const ME = '64b7f0c2a1b2c3d4e5f60701';
const OTHER = '64b7f0c2a1b2c3d4e5f60702';
const id = (n: number) => `64b7f0c2a1b2c3d4e5f607${String(10 + n)}`;
const actor = { user: { id: ME }, level: 'EMPLOYEE' } as never;
const lean = <T>(value: T) => ({ lean: () => Promise.resolve(value) });
const media = IntelMediaModel as unknown as Record<string, jest.Mock>;

beforeEach(() => jest.clearAllMocks());

describe('isChatAttachmentType', () => {
  it('allows images and PDFs only', () => {
    for (const mime of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']) expect(isChatAttachmentType(mime)).toBe(true);
    for (const mime of ['text/plain', 'text/csv', 'image/svg+xml', 'application/zip']) expect(isChatAttachmentType(mime)).toBe(false);
  });
});

describe('resolveAttachments', () => {
  it('returns nothing for no files, without a lookup', async () => {
    await expect(resolveAttachments(actor, undefined)).resolves.toEqual([]);
    await expect(resolveAttachments(actor, [])).resolves.toEqual([]);
    expect(media.find).not.toHaveBeenCalled();
  });

  it('keeps the order asked for and drops repeats', async () => {
    media.find.mockReturnValue(lean([{ _id: id(2), owner_id: ME, visibility: 'PRIVATE', name: 'b.pdf', mime: 'application/pdf' }, { _id: id(1), owner_id: ME, visibility: 'PRIVATE', name: 'a.png', mime: 'image/png' }]));
    await expect(resolveAttachments(actor, [id(1), id(2), id(1)])).resolves.toEqual([
      { media_id: id(1), name: 'a.png', mime: 'image/png' },
      { media_id: id(2), name: 'b.pdf', mime: 'application/pdf' },
    ]);
  });

  it(`refuses more than ${MAX_CHAT_ATTACHMENTS} files and malformed ids`, async () => {
    await expect(resolveAttachments(actor, [1, 2, 3, 4, 5, 6].map(id))).rejects.toThrow(/at most 5/);
    await expect(resolveAttachments(actor, ['nope'])).rejects.toThrow(/does not exist/);
  });

  it('refuses someone else’s private file, a deleted one, and a type that is not an image or PDF', async () => {
    media.find.mockReturnValue(lean([{ _id: id(1), owner_id: OTHER, visibility: 'PRIVATE', name: 'secret.pdf', mime: 'application/pdf' }]));
    await expect(resolveAttachments(actor, [id(1)])).rejects.toThrow(/not yours/);
    media.find.mockReturnValue(lean([]));
    await expect(resolveAttachments(actor, [id(1)])).rejects.toThrow(/does not exist/);
    media.find.mockReturnValue(lean([{ _id: id(1), owner_id: ME, visibility: 'PRIVATE', name: 'notes.txt', mime: 'text/plain' }]));
    await expect(resolveAttachments(actor, [id(1)])).rejects.toThrow(/not an image or a PDF/);
  });

  it('allows a teammate’s file shared with the team', async () => {
    media.find.mockReturnValue(lean([{ _id: id(1), owner_id: OTHER, visibility: 'TEAM', name: 'deck.pdf', mime: 'application/pdf' }]));
    await expect(resolveAttachments(actor, [id(1)])).resolves.toHaveLength(1);
  });
});

describe('questionContent', () => {
  const withAttachments = (attachments: unknown[]) => (IntelMessageModel.findById as jest.Mock).mockReturnValue(lean({ attachments }));

  it('is the plain question when nothing is attached', async () => {
    withAttachments([]);
    await expect(questionContent('m1', 'How many pods?')).resolves.toBe('How many pods?');
  });

  it('sends an image as the image itself', async () => {
    withAttachments([{ media_id: id(1), name: 'chart.png', mime: 'image/png' }]);
    media.findById.mockReturnValue(lean({ file_id: 'f1', size: 4, deleted_at: null }));
    (readFile as jest.Mock).mockResolvedValue(Buffer.from('png!'));
    const parts = await questionContent('m1', 'What does this show?');
    expect(parts).toEqual([
      { type: 'text', text: 'What does this show?' },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${Buffer.from('png!').toString('base64')}`, detail: 'auto' } },
    ]);
  });

  it('sends a PDF as fenced text with page markers', async () => {
    withAttachments([{ media_id: id(2), name: 'report.pdf', mime: 'application/pdf' }]);
    media.findById.mockReturnValue(lean({ file_id: 'f2', size: 100, deleted_at: null }));
    (readFile as jest.Mock).mockResolvedValue(Buffer.from('%PDF'));
    (extractDocumentText as jest.Mock).mockResolvedValue({ pages: [{ page: 1, text: 'Revenue grew' }, { page: 2, text: 'Costs fell' }], method: 'PDF', warning: '' });
    const parts = (await questionContent('m1', 'Summarise')) as Array<{ type: string; text?: string }>;
    expect(parts[1].type).toBe('text');
    expect(parts[1].text).toContain('[page 1]\nRevenue grew');
    expect(parts[1].text).toContain('[page 2]\nCosts fell');
    expect(parts[1].text).toContain('report.pdf');
    expect(extractDocumentText).toHaveBeenCalledWith(expect.any(Buffer), 'application/pdf', { ocr: false });
  });

  it('cuts long PDFs to the shared budget and says so', async () => {
    withAttachments([{ media_id: id(2), name: 'big.pdf', mime: 'application/pdf' }]);
    media.findById.mockReturnValue(lean({ file_id: 'f2', size: 100, deleted_at: null }));
    (readFile as jest.Mock).mockResolvedValue(Buffer.from('%PDF'));
    (extractDocumentText as jest.Mock).mockResolvedValue({ pages: [{ page: 1, text: 'x'.repeat(50_000) }], method: 'PDF', warning: '' });
    const parts = (await questionContent('m1', 'Summarise')) as Array<{ text?: string }>;
    expect(parts[1].text).toContain('the rest of this PDF was cut to fit');
    expect(parts[1].text?.length).toBeLessThan(41_000);
  });

  it('names a deleted, oversized, empty or unreadable file instead of dropping it', async () => {
    withAttachments([
      { media_id: id(1), name: 'gone.png', mime: 'image/png' },
      { media_id: id(2), name: 'huge.png', mime: 'image/png' },
      { media_id: id(3), name: 'scan.pdf', mime: 'application/pdf' },
      { media_id: id(4), name: 'broken.pdf', mime: 'application/pdf' },
    ]);
    media.findById
      .mockReturnValueOnce(lean({ file_id: 'f1', size: 4, deleted_at: new Date() }))
      .mockReturnValueOnce(lean({ file_id: 'f2', size: 20 * 1024 * 1024, deleted_at: null }))
      .mockReturnValueOnce(lean({ file_id: 'f3', size: 10, deleted_at: null }))
      .mockReturnValueOnce(lean({ file_id: 'f4', size: 10, deleted_at: null }));
    (readFile as jest.Mock).mockResolvedValueOnce(Buffer.from('%PDF')).mockRejectedValueOnce(new Error('GridFS read failed'));
    (extractDocumentText as jest.Mock).mockResolvedValue({ pages: [{ page: 1, text: '   ' }], method: 'NONE', warning: 'scanned pages' });
    const texts = ((await questionContent('m1', 'Look')) as Array<{ text?: string }>).slice(1).map((p) => p.text);
    expect(texts[0]).toMatch(/gone\.png” was deleted/);
    expect(texts[1]).toMatch(/huge\.png” is too large/);
    expect(texts[2]).toMatch(/scan\.pdf” has no readable text: scanned pages/);
    expect(texts[3]).toMatch(/broken\.pdf” could not be read/);
  });
});
