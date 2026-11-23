jest.mock('@modules/crm/leadDuplicate/leadDuplicate.service', () => ({
  findLeadDuplicates: jest.fn(),
  findInstagramDuplicates: jest.fn(),
}));
jest.mock('@modules/crm/emailVerification/emailVerification.service', () => ({
  emailVerificationService: { statuses: jest.fn() },
}));
jest.mock('@modules/crm/emailVerification/emailVerification.check', () => ({ checkAndRecord: jest.fn() }));
jest.mock('@modules/crm/marketing/igLeads/igLead.discovery', () => ({ discoveryReader: jest.fn() }));
jest.mock('@modules/crm/marketing/igLeads/igLead.serper', () => ({
  searchPlaces: jest.fn(),
  serperReady: jest.fn(),
  profileUsername: jest.fn(),
}));
jest.mock('@utils/open-graph', () => ({ fetchOpenGraph: jest.fn() }));

import { findInstagramDuplicates, findLeadDuplicates } from '@modules/crm/leadDuplicate/leadDuplicate.service';
import { emailVerificationService } from '@modules/crm/emailVerification/emailVerification.service';
import { checkAndRecord } from '@modules/crm/emailVerification/emailVerification.check';
import { discoveryReader } from '@modules/crm/marketing/igLeads/igLead.discovery';
import { searchPlaces, serperReady } from '@modules/crm/marketing/igLeads/igLead.serper';
import { fetchOpenGraph } from '@utils/open-graph';
import { isExternalCheck, namesMatch, runAutoChecks } from '../../leadQuality.checks';
import type { LeadFacts } from '../../leadQuality.lead';
import type { AutoCheck, QualityItem } from '../../leadQuality.rules';

/**
 * The automatic checks say VERIFIED or FAILED only when their source settles
 * it; anything less stays PENDING with the reason. Sources that call out
 * (Instagram, Google Maps, the website) run only when asked.
 */

const facts: LeadFacts = {
  id: 'lead1',
  entity_type: 'VENUE_LEAD',
  name: 'The Barn Cafe',
  city: 'Lucknow',
  area: 'Gomti Nagar',
  address: '',
  emails: ['hello@thebarn.in'],
  phones: ['9876543210'],
  website: 'https://thebarn.in',
  instagram_handle: 'thebarn',
  lead_status: 'New',
};

const item = (key: string, auto_check: AutoCheck, threshold: number | null = null): QualityItem => ({
  key,
  criterion_key: key,
  sub_key: null,
  name: key,
  points: 500,
  mandatory: false,
  auto_check,
  threshold,
  guidance: '',
});

const options = { external: true, actor: { id: 'u1', email: 'u1@duncit.com' }, now: new Date('2026-11-22T00:00:00Z') };

const profile = {
  username: 'thebarn',
  name: 'The Barn',
  bio: 'Cafe and events',
  website: 'https://thebarn.in',
  followers: 1500,
  follows: 10,
  media_count: 40,
  profile_picture_url: '',
  last_post_at: '2026-11-01T10:00:00Z',
  last_post_url: 'https://www.instagram.com/p/abc/',
};

const read = jest.fn();

beforeEach(() => {
  (findLeadDuplicates as jest.Mock).mockResolvedValue([]);
  (findInstagramDuplicates as jest.Mock).mockResolvedValue([]);
  (emailVerificationService.statuses as jest.Mock).mockResolvedValue([]);
  (discoveryReader as jest.Mock).mockResolvedValue({ read });
  read.mockResolvedValue(profile);
  (serperReady as jest.Mock).mockResolvedValue(true);
  (searchPlaces as jest.Mock).mockResolvedValue([]);
  (fetchOpenGraph as jest.Mock).mockResolvedValue({ title: null, description: null, image: null, site_name: null });
});

