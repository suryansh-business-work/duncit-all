jest.mock('@modules/platform/backgroundJob/backgroundJob.runner', () => ({ scheduleJob: jest.fn() }));
jest.mock('@modules/crm/marketing/igLeads/igLead.serper', () => {
  const actual = jest.requireActual('@modules/crm/marketing/igLeads/igLead.serper');
  return { ...actual, serperReady: jest.fn(), searchPlaces: jest.fn(), searchProfiles: jest.fn() };
});
jest.mock('@modules/crm/marketing/igLeads/igLead.discovery', () => ({ discoveryReader: jest.fn() }));
jest.mock('@modules/crm/marketing/social/social.llm', () => {
  const actual = jest.requireActual('@modules/crm/marketing/social/social.llm');
  return { ...actual, askForJson: jest.fn() };
});

import type { AuthUser } from '@context';
import { scheduleJob } from '@modules/platform/backgroundJob/backgroundJob.runner';
import { BackgroundJobModel, type LeanBackgroundJob } from '@modules/platform/backgroundJob/backgroundJob.model';
import { searchPlaces, searchProfiles, serperReady } from '@modules/crm/marketing/igLeads/igLead.serper';
import { discoveryReader } from '@modules/crm/marketing/igLeads/igLead.discovery';
import { askForJson } from '@modules/crm/marketing/social/social.llm';
import { LeadCandidateModel } from '../../leadResearch.model';
import { leadDiscoveryService } from '../../leadResearch.discovery';
import { discoverLeadsStep, nameFromTitle } from '../../leadResearch.discoveryStep';

/**
 * A lead discovery: planned, run one search at a time as a background job,
 * every find saved through the queue path (de-duplicated and scored), with
 * blocked searches reported rather than hidden.
 */

const asha = { id: 'crm-1', email: 'asha@duncit.com', roles: ['CRM_MANAGER'] } as AuthUser;
const ravi = { id: 'crm-2', email: 'ravi@duncit.com', roles: ['CRM_MANAGER'] } as AuthUser;
const ask = askForJson as jest.Mock;

const barn = {
  title: 'The Barn Cafe',
  address: '12 Vibhuti Khand, Gomti Nagar, Lucknow',
  phone: '098765 43210',
  website: 'https://www.instagram.com/thebarn/',
  category: 'Cafe',
  rating: 4.5,
  rating_count: 120,
  maps_url: 'https://www.google.com/maps?cid=1',
};

beforeEach(() => {
  (serperReady as jest.Mock).mockResolvedValue(true);
  (discoveryReader as jest.Mock).mockResolvedValue(null);
  ask.mockImplementation(({ task }: { task: string }) =>
    Promise.resolve(task === 'crm.lead_research_plan' ? { queries: ['cafe events Gomti Nagar'] } : { leads: [] })
  );
});

const jobOf = async (id: string) => (await BackgroundJobModel.findById(id).lean<LeanBackgroundJob>()) as LeanBackgroundJob;

describe('start', () => {
  it('plans the searches and starts a background job', async () => {
    const view = await leadDiscoveryService.start(asha, { lead_type: 'VENUE_LEAD', city: 'Lucknow', locality: 'Gomti Nagar', category: 'cafe', target_count: 5, min_score: 0 });
    expect(view).toMatchObject({
      status: 'RUNNING',
      label: 'Discover 5 venue leads in Gomti Nagar, Lucknow',
      queries: ['cafe events Gomti Nagar'],
      sources: ['GOOGLE_MAPS', 'INSTAGRAM'],
      target_count: 5,
      searches_run: 0,
      stats: { found: 0, saved: 0 },
    });
    expect(scheduleJob).toHaveBeenCalledWith(view.id);
  });

  it('searches the typed words and says so when the AI plan is unavailable', async () => {
    ask.mockRejectedValue(new Error('AI off'));
    const view = await leadDiscoveryService.start(asha, { lead_type: 'HOST_LEAD', city: 'Lucknow', category: 'pottery' });
    expect(view).toMatchObject({ queries: ['pottery Lucknow'], sources: ['INSTAGRAM'], target_count: 20 });
    expect(view.plan_note).toContain('AI off');
  });

  it.each([
    [{ city: ' ' }, 'Say which city'],
    [{ target_count: 0 }, 'Ask for 1-100'],
    [{ target_count: 101 }, 'Ask for 1-100'],
    [{ min_score: 120 }, 'between 0 and 100'],
    [{ sources: ['WEB'] }, 'cannot be searched'],
  ])('refuses %j', async (change, message) => {
    await expect(leadDiscoveryService.start(asha, { lead_type: 'VENUE_LEAD', city: 'Lucknow', ...change })).rejects.toThrow(message);
  });

  it('refuses when Serper is not set up, and a third discovery at once', async () => {
    (serperReady as jest.Mock).mockResolvedValueOnce(false);
    await expect(leadDiscoveryService.start(asha, { lead_type: 'VENUE_LEAD', city: 'Lucknow' })).rejects.toMatchObject({ extensions: { code: 'NOT_CONFIGURED' } });
    await leadDiscoveryService.start(asha, { lead_type: 'VENUE_LEAD', city: 'Lucknow' });
    await leadDiscoveryService.start(asha, { lead_type: 'VENUE_LEAD', city: 'Pune' });
    await expect(leadDiscoveryService.start(asha, { lead_type: 'VENUE_LEAD', city: 'Delhi' })).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });
});

