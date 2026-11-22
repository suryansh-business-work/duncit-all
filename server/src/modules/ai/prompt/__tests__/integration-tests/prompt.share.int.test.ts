import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { aiPromptService } from '../../prompt.service';
import { AiPromptModel } from '../../prompt.model';
import { disableShare, enableShare, findSharedPrompt } from '../../prompt.share';
import { setArchived } from '../../prompt.detail';
import { buildAiPromptShareRouter } from '../../prompt.share.router';
import { AiPromptEventModel } from '../../prompt.analytics.model';

const app = express().use('/ai-prompts/share', buildAiPromptShareRouter());
const staff = () => new Types.ObjectId().toString();

async function sharedPrompt(content = 'Write a haiku about {{topic}}.') {
  const prompt = await aiPromptService.create({ name: 'Haiku', description: 'Short poem', content });
  const share = await enableShare(prompt.id, false, staff());
  if (!share.token) throw new Error('enableShare returned no token');
  return { prompt, token: share.token };
}

describe('public share links', () => {
  it('mints a link-sized token and serves only what a stranger may read', async () => {
    const { token } = await sharedPrompt();
    expect(token).toMatch(/^[\w-]{24}$/);
    const found = await findSharedPrompt(token);
    expect(found?.view).toEqual({
      name: 'Haiku',
      description: 'Short poem',
      category: 'General',
      target_model: '',
      content: 'Write a haiku about {{topic}}.',
      variables: [{ name: 'topic', label: 'topic', description: '', required: false, example: '' }],
      token_count: expect.any(Number),
      updated_at: expect.any(String),
    });
    expect(found?.view).not.toHaveProperty('created_by');
  });

  it('keeps the same link across off and on, and kills it on "new link"', async () => {
    const { prompt, token } = await sharedPrompt();
    expect((await disableShare(prompt.id)).enabled).toBe(false);
    expect(await findSharedPrompt(token)).toBeNull();

    const again = await enableShare(prompt.id, false, staff());
    expect(again.token).toBe(token);

    const fresh = await enableShare(prompt.id, true, staff());
    expect(fresh.token).not.toBe(token);
    expect(await findSharedPrompt(token)).toBeNull();
    expect(await findSharedPrompt(fresh.token as string)).not.toBeNull();
  });

  it('stops resolving when the prompt is archived or made inactive, and refuses to share an archived one', async () => {
    const { prompt, token } = await sharedPrompt();
    await setArchived(prompt.id, true, staff());
    expect(await findSharedPrompt(token)).toBeNull();
    await expect(enableShare(prompt.id, false, staff())).rejects.toThrow(/archive/);

    await setArchived(prompt.id, false, staff());
    expect(await findSharedPrompt(token)).not.toBeNull();
    await aiPromptService.update(prompt.id, { is_active: false });
    expect(await findSharedPrompt(token)).toBeNull();
  });

  it('does not query for a token that is not token-shaped', async () => {
    expect(await findSharedPrompt('../../etc')).toBeNull();
    expect(await findSharedPrompt('')).toBeNull();
  });

  it('answers NOT_FOUND when sharing a prompt that does not exist', async () => {
    await expect(enableShare(staff(), false, staff())).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(disableShare(staff())).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('GET/POST /ai-prompts/share/:token', () => {
  it('serves the prompt uncached and unindexed', async () => {
    const { token } = await sharedPrompt();
    const res = await request(app).get(`/ai-prompts/share/${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Haiku', content: 'Write a haiku about {{topic}}.' });
    expect(res.body).not.toHaveProperty('id');
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['x-robots-tag']).toContain('noindex');
  });

  it('answers a dead link exactly like one that never existed', async () => {
    const { prompt, token } = await sharedPrompt();
    await disableShare(prompt.id);
    const dead = await request(app).get(`/ai-prompts/share/${token}`);
    const never = await request(app).get('/ai-prompts/share/AAAAAAAAAAAAAAAAAAAAAAAA');
    expect(dead.status).toBe(404);
    expect(dead.body).toEqual(never.body);
  });

  it('records a public event with the visitor’s platform, campaign and device — and no IP', async () => {
    const { prompt, token } = await sharedPrompt();
    const res = await request(app)
      .post(`/ai-prompts/share/${token}/events`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile')
      .send({ type: 'OPEN_IN_PLATFORM', platform: 'CLAUDE', source: 'LinkedIn<script>', referrer: 'https://www.google.com/search?q=secret', visitor: 'v-123' });
    expect(res.status).toBe(204);

    const [event] = await AiPromptEventModel.find({ prompt_id: prompt.id }).lean();
    expect(event).toMatchObject({
      type: 'OPEN_IN_PLATFORM',
      surface: 'PUBLIC',
      platform: 'CLAUDE',
      source: 'linkedinscript',
      referrer_host: 'www.google.com',
      device: 'mobile',
      visitor: 'v-123',
    });
    expect(JSON.stringify(event)).not.toContain('secret');
    expect((await AiPromptModel.findById(prompt.id).lean())?.stats?.total_hits).toBe(1);
  });

  it('refuses event types the public page may not report, and events on a dead link', async () => {
    const { prompt, token } = await sharedPrompt();
    expect((await request(app).post(`/ai-prompts/share/${token}/events`).send({ type: 'DETAIL_VIEW' })).status).toBe(400);
    expect((await request(app).post(`/ai-prompts/share/${token}/events`).send({})).status).toBe(400);
    await disableShare(prompt.id);
    expect((await request(app).post(`/ai-prompts/share/${token}/events`).send({ type: 'PUBLIC_VIEW' })).status).toBe(404);
    expect(await AiPromptEventModel.countDocuments({})).toBe(0);
  });
});
