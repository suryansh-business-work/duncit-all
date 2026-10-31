/**
 * Instagram leads reach the pipeline two ways: a search feeds what it saved
 * as its last step, and the boot migration carries over every profile saved
 * before the pipeline existed — once, however many boots.
 *
 * The search's outside edges (Serper, Business Discovery, the AI) are stood
 * in for; everything from the search row to the pipeline lead is real.
 */
jest.mock('../../../igLeads/igLead.serper', () => ({
  serperReady: jest.fn().mockResolvedValue(true),
  searchProfiles: jest.fn(),
}));
jest.mock('../../../igLeads/igLead.discovery', () => ({
  discoveryReader: jest.fn(),
  discoveryReady: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../../social/social.llm', () => ({
  askForJson: jest.fn(),
  stringList: (value: unknown, limit = 6) => (Array.isArray(value) ? value.filter((v) => typeof v === 'string').slice(0, limit) : []),
  text: (value: unknown) => (typeof value === 'string' ? value.trim() : ''),
}));

import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { IgLeadModel, IgLeadSearchModel } from '../../../igLeads/igLead.model';
import { startSearch } from '../../../igLeads/igLead.search';
import { searchProfiles } from '../../../igLeads/igLead.serper';
import { discoveryReader } from '../../../igLeads/igLead.discovery';
import { askForJson } from '../../../social/social.llm';
import { MarketingRunModel } from '../../../runs/marketingRun.model';
import { MarketingLeadModel } from '../../marketingLead.model';
import { marketingLeadService as svc } from '../../marketingLead.service';
import { feedIgLeadsToPipeline, igLeadToInput, migrateIgLeadsToPipeline } from '../../marketingLead.pipeline';

const search = searchProfiles as jest.Mock;
const reader = discoveryReader as jest.Mock;
const ai = askForJson as jest.Mock;

const makeUser = () =>
  UserModel.create({
    auth: { email: 'asha@duncit.com' },
    profile: { first_name: 'Asha', last_name: 'Staff' },
    metadata: { status: 'ACTIVE', role_keys: ['MARKETING_MANAGER'] },
  });

const igLead = (username: string, over: Record<string, unknown> = {}) =>
  IgLeadModel.create({ username, name: `${username} shop`, website: `https://${username}.in`, emails: [`hi@${username}.in`], phones: ['919876543210'], fit_score: 61, fit_reason: 'Fits', ...over });