describe('discoverLeadsStep', () => {
  it('turns a Google Maps search into scored candidates with the AI quoting their listing', async () => {
    const view = await leadDiscoveryService.start(asha, { lead_type: 'VENUE_LEAD', city: 'Lucknow', target_count: 5, sources: ['GOOGLE_MAPS'] });
    (searchPlaces as jest.Mock).mockResolvedValue([barn]);
    ask.mockResolvedValue({ leads: [{ lead: 1, items: [{ key: 'capacity', verdict: 'MET', source: 'S1', quote: 'Rated 4.5 from 120 reviews' }] }] });
    expect(await discoverLeadsStep(await jobOf(view.id))).toBe(false);
    expect(searchPlaces).toHaveBeenCalledWith('cafe events Gomti Nagar Lucknow');
    const job = await jobOf(view.id);
    expect(job).toMatchObject({ succeeded: 1, failed: 0, cursor: 1, params: expect.objectContaining({ stats: expect.objectContaining({ found: 1, saved: 1, qualifying: 1 }) }) });
    const candidate = await LeadCandidateModel.findOne({ job_id: view.id }).lean();
    expect(candidate).toMatchObject({ name: 'The Barn Cafe', instagram_handle: 'thebarn', website: '', phones: ['09876543210'], origin: 'DISCOVERY' });
    // Google Maps listing (5, from the listing it found) + capacity (8, quoted by the AI) + uniqueness (2).
    expect(candidate?.score).toBe(15);
    expect(candidate?.items.find((i) => i.item_key === 'capacity')).toMatchObject({ via: 'AI', source_url: barn.maps_url });
  });

  it('reads Instagram profiles it found and never reads one already queued', async () => {
    const view = await leadDiscoveryService.start(asha, { lead_type: 'HOST_LEAD', city: 'Lucknow', target_count: 5 });
    const read = jest.fn().mockResolvedValue({ username: 'claywork', name: 'Clay Work', bio: 'Pottery classes. hello@claywork.in', website: '', followers: 2400, follows: 1, media_count: 30, profile_picture_url: '', last_post_at: new Date().toISOString(), last_post_url: '' });
    (discoveryReader as jest.Mock).mockResolvedValue({ read });
    (searchProfiles as jest.Mock).mockResolvedValue([{ username: 'claywork', snippet: 'Clay Work (@claywork) • Instagram photos and videos' }]);
    await discoverLeadsStep(await jobOf(view.id));
    expect(await LeadCandidateModel.findOne({ instagram_handle: 'claywork' }).lean()).toMatchObject({ name: 'Clay Work', emails: ['hello@claywork.in'] });
    const again = await leadDiscoveryService.retry(asha, (await leadDiscoveryService.cancel(asha, view.id)).id);
    await discoverLeadsStep(await jobOf(again.id));
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('reports a blocked search and carries on', async () => {
    const view = await leadDiscoveryService.start(asha, { lead_type: 'VENUE_LEAD', city: 'Lucknow', sources: ['GOOGLE_MAPS', 'INSTAGRAM'] });
    (searchPlaces as jest.Mock).mockRejectedValue(new Error('Serper quota exhausted'));
    expect(await discoverLeadsStep(await jobOf(view.id))).toBe(true);
    expect(await jobOf(view.id)).toMatchObject({ failed: 1, failures: [{ id: 'GOOGLE_MAPS: cafe events Gomti Nagar', message: 'Serper quota exhausted' }] });
  });

  it('stops once the target is reached or there is nothing left to search', async () => {
    const view = await leadDiscoveryService.start(asha, { lead_type: 'VENUE_LEAD', city: 'Lucknow', target_count: 1 });
    await BackgroundJobModel.updateOne({ _id: view.id }, { $set: { succeeded: 1 } });
    expect(await discoverLeadsStep(await jobOf(view.id))).toBe(false);
    expect(searchPlaces).not.toHaveBeenCalled();
  });
});

describe('get, list, cancel and retry', () => {
  it('lets any CRM manager read a discovery but only its starter cancel it', async () => {
    const view = await leadDiscoveryService.start(asha, { lead_type: 'VENUE_LEAD', city: 'Lucknow' });
    expect((await leadDiscoveryService.get(ravi, view.id)).id).toBe(view.id);
    expect((await leadDiscoveryService.list(10)).map((j) => j.id)).toEqual([view.id]);
    await expect(leadDiscoveryService.cancel(ravi, view.id)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(leadDiscoveryService.retry(asha, view.id)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    expect((await leadDiscoveryService.cancel(asha, view.id)).status).toBe('CANCELLED');
    const retried = await leadDiscoveryService.retry(asha, view.id);
    expect(retried).toMatchObject({ status: 'RUNNING', queries: view.queries });
  });

  it('says when the job does not exist', async () => {
    await expect(leadDiscoveryService.get(asha, '64b7f0c2a1e4c9d3f0a1b2c3')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    await expect(leadDiscoveryService.get(asha, 'nope')).rejects.toThrow('not a discovery job id');
  });
});

describe('nameFromTitle', () => {
  it('takes the name off an Instagram search title', () => {
    expect(nameFromTitle('Paws & Play (@pawsandplay) • Instagram photos and videos')).toBe('Paws & Play');
    expect(nameFromTitle('')).toBe('');
  });
});
