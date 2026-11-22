import { Types } from 'mongoose';
import { aiPromptService, getSystemPrompt } from '../../prompt.service';
import { AiPromptModel } from '../../prompt.model';
import { CODE_PROMPTS as SYSTEM_PROMPTS, CODE_PROMPT_BY_KEY as SYSTEM_PROMPT_BY_KEY } from '../../catalog';
import { estimateTokens } from '@services/ai/token-estimate';
import { makeContext } from '@test/harness';
import { OpenAiUsageLogModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import { OPENAI_TASK_KEYS } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { PROMPTLESS_TASKS } from '../../catalog/byTask';
import { aiLibraryDashboard } from '../../prompt.dashboard';
import { aiPromptResolvers } from '../../prompt.resolver';

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

    const seeded = await aiPromptService.list({ kind: 'CODE' });
    expect(seeded).toHaveLength(SYSTEM_PROMPTS.length);
    const scan = seeded.find((p) => p!.key === IMAGE_SCAN_KEY);
    expect(scan!.kind).toBe('CODE');
    expect(scan!.content).toBe(SYSTEM_PROMPT_BY_KEY.get(IMAGE_SCAN_KEY)!.content);
  });

  it('serves the edited body to the feature and never deletes a system prompt', async () => {
    await aiPromptService.seedDefaults();
    const scan = (await aiPromptService.list({ kind: 'CODE' })).find((p) => p!.key === IMAGE_SCAN_KEY)!;

    await aiPromptService.update(scan.id, { content: 'Only flag nudity.' });
    expect(await getSystemPrompt(IMAGE_SCAN_KEY)).toBe('Only flag nudity.');

    await expect(aiPromptService.remove(scan.id)).rejects.toThrow(/cannot be deleted/i);
  });

  it('keeps the catalog identity fields on edit and on re-seed', async () => {
    await aiPromptService.seedDefaults();
    const scan = (await aiPromptService.list({ kind: 'CODE' })).find((p) => p!.key === IMAGE_SCAN_KEY)!;

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

  // The Reel Studio director moved from GPT-4o to Claude. `target_model` is
  // operator-owned after the first seed, so the catalogue names the model it
  // left behind: a row still on it follows, a row an operator retargeted stays.
  it('moves a seeded row off a superseded model and leaves an operator’s choice alone', async () => {
    const DIRECTOR_KEY = 'reels.director';
    const def = SYSTEM_PROMPT_BY_KEY.get(DIRECTOR_KEY)!;
    expect(def.superseded_models).toContain('gpt-4o');
    expect(def.target_model).not.toBe('gpt-4o');

    await aiPromptService.seedDefaults();
    const seeded = (await aiPromptService.list({ kind: 'CODE' })).find((p) => p!.key === DIRECTOR_KEY)!;
    expect(seeded.target_model).toBe(def.target_model);

    // A deployment seeded under the earlier catalogue still carries the old model.
    await aiPromptService.update(seeded.id, { target_model: 'gpt-4o' });
    await aiPromptService.seedDefaults();
    expect((await aiPromptService.getByKey(DIRECTOR_KEY))!.target_model).toBe(def.target_model);

    // A model a person picked is theirs, however many boots follow.
    await aiPromptService.update(seeded.id, { target_model: 'gpt-4o-mini' });
    await aiPromptService.seedDefaults();
    expect((await aiPromptService.getByKey(DIRECTOR_KEY))!.target_model).toBe('gpt-4o-mini');

    // Cleared to "the configured default" is a choice too.
    await aiPromptService.update(seeded.id, { target_model: '' });
    await aiPromptService.seedDefaults();
    expect((await aiPromptService.getByKey(DIRECTOR_KEY))!.target_model).toBe('');
  });

  it('resets a system prompt back to its shipped default', async () => {
    await aiPromptService.seedDefaults();
    const scan = (await aiPromptService.list({ kind: 'CODE' })).find((p) => p!.key === IMAGE_SCAN_KEY)!;
    await aiPromptService.update(scan.id, { content: 'Broken.' });

    const reset = await aiPromptService.reset(scan.id);
    expect(reset!.content).toBe(SYSTEM_PROMPT_BY_KEY.get(IMAGE_SCAN_KEY)!.content);

    const own = await aiPromptService.create({ name: 'Mine', content: 'my own prompt body' });
    await expect(aiPromptService.reset(own!.id)).rejects.toThrow(/only code prompts/i);
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

describe('matches_default (drift between the library and the catalogue)', () => {
  it('is true for a freshly seeded code prompt, false once edited, true again after a reset', async () => {
    await aiPromptService.seedDefaults();
    const scan = (await aiPromptService.getByKey(IMAGE_SCAN_KEY))!;
    expect(scan.matches_default).toBe(true);

    const edited = await aiPromptService.update(scan.id, { content: 'Only flag nudity.' });
    expect(edited!.matches_default).toBe(false);

    const reset = await aiPromptService.reset(scan.id);
    expect(reset!.matches_default).toBe(true);
  });

  it('is null for an AI prompt, which has no default to drift from', async () => {
    const own = await aiPromptService.create({ name: 'Mine', content: 'my own prompt body' });

    expect(own!.matches_default).toBeNull();
  });

  it('is null for a code row the catalogue no longer names, or one stored without a key', async () => {
    await AiPromptModel.collection.insertMany([
      { kind: 'CODE', key: 'retired.prompt', name: 'Retired', content: 'old body' },
      { kind: 'CODE', name: 'Keyless', content: 'body' },
    ]);

    const rows = await aiPromptService.list({ kind: 'CODE' });

    expect(rows.map((row) => [row.name, row.matches_default])).toEqual(
      expect.arrayContaining([
        ['Retired', null],
        ['Keyless', null],
      ]),
    );
  });
});

describe('aiLibraryDashboard', () => {
  it('counts the library, its drift, and the feature usage each prompt serves', async () => {
    await aiPromptService.seedDefaults();
    const scan = (await aiPromptService.getByKey(IMAGE_SCAN_KEY))!;
    await aiPromptService.update(scan.id, { content: 'Only flag nudity.' });
    await aiPromptService.create({ name: 'Mine', content: 'my own prompt body', is_active: false });
    await OpenAiUsageLogModel.collection.insertMany([
      { task: 'moderation.image_scan', status: 'SUCCESS', created_at: new Date(), total_tokens: 40, cost_usd: 0.2, duration_ms: 0 },
      { task: 'moderation.image_scan', status: 'FAILED', created_at: new Date(), total_tokens: 0, cost_usd: 0, duration_ms: 0 },
    ]);

    const dashboard = await aiLibraryDashboard(7);

    const system = SYSTEM_PROMPTS.filter((p) => p.role === 'SYSTEM').length;
    expect(dashboard).toMatchObject({
      range_days: 7,
      code_prompts: SYSTEM_PROMPTS.length,
      system_prompts: system,
      user_prompts: SYSTEM_PROMPTS.length - system,
      ai_prompts: 1,
      active_ai_prompts: 0,
      edited_code_prompts: 1,
      missing_code_prompts: 0,
      features_total: OPENAI_TASK_KEYS.length,
    });
    expect(dashboard.features_with_prompt).toBe(OPENAI_TASK_KEYS.length - Object.keys(PROMPTLESS_TASKS).length);
    expect(dashboard.prompts).toHaveLength(SYSTEM_PROMPTS.length + 1);
    // Both turns of the image scan are sent on every scan, so both carry its usage.
    for (const key of [IMAGE_SCAN_KEY, `${IMAGE_SCAN_KEY}.user`]) {
      expect(dashboard.prompts.find((p) => p.key === key)).toMatchObject({
        features: ['moderation.image_scan'],
        calls: 2,
        failed_calls: 1,
        total_tokens: 40,
        cost_usd: 0.2,
      });
    }
  });

  it('reports every catalogue prompt as missing before the first seed', async () => {
    const dashboard = await aiLibraryDashboard(500);

    expect(dashboard).toMatchObject({ range_days: 90, code_prompts: 0, missing_code_prompts: SYSTEM_PROMPTS.length });
  });

  it('is read by the AI portal roles only', async () => {
    const { Query } = aiPromptResolvers;

    for (const role of ['SUPER_ADMIN', 'AI_MANAGER']) {
      const dashboard = await Query.aiLibraryDashboard(undefined, { range_days: 1 }, makeContext({ roles: [role] }));
      expect(dashboard.range_days).toBe(1);
    }
    expect(() => Query.aiLibraryDashboard(undefined, {}, makeContext({ roles: ['CITY_ADMIN'] }))).toThrow('Access Denied');
    expect(() => Query.aiLibraryDashboard(undefined, {}, makeContext(null))).toThrow('Not authenticated');
  });
});
