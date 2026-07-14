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

  it('serves the crmCallPromptsTable page with search, filters, sort and paging', async () => {
    await callPromptService.create({ name: 'Alpha', context: 'discount offer', language: 'hi-IN' });
    await callPromptService.create({ name: 'Beta', context: 'renewal reminder' });
    await callPromptService.create({ name: 'Gamma', context: 'welcome pitch', is_active: false });

    // Default sort: active first, then name asc — with clamp defaults echoed back.
    const all = await callPromptService.table();
    expect(all.total).toBe(3);
    expect(all.rows.map((p) => p!.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans name, description and context.
    const search = await callPromptService.table({ search: 'renewal' });
    expect(search.rows.map((p) => p!.name)).toEqual(['Beta']);
    expect(search.total).toBe(1);

    // Boolean + string filters narrow.
    const active = await callPromptService.table({ filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.rows.map((p) => p!.name)).toEqual(['Alpha', 'Beta']);
    const hindi = await callPromptService.table({
      filters: [{ field: 'language', op: 'eq', value: 'hi-IN' }],
    });
    expect(hindi.rows.map((p) => p!.name)).toEqual(['Alpha']);

    // Allowlisted sort override.
    const desc = await callPromptService.table({ sort_by: 'name', sort_dir: 'desc' });
    expect(desc.rows.map((p) => p!.name)).toEqual(['Gamma', 'Beta', 'Alpha']);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await callPromptService.table({ page: 2, page_size: 1 });
    expect(page2.rows.map((p) => p!.name)).toEqual(['Beta']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('deletes a prompt', async () => {
    const created = await callPromptService.create({ name: 'Temp', context: 'temp' });
    expect(await callPromptService.remove(created!.id)).toBe(true);
    await expect(callPromptService.remove(created!.id)).rejects.toThrow(/not found/i);
  });
});
