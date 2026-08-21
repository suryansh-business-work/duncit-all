import { Types } from 'mongoose';
import { aiPromptService, getSystemPrompt } from '../../prompt.service';
import { CODE_PROMPTS as SYSTEM_PROMPTS, CODE_PROMPT_BY_KEY as SYSTEM_PROMPT_BY_KEY } from '../../catalog';
import { estimateTokens } from '@services/ai/token-estimate';

describe('aiPromptService integration', () => {
  it('creates a prompt with a derived token_count and lists it', async () => {
    const content = 'Summarize the following article in three concise bullet points.';
    const created = await aiPromptService.create(
      { name: 'Summarizer', description: 'Bulleted summary', content, category: 'Summarization', target_model: 'gpt-4o-mini' },
      'tester'
    );
    expect(created!.name).toBe('Summarizer');
    expect(created!.category).toBe('Summarization');
    expect(created!.target_model).toBe('gpt-4o-mini');
    expect(created!.token_count).toBe(estimateTokens(content));
    expect(created!.token_count).toBeGreaterThan(0);

    const list = await aiPromptService.list({});
    expect(list).toHaveLength(1);
  });

  it('defaults the category to General and requires name + content', async () => {
    const created = await aiPromptService.create({ name: 'Bare', content: 'Do the thing.' });
    expect(created!.category).toBe('General');

    await expect(aiPromptService.create({ name: '', content: 'x' })).rejects.toThrow(/name is required/i);
    await expect(aiPromptService.create({ name: 'x', content: '   ' })).rejects.toThrow(/content is required/i);
  });

  it('recomputes token_count when content changes', async () => {
    const created = await aiPromptService.create({ name: 'Edit me', content: 'a much longer prompt body that uses many tokens here' });
    const updated = await aiPromptService.update(created!.id, { content: 'short' });
    expect(updated!.token_count).toBeLessThan(created!.token_count);
    expect(updated!.token_count).toBe(estimateTokens('short'));
  });

  it('filters by search, category and active flag', async () => {
    await aiPromptService.create({ name: 'Alpha', content: 'classify the sentiment', category: 'Classification' });
    await aiPromptService.create({ name: 'Beta', content: 'translate to hindi', category: 'Translation', is_active: false });

    expect(await aiPromptService.list({ search: 'sentiment' })).toHaveLength(1);
    expect(await aiPromptService.list({ category: 'Translation' })).toHaveLength(1);
    expect((await aiPromptService.list({ is_active: true })).every((p) => p!.is_active)).toBe(true);
  });

  it('deletes a prompt', async () => {
    const created = await aiPromptService.create({ name: 'Temp', content: 'temp content' });
    expect(await aiPromptService.remove(created!.id)).toBe(true);
    await expect(aiPromptService.remove(created!.id)).rejects.toThrow(/not found/i);
  });
});

const IMAGE_SCAN_KEY = 'upload.image_scan';

describe('system prompts (the AI features run on the library)', () => {
  it('seeds every catalog prompt once and is safe to re-run', async () => {
    await aiPromptService.seedDefaults();
    await aiPromptService.seedDefaults();

    const seeded = await aiPromptService.list({ is_system: true });
    expect(seeded).toHaveLength(SYSTEM_PROMPTS.length);
    const scan = seeded.find((p) => p!.key === IMAGE_SCAN_KEY);
    expect(scan!.is_system).toBe(true);
    expect(scan!.content).toBe(SYSTEM_PROMPT_BY_KEY.get(IMAGE_SCAN_KEY)!.content);
  });

  it('serves the edited body to the feature and never deletes a system prompt', async () => {
    await aiPromptService.seedDefaults();
    const scan = (await aiPromptService.list({ is_system: true })).find((p) => p!.key === IMAGE_SCAN_KEY)!;

    await aiPromptService.update(scan.id, { content: 'Only flag nudity.' });
    expect(await getSystemPrompt(IMAGE_SCAN_KEY)).toBe('Only flag nudity.');

    await expect(aiPromptService.remove(scan.id)).rejects.toThrow(/cannot be deleted/i);
  });

  it('keeps the catalog identity fields on edit and on re-seed', async () => {
    await aiPromptService.seedDefaults();
    const scan = (await aiPromptService.list({ is_system: true })).find((p) => p!.key === IMAGE_SCAN_KEY)!;

    const edited = await aiPromptService.update(scan.id, {
      name: 'Renamed',
      category: 'Elsewhere',
      is_active: false,
      content: 'Edited body.',
    });
    expect(edited!.name).toBe(scan.name);
    expect(edited!.category).toBe(scan.category);
    expect(edited!.is_active).toBe(true);
    expect(edited!.content).toBe('Edited body.');
  });

  it('resets a system prompt back to its shipped default', async () => {
    await aiPromptService.seedDefaults();
    const scan = (await aiPromptService.list({ is_system: true })).find((p) => p!.key === IMAGE_SCAN_KEY)!;
    await aiPromptService.update(scan.id, { content: 'Broken.' });

    const reset = await aiPromptService.reset(scan.id);
    expect(reset!.content).toBe(SYSTEM_PROMPT_BY_KEY.get(IMAGE_SCAN_KEY)!.content);

    const own = await aiPromptService.create({ name: 'Mine', content: 'my own prompt body' });
    await expect(aiPromptService.reset(own!.id)).rejects.toThrow(/only system prompts/i);
    await expect(aiPromptService.reset(new Types.ObjectId().toString())).rejects.toThrow(/not found/i);
  });

  it('fills placeholders and falls back to the catalog before the first seed', async () => {
    // Nothing seeded yet in this case — the shipped default still renders.
    const rendered = await getSystemPrompt('release.changelog', { app_name: 'Duncit' });
    expect(rendered).toContain('"Duncit" Android app');
    expect(rendered).not.toContain('{{');

    // Only the supplied placeholders are substituted; the rest stay verbatim so
    // a prompt that talks about "{{variables}}" keeps saying it.
    await aiPromptService.seedDefaults();
    const dummy = await getSystemPrompt('generate.dummy_data', { fields: '{ "a": string }' });
    expect(dummy).toContain('{ "a": string }');
    expect(dummy).toContain('{{notes}}');
    expect(await getSystemPrompt('generate.email_mjml')).toContain('{{variables}}');
  });
});
