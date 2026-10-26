/**
 * Values a model hands back that are not translations: a number, null, an
 * object or blank text are dropped and counted as failures, never written.
 */
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@modules/ai/prompt/prompt.service', () => ({
  resolvePrompt: jest.fn(async (key: string) => ({ content: `prompt:${key}`, model: '' })),
}));

import { openaiChat, type OpenAiChatResult } from '@services/openai/openai.client';
import { translateBatch, type BatchInput } from '../../autoTranslate.runner';

const chat = openaiChat as jest.MockedFunction<typeof openaiChat>;
const input: BatchInput = {
  entries: [
    { key: 'a', text: 'Join' },
    { key: 'b', text: 'Leave' },
    { key: 'c', text: 'Share' },
    { key: 'd', text: 'Report' },
    { key: 'e', text: 'Save' },
    { key: 'f', text: 'Open' },
  ],
  language: 'Hindi (India)',
  languageCode: 'hi-IN',
  sourceLanguage: 'English',
};
const answer = (content: string): OpenAiChatResult => ({ ok: true, content, model: 'gpt-4o-mini' });

it('writes only the strings the model really translated, counting numbers, nulls, objects, blanks and omissions as failures', async () => {
  chat.mockResolvedValue(answer(JSON.stringify({ translations: { a: 'जुड़ें', b: 42, c: null, d: { text: 'x' }, e: '   ' } })));
  await expect(translateBatch(input)).resolves.toEqual({
    ok: true,
    written: [{ key: 'a', value: 'जुड़ें' }],
    failed: 5,
    ai_model: 'gpt-4o-mini',
  });
});