describe('namesMatch', () => {
  it('matches when most of the lead name words appear in the listing title', () => {
    expect(namesMatch('The Barn Cafe', 'Barn Cafe & Bistro')).toBe(true);
    expect(namesMatch('The Barn Cafe', 'Coffee House')).toBe(false);
    expect(namesMatch('', 'Anything')).toBe(false);
  });
});

describe('isExternalCheck', () => {
  it('marks the checks that call out', () => {
    expect(isExternalCheck('GOOGLE_MAPS_LISTING')).toBe(true);
    expect(isExternalCheck('CRM_UNIQUENESS')).toBe(false);
    expect(isExternalCheck('EMAIL_DELIVERABLE')).toBe(false);
  });
});

describe('CRM_UNIQUENESS', () => {
  it('verifies a lead nobody else shares an identity with', async () => {
    const run = await runAutoChecks(facts, [item('dedup', 'CRM_UNIQUENESS')], options);
    expect(run.outcomes.get('dedup')).toMatchObject({ status: 'VERIFIED' });
    expect(findLeadDuplicates).toHaveBeenCalledWith(expect.objectContaining({ website: 'https://thebarn.in' }), { entity_type: 'VENUE_LEAD', id: 'lead1' });
  });

  it('fails a lead whose phone is on another lead, naming that lead', async () => {
    (findLeadDuplicates as jest.Mock).mockResolvedValue([{ field: 'PHONE', value: '9876543210', entity_type: 'HOST_LEAD', lead_id: 'h1', lead_name: 'Ravi', city: '', lead_status: '' }]);
    const run = await runAutoChecks(facts, [item('dedup', 'CRM_UNIQUENESS')], options);
    expect(run.outcomes.get('dedup')).toMatchObject({ status: 'FAILED', evidence: expect.stringContaining('Host lead "Ravi" (h1)') });
  });

  it('fails a lead whose Instagram profile is on another lead', async () => {
    (findInstagramDuplicates as jest.Mock).mockResolvedValue([{ entity_type: 'VENUE_LEAD', lead_id: 'v2', lead_name: 'Barn 2', city: '' }]);
    const run = await runAutoChecks(facts, [item('dedup', 'CRM_UNIQUENESS')], options);
    expect(run.outcomes.get('dedup')).toMatchObject({ status: 'FAILED', source_url: 'https://www.instagram.com/thebarn/' });
  });

  it('draws no conclusion for a lead with nothing to compare', async () => {
    const bare = { ...facts, emails: [], phones: [], website: '', instagram_handle: '' };
    const run = await runAutoChecks(bare, [item('dedup', 'CRM_UNIQUENESS')], options);
    expect(run.outcomes.has('dedup')).toBe(false);
  });
});

describe('EMAIL_DELIVERABLE', () => {
  it('verifies from the Email Verifier record', async () => {
    (emailVerificationService.statuses as jest.Mock).mockResolvedValue([{ email: 'hello@thebarn.in', status: 'VERIFIED', checked_at: '2026-11-20T00:00:00Z', suggestion: '' }]);
    const run = await runAutoChecks(facts, [item('email', 'EMAIL_DELIVERABLE')], { ...options, external: false });
    expect(run.outcomes.get('email')).toMatchObject({ status: 'VERIFIED', evidence: expect.stringContaining('2026-11-20') });
    expect(checkAndRecord).not.toHaveBeenCalled();
  });

  it('fails when every email on the lead is undeliverable', async () => {
    (emailVerificationService.statuses as jest.Mock).mockResolvedValue([{ email: 'hello@thebarn.in', status: 'INVALID', checked_at: '2026-11-20T00:00:00Z', suggestion: '' }]);
    const run = await runAutoChecks(facts, [item('email', 'EMAIL_DELIVERABLE')], options);
    expect(run.outcomes.get('email')?.status).toBe('FAILED');
  });

  it('checks unchecked emails live only when external checks are on', async () => {
    (emailVerificationService.statuses as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ email: 'hello@thebarn.in', status: 'VERIFIED', checked_at: '2026-11-22T00:00:00Z', suggestion: '' }]);
    const run = await runAutoChecks(facts, [item('email', 'EMAIL_DELIVERABLE')], options);
    expect(checkAndRecord).toHaveBeenCalledWith('hello@thebarn.in', options.actor, 'SINGLE');
    expect(run.outcomes.get('email')?.status).toBe('VERIFIED');
  });

  it('leaves a risky or unchecked email pending', async () => {
    (emailVerificationService.statuses as jest.Mock).mockResolvedValue([{ email: 'hello@thebarn.in', status: 'RISKY', checked_at: '2026-11-20T00:00:00Z', suggestion: '' }]);
    const run = await runAutoChecks(facts, [item('email', 'EMAIL_DELIVERABLE')], options);
    expect(run.outcomes.has('email')).toBe(false);
  });
});

