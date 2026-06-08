import { aiPromptService } from '../../prompt.service';
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
