import { openaiChat } from '@services/openai/openai.client';
import { aiPromptService } from '@modules/ai/prompt/prompt.service';
import { CODE_PROMPT_BY_KEY } from '@modules/ai/prompt/catalog';
import { AiPromptModel } from '@modules/ai/prompt/prompt.model';
import { CRM_EMAIL_PROMPT_KEYS, crmEmailAi } from '../../crmEmailAi';
import { crmEmailSettingsService } from '../../crmEmailSettings.service';

/**
 * The CRM's AI email writer and its two editable prompts. The model is the only
 * thing replaced: the prompts are the real catalogue rows (or their catalogue
 * fallback), so the assertions read what would really reach OpenAI.
 */
jest.mock('@services/openai/openai.client', () => ({
  ...jest.requireActual('@services/openai/openai.client'),
  openaiChat: jest.fn(),
}));

const mockChat = openaiChat as jest.Mock;
const answer = (mjml: string) =>
  mockChat.mockResolvedValue({ ok: true, content: JSON.stringify({ mjml }), model: 'gpt-4o-mini' });
const chatReq = () => mockChat.mock.calls[0][0];
const userTurn = (): string => chatReq().messages[1].content;

const DRAWN = '<mjml><mj-body><mj-section><mj-column><mj-text>Hello {{name}}</mj-text></mj-column></mj-section></mj-body></mjml>';

