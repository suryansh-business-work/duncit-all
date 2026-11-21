import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { buildAiPromptFeedRouter } from '../../prompt.router';
import { AiPromptEventModel } from '../../prompt.analytics.model';
import { requestIdentity } from '@observability/requestIdentity';
import { UserModel } from '@modules/access/user/user.model';
import { aiPromptService } from '../../prompt.service';
import { AiPromptModel } from '../../prompt.model';
import { AiPromptVersionModel } from '../../prompt.version.model';
import { listVersions, restoreVersion } from '../../prompt.history';
import { promptDetail, setArchived } from '../../prompt.detail';

/**
 * Version history is written by schema middleware, so these specs go through
 * the ordinary service paths and read back what the hook recorded.
 */

async function editor(first = 'Asha') {
  return UserModel.create({ auth: { email: `${first.toLowerCase()}@duncit.test` }, profile: { first_name: first, last_name: 'Rao' } });
}

const as = <T>(id: Types.ObjectId | string, fn: () => Promise<T>) => requestIdentity.run({ user: { id: String(id) } }, fn);

/** A seeded code prompt matching the filter; fails the spec if the catalogue has none. */
async function codePrompt(filter: Record<string, unknown> = {}) {
  await aiPromptService.seedDefaults();
  const doc = await AiPromptModel.findOne({ kind: 'CODE', ...filter }).lean();
  if (!doc) throw new Error('the catalogue has no code prompt matching ' + JSON.stringify(filter));
  return doc;
}

async function versionsOf(id: string) {
  return AiPromptVersionModel.find({ prompt_id: id }).sort({ version: 1 }).lean();
}

