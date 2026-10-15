/**
 * One auto-translate batch: what the model's answer turns into, and which
 * refusals stop the whole run (fatal) rather than just this batch.
 */
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@modules/ai/prompt/prompt.service', () => ({
  resolvePrompt: jest.fn(async (key: string) => ({ content: `prompt:${key}`, model: '' })),
}));

import { openaiChat, type OpenAiChatResult, type OpenAiFailureCode } from '@services/openai/openai.client';
import { placeholderFingerprint, translateBatch, type BatchInput } from '../../autoTranslate.runner';

const chat = openaiChat as jest.MockedFunction<typeof openaiChat>;

const input: BatchInput = {
  entries: [
    { key: 'pods.spots_left', text: '{count} spots left' },
    { key: 'pods.join', text: 'Join' },
  ],
  language: 'Hindi (India)',
  languageCode: 'hi-IN',
  sourceLanguage: 'English',
};

const failure = (code: OpenAiFailureCode): OpenAiChatResult => ({
  ok: false,
  code,
  status: 0,
  message: `refused: ${code}`,
  model: 'gpt-4o-mini',
});

const answer = (content: string): OpenAiChatResult => ({ ok: true, content, model: 'gpt-4o-mini' });

beforeEach(() => chat.mockReset());

describe('translateBatch refusals', () => {
  it.each<OpenAiFailureCode>(['NOT_CONFIGURED', 'DISABLED'])(
    'treats %s as fatal — every later batch would be refused the same way',
    async (code) => {
      chat.mockResolvedValue(failure(code));

      await expect(translateBatch(input)).resolves.toEqual({ ok: false, fatal: true, message: `refused: ${code}` });
    }
  );

  it.each<OpenAiFailureCode>(['NETWORK', 'UPSTREAM', 'EMPTY'])(
    'treats %s as a blip that only loses this batch',
    async (code) => {
      chat.mockResolvedValue(failure(code));

      await expect(translateBatch(input)).resolves.toEqual({ ok: false, fatal: false, message: `refused: ${code}` });
    }
  );

  it('loses the batch, not the run, when the reply is not the expected JSON', async () => {
    chat.mockResolvedValue(answer('not json'));
    await expect(translateBatch(input)).resolves.toMatchObject({ ok: false, fatal: false });

    chat.mockResolvedValue(answer(JSON.stringify({ translations: ['a', 'b'] })));
    await expect(translateBatch(input)).resolves.toMatchObject({ ok: false, fatal: false });
  });
});

describe('translateBatch answers', () => {
  it('writes the usable translations and counts a dropped placeholder as a failure', async () => {
    chat.mockResolvedValue(
      answer(JSON.stringify({ translations: { 'pods.spots_left': 'बची जगहें', 'pods.join': '  जुड़ें  ' } }))
    );

    await expect(translateBatch(input)).resolves.toEqual({
      ok: true,
      written: [{ key: 'pods.join', value: 'जुड़ें' }],
      failed: 1,
      ai_model: 'gpt-4o-mini',
    });
  });

  it('keeps a translation that carries every placeholder, and sends the target language to the model', async () => {
    chat.mockResolvedValue(
      answer(JSON.stringify({ translations: { 'pods.spots_left': '{count} जगहें बची हैं', 'pods.join': '' } }))
    );

    const out = await translateBatch(input);

    expect(out).toMatchObject({ ok: true, written: [{ key: 'pods.spots_left', value: '{count} जगहें बची हैं' }], failed: 1 });
    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({ task: 'localization.auto_translate', json: true, detail: 'hi-IN · 2 keys' })
    );
  });
});

describe('placeholderFingerprint', () => {
  it('is order- and repeat-insensitive, and empty for plain text', () => {
    expect(placeholderFingerprint('{b} and {a} and {b}')).toBe('a|b');
    expect(placeholderFingerprint('no tokens')).toBe('');
  });
});
