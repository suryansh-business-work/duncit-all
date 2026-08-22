/**
 * The image check's pure pieces and its one write-back.
 *
 * These assertions used to live under platform/uploadSetting, against a version
 * of `reviewImageWithAi` that called `fetch` itself and fell back to LOW. The
 * function moved here and changed contract — it goes through `openaiChat` and
 * records PENDING/SKIPPED rather than inventing a verdict — so the old suite
 * died at import ("reviewImageWithAi is not a function") and covered nothing.
 */
import type { IMediaScanLog } from '../../aiMonitoring.model';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import {
  IMAGE_SCAN_PROMPT_KEY,
  actionForResult,
  parseScanVerdict,
  reviewImageWithAi,
} from '../../aiMonitoring.service';

jest.mock('@modules/ai/prompt/prompt.service', () => ({
  resolvePrompt: jest.fn(),
}));
jest.mock('@services/openai/openai.client', () => ({
  openaiChat: jest.fn(),
}));

const mockResolvePrompt = resolvePrompt as jest.Mock;
const mockOpenaiChat = openaiChat as jest.Mock;

/** A monitoring row with only the fields the reviewer reads and writes. */
const makeLog = () =>
  ({
    url: 'https://ik.imagekit.io/x/a.jpg',
    file_name: 'a.jpg',
    folder: '/pods',
    risk: 'PENDING',
    status: 'PENDING',
    summary: '',
    error: '',
    save: jest.fn(async () => undefined),
  }) as unknown as IMediaScanLog & { save: jest.Mock };

const ok = (content: string) => ({ ok: true, content, model: 'gpt-4o-mini' });

beforeEach(() => {
  jest.clearAllMocks();
  // The system turn owns the model; the user turn carries the folder line.
  mockResolvePrompt.mockImplementation(async (key: string) =>
    key === IMAGE_SCAN_PROMPT_KEY
      ? { content: 'SYSTEM RULES', model: 'gpt-4o-mini-tuned' }
      : { content: 'Folder: /pods', model: '' },
  );
});

describe('parseScanVerdict', () => {
  it('accepts a strict verdict and upper-cases the risk', () => {
    expect(parseScanVerdict('{"risk":"high","summary":"nudity"}')).toEqual({
      risk: 'HIGH',
      summary: 'nudity',
    });
  });

  it('clips an overlong summary to 1000 characters', () => {
    const verdict = parseScanVerdict(`{"risk":"LOW","summary":"${'x'.repeat(1500)}"}`);
    expect(verdict?.summary).toHaveLength(1000);
  });

  it('reads a missing or non-string summary as empty', () => {
    expect(parseScanVerdict('{"risk":"LOW"}')).toEqual({ risk: 'LOW', summary: '' });
    expect(parseScanVerdict('{"risk":"LOW","summary":42}')).toEqual({ risk: 'LOW', summary: '' });
  });

  it('returns null for an unknown risk and for non-JSON', () => {
    expect(parseScanVerdict('{"risk":"BANANA","summary":"x"}')).toBeNull();
    expect(parseScanVerdict('{"summary":"x"}')).toBeNull();
    expect(parseScanVerdict('not json')).toBeNull();
  });
});

describe('actionForResult', () => {
  it('allows LOW, flags MEDIUM and HIGH, and does nothing for PENDING', () => {
    expect(actionForResult('LOW')).toBe('ALLOWED');
    expect(actionForResult('MEDIUM')).toBe('FLAGGED');
    expect(actionForResult('HIGH')).toBe('FLAGGED');
    expect(actionForResult('PENDING')).toBe('NONE');
  });
});

