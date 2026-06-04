import { Types } from 'mongoose';
import { callPromptService } from '../../callPrompt.service';

describe('callPromptService integration', () => {
  it('creates a prompt and lists it', async () => {
    const created = await callPromptService.create(
      { name: 'Venue intro', context: 'You are a Duncit sales agent. Pitch the venue listing.', language: 'hi-IN' },
      'tester'
    );
    expect(created!.name).toBe('Venue intro');
    expect(created!.language).toBe('hi-IN');
    expect(created!.is_active).toBe(true);

    const list = await callPromptService.list({});
    expect(list).toHaveLength(1);
  });

  it('requires name and context', async () => {
    await expect(callPromptService.create({ name: '', context: 'x' })).rejects.toThrow(/name is required/i);
    await expect(callPromptService.create({ name: 'x', context: '  ' })).rejects.toThrow(/static content is required/i);
  });

  it('resolveContext returns only active prompts', async () => {
    const created = await callPromptService.create({ name: 'Host intro', context: 'Hello host' });
    const ctx = await callPromptService.resolveContext(created!.id);
    expect(ctx?.context).toBe('Hello host');

    await callPromptService.update(created!.id, { is_active: false });
    expect(await callPromptService.resolveContext(created!.id)).toBeNull();
    expect(await callPromptService.resolveContext(new Types.ObjectId().toString())).toBeNull();
  });

  it('filters by search and active flag', async () => {
    await callPromptService.create({ name: 'Alpha', context: 'discount offer' });
    await callPromptService.create({ name: 'Beta', context: 'renewal reminder', is_active: false });

    const search = await callPromptService.list({ search: 'renewal' });
    expect(search).toHaveLength(1);
    const active = await callPromptService.list({ is_active: true });
    expect(active.every((p) => p!.is_active)).toBe(true);
  });

  it('deletes a prompt', async () => {
    const created = await callPromptService.create({ name: 'Temp', context: 'temp' });
    expect(await callPromptService.remove(created!.id)).toBe(true);
    await expect(callPromptService.remove(created!.id)).rejects.toThrow(/not found/i);
  });
});