describe('Instagram checks', () => {
  it('verifies a readable business profile, followers over the threshold and a recent post', async () => {
    const run = await runAutoChecks(
      facts,
      [item('ig', 'INSTAGRAM_BUSINESS_PROFILE'), item('followers', 'INSTAGRAM_FOLLOWERS_MIN', 1000), item('recent', 'INSTAGRAM_RECENT_POST_DAYS', 90)],
      options
    );
    expect(run.outcomes.get('ig')).toMatchObject({ status: 'VERIFIED', source_url: 'https://www.instagram.com/thebarn/' });
    expect(run.outcomes.get('followers')).toMatchObject({ status: 'VERIFIED', evidence: '@thebarn has 1500 followers (needs 1000).' });
    expect(run.outcomes.get('recent')).toMatchObject({ status: 'VERIFIED', source_url: 'https://www.instagram.com/p/abc/' });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('fails too few followers and a stale last post', async () => {
    read.mockResolvedValue({ ...profile, followers: 400, last_post_at: '2026-01-01T00:00:00Z' });
    const run = await runAutoChecks(facts, [item('followers', 'INSTAGRAM_FOLLOWERS_MIN', 1000), item('recent', 'INSTAGRAM_RECENT_POST_DAYS', 90)], options);
    expect(run.outcomes.get('followers')?.status).toBe('FAILED');
    expect(run.outcomes.get('recent')?.status).toBe('FAILED');
  });

  it('fails an account with no posts and stays pending when Instagram does not say', async () => {
    read.mockResolvedValue({ ...profile, followers: null, media_count: 0, last_post_at: null });
    const run = await runAutoChecks(facts, [item('followers', 'INSTAGRAM_FOLLOWERS_MIN', 1000), item('recent', 'INSTAGRAM_RECENT_POST_DAYS', 90)], options);
    expect(run.outcomes.get('followers')?.status).toBe('PENDING');
    expect(run.outcomes.get('recent')).toMatchObject({ status: 'FAILED', evidence: '@thebarn has no posts.' });
  });

  it('keeps a personal or missing account pending, to check by hand', async () => {
    read.mockResolvedValue(null);
    const run = await runAutoChecks(facts, [item('ig', 'INSTAGRAM_BUSINESS_PROFILE')], options);
    expect(run.outcomes.get('ig')).toMatchObject({ status: 'PENDING', evidence: expect.stringContaining('check it by hand') });
  });

  it('says why it skipped when no Instagram account is connected', async () => {
    (discoveryReader as jest.Mock).mockResolvedValue(null);
    const run = await runAutoChecks(facts, [item('ig', 'INSTAGRAM_BUSINESS_PROFILE')], options);
    expect(run.outcomes.size).toBe(0);
    expect(run.skipped).toEqual([expect.stringContaining('connected Instagram business account')]);
  });

  it('uses a profile the discovery step already read instead of reading it again', async () => {
    const run = await runAutoChecks(facts, [item('ig', 'INSTAGRAM_BUSINESS_PROFILE')], { ...options, prefetched: { instagram: profile } });
    expect(run.outcomes.get('ig')?.status).toBe('VERIFIED');
    expect(discoveryReader).not.toHaveBeenCalled();
  });
});

describe('Google Maps checks', () => {
  const listing = {
    title: 'The Barn Cafe & Bistro',
    address: '12 Vibhuti Khand, Gomti Nagar',
    phone: '',
    website: '',
    category: 'Cafe',
    rating: 4.4,
    rating_count: 25,
    maps_url: 'https://www.google.com/maps?cid=1',
  };

  it('verifies a matching listing and enough reviews', async () => {
    (searchPlaces as jest.Mock).mockResolvedValue([{ ...listing, title: 'Unrelated Gym' }, listing]);
    const run = await runAutoChecks(facts, [item('maps', 'GOOGLE_MAPS_LISTING'), item('reviews', 'GOOGLE_REVIEWS_MIN', 10)], options);
    expect(searchPlaces).toHaveBeenCalledWith('The Barn Cafe Gomti Nagar Lucknow');
    expect(run.outcomes.get('maps')).toMatchObject({ status: 'VERIFIED', source_url: 'https://www.google.com/maps?cid=1' });
    expect(run.outcomes.get('reviews')?.status).toBe('VERIFIED');
  });

  it('fails too few reviews and stays pending without a matching listing', async () => {
    (searchPlaces as jest.Mock).mockResolvedValue([{ ...listing, rating_count: 3 }]);
    const fewReviews = await runAutoChecks(facts, [item('reviews', 'GOOGLE_REVIEWS_MIN', 10)], options);
    expect(fewReviews.outcomes.get('reviews')?.status).toBe('FAILED');
    (searchPlaces as jest.Mock).mockResolvedValue([]);
    const none = await runAutoChecks(facts, [item('maps', 'GOOGLE_MAPS_LISTING')], options);
    expect(none.outcomes.get('maps')).toMatchObject({ status: 'PENDING', evidence: expect.stringContaining('No Google Maps listing') });
  });

  it('says why it skipped when Serper is not configured', async () => {
    (serperReady as jest.Mock).mockResolvedValue(false);
    const run = await runAutoChecks(facts, [item('maps', 'GOOGLE_MAPS_LISTING')], options);
    expect(run.skipped).toEqual([expect.stringContaining('Serper API key')]);
  });
});

describe('WEBSITE_REACHABLE', () => {
  it('verifies a website that answers with a page and leaves a silent one pending', async () => {
    (fetchOpenGraph as jest.Mock).mockResolvedValueOnce({ title: 'The Barn', description: null, image: null, site_name: null });
    const live = await runAutoChecks(facts, [item('web', 'WEBSITE_REACHABLE')], options);
    expect(live.outcomes.get('web')).toMatchObject({ status: 'VERIFIED', source_url: 'https://thebarn.in' });
    const silent = await runAutoChecks(facts, [item('web', 'WEBSITE_REACHABLE')], options);
    expect(silent.outcomes.get('web')?.status).toBe('PENDING');
  });
});

describe('runAutoChecks', () => {
  it('runs only database checks when external checks are off', async () => {
    const run = await runAutoChecks(facts, [item('dedup', 'CRM_UNIQUENESS'), item('maps', 'GOOGLE_MAPS_LISTING'), item('manual', 'NONE')], { ...options, external: false });
    expect([...run.outcomes.keys()]).toEqual(['dedup']);
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it('reports a check that throws instead of failing the whole run', async () => {
    (findLeadDuplicates as jest.Mock).mockRejectedValue(new Error('db down'));
    const run = await runAutoChecks(facts, [item('dedup', 'CRM_UNIQUENESS'), item('web', 'WEBSITE_REACHABLE')], options);
    expect(run.outcomes.has('dedup')).toBe(false);
    expect(run.skipped).toEqual([expect.stringContaining('db down')]);
    expect(run.outcomes.get('web')?.status).toBe('PENDING');
  });
});