describe('reviewImageWithAi', () => {
  it('records the verdict, the derived action and the model that actually ran', async () => {
    mockOpenaiChat.mockResolvedValue(ok('{"risk":"MEDIUM","summary":"borderline"}'));
    const log = makeLog();

    await reviewImageWithAi(log);

    expect(log.risk).toBe('MEDIUM');
    expect(log.status).toBe('COMPLETED');
    expect(log.summary).toBe('borderline');
    expect(log.action).toBe('FLAGGED');
    // The row reports the library's model, not the module default.
    expect(log.ai_model).toBe('gpt-4o-mini-tuned');
    expect(log.checked_at).toBeInstanceOf(Date);
    expect(typeof log.duration_ms).toBe('number');
    expect(log.save).toHaveBeenCalledTimes(1);
  });

  it('sends the picture and the folder turn as one vision request', async () => {
    mockOpenaiChat.mockResolvedValue(ok('{"risk":"LOW","summary":"fine"}'));

    await reviewImageWithAi(makeLog());

    expect(mockResolvePrompt).toHaveBeenCalledWith('upload.image_scan.user', { folder: '/pods' });
    const req = mockOpenaiChat.mock.calls[0][0];
    expect(req).toMatchObject({ task: 'moderation.image_scan', json: true, temperature: 0 });
    expect(req.model).toBe('gpt-4o-mini-tuned');
    expect(req.messages[0]).toEqual({ role: 'system', content: 'SYSTEM RULES' });
    expect(req.messages[1].content).toEqual([
      { type: 'text', text: 'Folder: /pods' },
      { type: 'image_url', image_url: { url: 'https://ik.imagekit.io/x/a.jpg' } },
    ]);
  });

  it('falls back to the stock line when the model returns no comment', async () => {
    mockOpenaiChat.mockResolvedValue(ok('{"risk":"LOW","summary":""}'));
    const log = makeLog();

    await reviewImageWithAi(log);

    expect(log.summary).toBe('No comment returned.');
    expect(log.action).toBe('ALLOWED');
  });

  it('marks a missing key SKIPPED, not FAILED — nothing broke', async () => {
    mockOpenaiChat.mockResolvedValue({
      ok: false,
      code: 'NOT_CONFIGURED',
      status: 0,
      message: 'no api key',
      model: '',
    });
    const log = makeLog();

    await reviewImageWithAi(log);

    expect(log.status).toBe('SKIPPED');
    expect(log.risk).toBe('PENDING');
    expect(log.action).toBe('NONE');
    expect(log.summary).toContain('not configured');
    expect(log.error).toBe('no api key');
  });

  it('marks an upstream outage FAILED and keeps the reason', async () => {
    mockOpenaiChat.mockResolvedValue({
      ok: false,
      code: 'UPSTREAM',
      status: 500,
      message: 'boom',
      model: '',
    });
    const log = makeLog();

    await reviewImageWithAi(log);

    expect(log.status).toBe('FAILED');
    expect(log.risk).toBe('PENDING');
    expect(log.summary).toContain('unavailable');
    expect(log.error).toBe('boom');
  });

  it('keeps an unreadable answer as FAILED and stores what came back', async () => {
    mockOpenaiChat.mockResolvedValue(ok('the picture looks fine to me'));
    const log = makeLog();

    await reviewImageWithAi(log);

    expect(log.status).toBe('FAILED');
    expect(log.risk).toBe('PENDING');
    expect(log.summary).toBe('AI returned an answer this check could not read.');
    expect(log.error).toBe('the picture looks fine to me');
  });

  it('records a failure when the prompt library itself throws', async () => {
    mockResolvePrompt.mockRejectedValue(new Error('library down'));
    const log = makeLog();

    await reviewImageWithAi(log);

    expect(log.status).toBe('FAILED');
    expect(log.summary).toBe('AI review failed before a verdict was reached.');
    expect(log.error).toBe('library down');
    expect(log.save).toHaveBeenCalledTimes(1);
    expect(mockOpenaiChat).not.toHaveBeenCalled();
  });

  it('never throws when the row cannot be saved — an upload is not held up', async () => {
    mockOpenaiChat.mockResolvedValue(ok('{"risk":"LOW","summary":"fine"}'));
    const log = makeLog();
    log.save = jest.fn(async () => {
      throw new Error('db down');
    });

    await expect(reviewImageWithAi(log)).resolves.toBeUndefined();
  });
});
