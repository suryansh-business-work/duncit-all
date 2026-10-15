/**
 * The CRM call assistant's brain. Its result carries `disabled` so a call whose
 * feature was switched off in the AI portal ends politely instead of asking
 * the caller to repeat themselves turn after turn.
 */
jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('../../openai.client', () => ({ openaiChat: jest.fn() }));

import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '../../openai.client';
import { openaiService } from '../../openai.service';

const prompt = resolvePrompt as unknown as jest.Mock;
const chat = openaiChat as unknown as jest.Mock;

beforeEach(() => {
  prompt.mockResolvedValue({ content: 'LIBRARY SCRIPT', model: 'gpt-4o-mini' });
});

describe('openaiService.chat', () => {
  it('flags a switched-off call assistant as disabled', async () => {
    chat.mockResolvedValue({ ok: false, code: 'DISABLED', status: 0, message: 'switched off', model: 'm' });

    const result = await openaiService.chat({ systemContext: 'Script' });

    expect(result).toEqual({ ok: false, message: 'switched off', disabled: true });
  });

  it.each(['NOT_CONFIGURED', 'NETWORK', 'UPSTREAM', 'EMPTY'])(
    'does not flag an ordinary %s failure as disabled',
    async (code) => {
      chat.mockResolvedValue({ ok: false, code, status: 0, message: 'failed', model: 'm' });

      const result = await openaiService.chat({ systemContext: 'Script' });

      expect(result).toEqual({ ok: false, message: 'failed', disabled: false });
    },
  );

  it('returns the trimmed reply, attributed to the call assistant task', async () => {
    chat.mockResolvedValue({ ok: true, content: '  Hello there  ', model: 'm' });

    const result = await openaiService.chat({
      systemContext: 'Bespoke script',
      history: [{ role: 'user', content: 'Hi' }],
      maxTokens: 99,
    });

    expect(result).toEqual({ ok: true, message: 'ok', reply: 'Hello there' });
    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({
        task: 'crm.call_assistant',
        model: 'gpt-4o-mini',
        max_tokens: 99,
        messages: [
          { role: 'system', content: 'Bespoke script' },
          { role: 'user', content: 'Hi' },
        ],
      }),
    );
  });

  it('falls back to the library script and the default length when none is given', async () => {
    chat.mockResolvedValue({ ok: true, content: 'ok', model: 'm' });

    await openaiService.chat({ systemContext: '' });

    expect(chat).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 220,
        messages: [{ role: 'system', content: 'LIBRARY SCRIPT' }],
      }),
    );
  });
});