describe('prompt version history', () => {
  it('records the create and each tracked edit, attributed to whoever was signed in', async () => {
    const user = await editor();
    const created = await as(user._id, () => aiPromptService.create({ name: 'Greeter', content: 'Say hello.' }));
    await as(user._id, () => aiPromptService.update(created.id, { content: 'Say hello warmly.', category: 'Support' }));

    const rows = await versionsOf(created.id);
    expect(rows.map((r) => [r.version, r.change])).toEqual([
      [1, 'CREATE'],
      [2, 'UPDATE'],
    ]);
    expect(rows[1].changed_fields.sort()).toEqual(['category', 'content']);
    expect(rows[1].content).toBe('Say hello warmly.');
    expect(rows[0].content).toBe('Say hello.');
    expect(rows[1].edited_by_name).toBe('Asha Rao');
    expect(String(rows[1].edited_by)).toBe(String(user._id));
    expect((await AiPromptModel.findById(created.id).lean())?.revision).toBe(2);
  });

  it('writes nothing for a save that changed no tracked field', async () => {
    const created = await aiPromptService.create({ name: 'Quiet', content: 'Stay quiet.' });
    await aiPromptService.update(created.id, { content: 'Stay quiet.' });
    expect(await AiPromptVersionModel.countDocuments({ prompt_id: created.id })).toBe(1);
  });

  it('labels a change made with nobody signed in as SEED', async () => {
    const created = await aiPromptService.create({ name: 'Booted', content: 'v1' });
    await aiPromptService.update(created.id, { content: 'v2' });
    const rows = await versionsOf(created.id);
    expect(rows.map((r) => r.change)).toEqual(['CREATE', 'SEED']);
    expect(rows[1].edited_by).toBeNull();
    expect(rows[1].edited_by_name).toBeNull();
  });

  it('keeps a BASELINE of a prompt saved before history existed, before its first edit', async () => {
    const _id = new Types.ObjectId();
    // A row as an older server wrote it: no revision, no versions.
    await AiPromptModel.collection.insertOne({ _id, kind: 'AI', key: 'legacy', name: 'Legacy', content: 'Old body', category: 'General', is_active: true });
    const user = await editor('Ravi');
    await as(user._id, () => aiPromptService.update(String(_id), { content: 'New body' }));

    const rows = await versionsOf(String(_id));
    expect(rows.map((r) => [r.version, r.change, r.content])).toEqual([
      [1, 'BASELINE', 'Old body'],
      [2, 'UPDATE', 'New body'],
    ]);
    expect(rows[0].edited_by_name).toBeNull();
  });

  it('lists newest first with token counts', async () => {
    const created = await aiPromptService.create({ name: 'Lister', content: 'one' });
    await aiPromptService.update(created.id, { content: 'one two three four five six seven eight' });
    const list = await listVersions(created.id);
    expect(list.map((v) => v.version)).toEqual([2, 1]);
    expect(list[0].token_count).toBeGreaterThan(list[1].token_count);
    expect(list[0].created_at).toEqual(expect.any(String));
    expect(await listVersions('not-an-id')).toEqual([]);
  });

  it('restores an earlier version as a new version, so history only grows', async () => {
    const created = await aiPromptService.create({ name: 'Restorable', content: 'first', category: 'A' });
    await aiPromptService.update(created.id, { content: 'second', category: 'B' });

    const restored = await restoreVersion(created.id, 1);
    expect(restored).toMatchObject({ content: 'first', category: 'A' });
    const rows = await versionsOf(created.id);
    expect(rows.map((r) => r.version)).toEqual([1, 2, 3]);
    expect(rows[2].content).toBe('first');
  });

  it('refuses to restore a version that does not exist, or a prompt id that is not one', async () => {
    const created = await aiPromptService.create({ name: 'Short', content: 'only' });
    await expect(restoreVersion(created.id, 9)).rejects.toThrow('Version 9 not found');
    await expect(restoreVersion('nope', 1)).rejects.toThrow('Prompt not found');
  });

  it('keeps a code prompt’s required placeholders when restoring', async () => {
    const code = await codePrompt({ 'variables.required': true });
    const id = String(code._id);
    // A version without the required placeholder, written straight into history.
    await AiPromptVersionModel.create({ prompt_id: id, version: 99, change: 'UPDATE', content: 'no placeholders here', name: code.name });
    await expect(restoreVersion(id, 99)).rejects.toThrow(/needs \{\{/);
  });
});

describe('prompt archive and detail', () => {
  it('archives and unarchives an AI prompt, naming who archived it', async () => {
    const user = await editor('Meera');
    const created = await aiPromptService.create({ name: 'Old idea', content: 'Retire me.' });

    const archived = await setArchived(created.id, true, String(user._id));
    expect(archived.archived_at).toEqual(expect.any(String));
    expect(archived.archived_by_name).toBe('Meera Rao');

    const back = await setArchived(created.id, false, String(user._id));
    expect(back.archived_at).toBeNull();
    expect(back.archived_by_name).toBeNull();
  });

  it('leaves archived prompts out of every list but the Archived one, and off the feed', async () => {
    const kept = await aiPromptService.create({ name: 'Kept', content: 'Stay listed.' });
    const gone = await aiPromptService.create({ name: 'Gone', content: 'Leave the list.' });
    await setArchived(gone.id, true, new Types.ObjectId().toString());

    expect((await aiPromptService.list({ kind: 'AI' })).map((p) => p.name)).toEqual(['Kept']);
    expect((await aiPromptService.list({ archived: true })).map((p) => p.name)).toEqual(['Gone']);
    expect((await aiPromptService.list({ archived: true })).every((p) => p.archived_at)).toBe(true);

    const feed = express().use('/ai-prompts', buildAiPromptFeedRouter());
    expect((await request(feed).get(`/ai-prompts/prompt.json?key=${gone.key}`)).status).toBe(404);
    const list = await request(feed).get('/ai-prompts/prompts.json');
    expect(list.body.prompts.map((p: { name: string }) => p.name)).toEqual(['Kept']);
    expect((await request(feed).get(`/ai-prompts/prompt.json?key=${kept.key}`)).status).toBe(200);
  });

  it('counts a single-prompt feed read as a FEED_HIT, which the list then shows', async () => {
    const p = await aiPromptService.create({ name: 'Fed', content: 'Fetch me.' });
    const feed = express().use('/ai-prompts', buildAiPromptFeedRouter());
    await request(feed).get(`/ai-prompts/prompt.json?key=${p.key}&utm_source=docs`).set('Referer', 'https://example.org/a');
    // Recorded after the answer is sent, so give it a moment to land.
    for (let i = 0; i < 50 && (await AiPromptEventModel.countDocuments({})) === 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const [event] = await AiPromptEventModel.find({}).lean();
    expect(event).toMatchObject({ type: 'FEED_HIT', surface: 'FEED', source: 'docs', referrer_host: 'example.org' });
    expect((await aiPromptService.get(p.id))?.total_hits).toBe(1);
  });

  it('refuses to archive a code prompt, because a call site reads it', async () => {
    const code = await codePrompt();
    await expect(setArchived(String(code._id), true, new Types.ObjectId().toString())).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('answers NOT_FOUND for a prompt that is not there', async () => {
    await expect(setArchived(new Types.ObjectId().toString(), true, 'x')).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('assembles the detail: the prompt, no review yet, sharing off, zero hits and its history', async () => {
    const created = await aiPromptService.create({ name: 'Detailed', content: 'Explain {{topic}}.' });
    const detail = await promptDetail(created.id);
    expect(detail).toMatchObject({
      prompt: { id: created.id, name: 'Detailed' },
      archived_at: null,
      quality: null,
      share: { enabled: false, token: null },
      total_hits: 0,
      last_hit_at: null,
    });
    expect(detail?.versions.map((v) => v.change)).toEqual(['CREATE']);
    expect(await promptDetail('bad-id')).toBeNull();
    expect(await promptDetail(new Types.ObjectId().toString())).toBeNull();
  });
});