describe('crmEmailAi prompts', () => {
  it('lists nothing before the catalogue is seeded, then the SYSTEM prompt and its USER turn in order', async () => {
    expect(await crmEmailAi.prompts()).toEqual([]);

    await aiPromptService.seedDefaults();
    const rows = await crmEmailAi.prompts();

    expect(rows.map((r) => [r.key, r.role, r.kind])).toEqual([
      ['crm.email_mjml', 'SYSTEM', 'CODE'],
      ['crm.email_mjml.user', 'USER', 'CODE'],
    ]);
    expect(rows.map((r) => r.tasks)).toEqual([['crm.email_mjml'], ['crm.email_mjml']]);
  });

  it('edits and resets the CRM prompts', async () => {
    await aiPromptService.seedDefaults();

    const edited = await crmEmailAi.updatePrompt('crm.email_mjml', 'Write short, friendly CRM emails as JSON { "mjml": string }.');
    expect(edited).toMatchObject({ key: 'crm.email_mjml', content: 'Write short, friendly CRM emails as JSON { "mjml": string }.' });

    const reset = await crmEmailAi.resetPrompt('crm.email_mjml');
    expect(reset!.content).toBe(CODE_PROMPT_BY_KEY.get('crm.email_mjml')!.content);
  });

  it('keeps the instruction placeholder in the USER turn', async () => {
    await aiPromptService.seedDefaults();
    await expect(crmEmailAi.updatePrompt('crm.email_mjml.user', 'Write something nice.')).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    const row = await AiPromptModel.findOne({ key: 'crm.email_mjml.user' }).lean();
    expect(row?.content).toBe(CODE_PROMPT_BY_KEY.get('crm.email_mjml.user')!.content);
  });

  it.each(['generate.email_mjml', 'crm.lead_parse', '', 'CRM.EMAIL_MJML'])(
    'refuses to touch %p, even when it exists, so CRM tuning never changes another console',
    async (key) => {
      await aiPromptService.seedDefaults();
      const before = await AiPromptModel.findOne({ key: 'generate.email_mjml' }).lean();

      await expect(crmEmailAi.updatePrompt(key, 'hijacked {{instruction}}')).rejects.toMatchObject({
        message: 'Only the CRM email prompts can be edited here',
        extensions: { code: 'FORBIDDEN' },
      });
      await expect(crmEmailAi.resetPrompt(key)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
      expect((await AiPromptModel.findOne({ key: 'generate.email_mjml' }).lean())?.content).toBe(before?.content);
    }
  );

  it.each(CRM_EMAIL_PROMPT_KEYS)('reports %p as not set up yet before the first seed', async (key) => {
    await expect(crmEmailAi.updatePrompt(key, 'x {{instruction}}')).rejects.toMatchObject({
      message: 'The CRM email prompt is not set up yet — try again in a minute',
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(crmEmailAi.resetPrompt(key)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('crmEmailAi.generate', () => {
  it('writes with the CRM prompts and task, the lead audience and the uploaded brand images', async () => {
    await crmEmailSettingsService.addAssets([
      { kind: 'LOGO', url: 'https://cdn.example.com/logo.png' },
      { kind: 'BANNER', url: 'https://cdn.example.com/hero.jpg', name: 'Hero', width: 1200, height: 400 },
    ]);
    answer(DRAWN);

    const out = await crmEmailAi.generate({ prompt: '  invite the venue to list  ', target: 'VENUE' });

    expect(chatReq()).toEqual(
      expect.objectContaining({ task: 'crm.email_mjml', detail: 'invite the venue to list', json: true })
    );
    expect(chatReq().messages[0]).toEqual({ role: 'system', content: CODE_PROMPT_BY_KEY.get('crm.email_mjml')!.content });
    expect(userTurn()).toContain('Instruction: invite the venue to list');
    expect(userTurn()).toContain('Audience: Venue leads (venues that could host Duncit events)');
    expect(userTurn()).toContain('Brand images:\n- Banner: Hero (1200x400) — https://cdn.example.com/hero.jpg\n');
    // The logo is the header's job, never an image to place.
    expect(userTurn()).not.toContain('logo.png');
    // A new email starts from the shared card.
    expect(userTurn()).toContain('prefers-color-scheme');
    // The answer is put on the shared card.
    expect(out).toContain('Hello {{name}}');
    expect(out).toContain('<mj-head>');
  });

  it('reworks the template being edited and says when there are no brand images', async () => {
    answer(DRAWN);
    await crmEmailAi.generate({ prompt: 'shorter', current_mjml: '<mjml><mj-body>Old body</mj-body></mjml>', target: 'HOST' });

    expect(userTurn()).toContain('Existing MJML:\n<mjml><mj-body>Old body</mj-body></mjml>');
    expect(userTurn()).toContain('Audience: Host leads (people who run events and communities)');
    expect(userTurn()).toContain('Brand images:\nNone uploaded.');
  });

  it.each([
    ['ECOMM', 'E-commerce seller leads (brands that could list products)'],
    ['STATIC', 'Any CRM lead (no lead-specific variables)'],
    [null, 'Any CRM lead (no lead-specific variables)'],
    [undefined, 'Any CRM lead (no lead-specific variables)'],
    ['CREATOR', 'Any CRM lead (no lead-specific variables)'],
  ])('describes target %p as %p', async (target, audience) => {
    answer(DRAWN);
    await crmEmailAi.generate({ prompt: 'hello', target });
    expect(userTurn()).toContain(`Audience: ${audience}`);
  });

  it('honours an edited CRM prompt', async () => {
    await aiPromptService.seedDefaults();
    await crmEmailAi.updatePrompt('crm.email_mjml', 'House style: one paragraph. JSON { "mjml": string }.');
    answer(DRAWN);

    await crmEmailAi.generate({ prompt: 'hello' });

    expect(chatReq().messages[0].content).toBe('House style: one paragraph. JSON { "mjml": string }.');
  });

  it('refuses a blank prompt before calling the model, and a non-MJML answer after', async () => {
    await expect(crmEmailAi.generate({ prompt: '   ' })).rejects.toMatchObject({
      message: 'Prompt is required',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(mockChat).not.toHaveBeenCalled();

    answer('<html><body>not mjml</body></html>');
    await expect(crmEmailAi.generate({ prompt: 'hello' })).rejects.toMatchObject({
      message: 'OpenAI did not return valid MJML',
      extensions: { code: 'AI_INVALID_JSON' },
    });
  });

  it('passes a model failure through as its GraphQL error', async () => {
    mockChat.mockResolvedValue({ ok: false, code: 'NOT_CONFIGURED', status: 500, message: 'no key', model: 'gpt-4o-mini' });
    await expect(crmEmailAi.generate({ prompt: 'hello' })).rejects.toMatchObject({
      extensions: { code: 'AI_NOT_CONFIGURED' },
    });
  });
});