const waitForSearch = async (id: string) => {
  for (let tries = 0; tries < 100; tries += 1) {
    const doc = await IgLeadSearchModel.findById(id).lean();
    if (doc && doc.status !== 'RUNNING') return doc;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('the search never finished');
};

afterEach(async () => {
  await Promise.all([
    MarketingLeadModel.deleteMany({}),
    IgLeadModel.deleteMany({}),
    IgLeadSearchModel.deleteMany({}),
    MarketingRunModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
});

describe('igLeadToInput', () => {
  it('names the lead after the profile, keeps only usable contacts, and points back at the Instagram lead', () => {
    const id = new Types.ObjectId();
    const searchId = new Types.ObjectId();
    expect(
      igLeadToInput({
        _id: id,
        username: 'pawsome',
        name: '',
        website: 'https://pawsome.in',
        emails: ['hi@pawsome.in', 'broken@'],
        phones: ['919876543210', '12'],
        fit_score: 82,
        fit_reason: 'Trainer',
        search_id: searchId,
      } as never)
    ).toEqual({
      name: '@pawsome',
      pipeline: 'GENERAL',
      source: 'INSTAGRAM',
      instagram_handle: 'pawsome',
      website: 'https://pawsome.in',
      emails: ['hi@pawsome.in'],
      phones: ['919876543210'],
      score: 82,
      score_reason: 'Trainer',
      source_ref: { ig_lead_id: String(id), search_id: String(searchId) },
    });
    expect(igLeadToInput({ _id: id, username: 'x', name: 'X Shop' } as never)).toMatchObject({ name: 'X Shop', emails: [], phones: [], score: null, source_ref: { ig_lead_id: String(id), search_id: '' } });
  });
});

describe('migrateIgLeadsToPipeline', () => {
  it('gives every Instagram lead a pipeline lead once, merging into a lead already known by handle', async () => {
    const user = { id: String((await makeUser())._id) };
    const a = await igLead('pawsome');
    await igLead('bakery', { phones: [], emails: [] });
    const manual = (await svc.create({ name: 'Cat Cafe', instagram_handle: 'catcafe', pipeline: 'VENUE' }, user)).lead;
    const c = await igLead('catcafe', { phones: [], emails: ['meow@catcafe.in'], fit_score: 40 });

    expect(await migrateIgLeadsToPipeline()).toEqual({ added: 2, merged: 1, skipped: 0 });
    expect(await MarketingLeadModel.countDocuments()).toBe(3);
    const fromA = await MarketingLeadModel.findOne({ instagram_handle: 'pawsome' }).lean();
    expect(fromA).toMatchObject({ name: 'pawsome shop', source: 'INSTAGRAM', score: 61, phones: ['919876543210'], source_ref: { ig_lead_id: String(a._id) } });
    expect(fromA?.timeline[0]).toMatchObject({ kind: 'CREATED', by_name: 'System' });
    const merged = await svc.get(manual.id);
    expect(merged).toMatchObject({ name: 'Cat Cafe', pipeline: 'VENUE', score: 40, emails: ['meow@catcafe.in'], source_ref: { ig_lead_id: String(c._id) } });

    expect(await migrateIgLeadsToPipeline()).toEqual({ added: 0, merged: 0, skipped: 3 });
    expect(await MarketingLeadModel.countDocuments()).toBe(3);
  });
});

describe('feedIgLeadsToPipeline', () => {
  it('feeds the named profiles under the person, and nothing when there are none', async () => {
    const user = String((await makeUser())._id);
    await igLead('pawsome');
    expect(await feedIgLeadsToPipeline([], user)).toEqual({ added: 0, merged: 0 });
    expect(await feedIgLeadsToPipeline(['pawsome', 'unknown'], user)).toEqual({ added: 1, merged: 0 });
    expect(await feedIgLeadsToPipeline(['pawsome'], null)).toEqual({ added: 0, merged: 1 });
    const lead = await MarketingLeadModel.findOne({ instagram_handle: 'pawsome' }).lean();
    expect(lead?.timeline.map((e) => [e.kind, e.by_name])).toEqual([
      ['CREATED', 'Asha Staff'],
      ['SOURCE', 'System'],
    ]);
  });
});

describe('an Instagram search', () => {
  it('ends by adding what it saved to the pipeline, as a step of its own run', async () => {
    const user = String((await makeUser())._id);
    ai.mockResolvedValueOnce({ summary: 'Dog trainers in Pune', queries: ['dog trainer pune instagram'] });
    ai.mockResolvedValueOnce({ scores: [{ username: 'pawsome', score: 82, reason: 'Trainer in Pune' }] });
    search.mockResolvedValue([{ username: 'pawsome', snippet: 'Pawsome Trainers · Call 98765 43210' }]);
    reader.mockResolvedValue({
      read: async (username: string) => ({
        username,
        name: 'Pawsome Trainers',
        bio: 'Dog training in Pune. mail: hi@pawsome.in',
        website: 'https://pawsome.in',
        followers: 1200,
        follows: 10,
        media_count: 50,
        profile_picture_url: '',
      }),
    });

    const started = await startSearch({ brief: 'Dog trainers in Pune with a thousand followers or more' }, user);
    const done = await waitForSearch(String(started._id));
    expect(done).toMatchObject({ status: 'DONE', found: 1, added: 1 });

    const saved = await IgLeadModel.findOne({ username: 'pawsome' }).lean();
    expect(saved).toMatchObject({ fit_score: 82, emails: ['hi@pawsome.in'], phones: ['919876543210'] });

    const lead = await MarketingLeadModel.findOne({ instagram_handle: 'pawsome' }).lean();
    expect(lead).toMatchObject({
      name: 'Pawsome Trainers',
      pipeline: 'GENERAL',
      source: 'INSTAGRAM',
      score: 82,
      score_reason: 'Trainer in Pune',
      emails: ['hi@pawsome.in'],
      phones: ['919876543210'],
      phone_keys: ['9876543210'],
      website_host: 'pawsome.in',
      source_ref: { ig_lead_id: String(saved?._id), search_id: String(started._id) },
    });
    expect(lead?.timeline).toEqual([expect.objectContaining({ kind: 'CREATED', text: 'Added from INSTAGRAM', by_name: 'Asha Staff' })]);

    const run = await MarketingRunModel.findOne({ workflow: 'LEAD_SEARCH' }).lean();
    expect(run?.status).toBe('COMPLETED');
    expect(run?.steps.map((s) => [s.key, s.status])).toEqual([
      ['plan', 'OK'],
      ['search', 'OK'],
      ['read', 'OK'],
      ['score', 'OK'],
      ['save', 'OK'],
      ['pipeline', 'OK'],
    ]);
    expect(run?.steps.at(-1)).toMatchObject({ label: 'Add to the lead pipeline', output_summary: '1 added, 0 merged' });
  });
});
