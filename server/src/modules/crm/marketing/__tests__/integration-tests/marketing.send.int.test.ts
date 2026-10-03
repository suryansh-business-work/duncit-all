// SMTP is the one outside call a campaign makes; everything else (rendering,
// recipient resolution, link instrumentation, the stored outcome) runs for real.
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return { ...actual, sendHtmlEmail: jest.fn() };
});
// Deterministic site URLs for the content cards; every other key reads blank,
// so URL/mail config falls back to its built-in defaults.
jest.mock('@config/runtimeEnv', () => ({
  getRuntimeEnvValue: jest.fn(async (key: string) => (key === 'MWEB_BASE_URL' ? 'https://m.duncit.test/' : '')),
}));
jest.mock('../../audienceList.service', () => ({ audienceListService: { memberIds: jest.fn() } }));

import { Types } from 'mongoose';
import { sendHtmlEmail } from '@services/email/email.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { UserModel } from '@modules/access/user/user.model';
import { NewsletterSubscriberModel } from '@modules/crm/newsletter/newsletter.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { marketingService, recipientsFor } from '../../marketing.service';
import { MarketingCampaignModel } from '../../marketing.model';
import { audienceListService } from '../../audienceList.service';

/**
 * Creating and sending a campaign: who it reaches, how it is batched, what is
 * recorded about the handover, and how every failure is stored on the campaign
 * instead of being thrown away. A sent campaign is never sent twice.
 */

const mockSend = jest.mocked(sendHtmlEmail);
const mockMembers = audienceListService.memberIds as jest.Mock;

const VALID_MJML =
  '<mjml><mj-body><mj-section><mj-column><mj-text>Hello from {{app_name}}</mj-text></mj-column></mj-section></mj-body></mjml>';

const input = (over: Record<string, unknown> = {}) => ({
  name: 'October drop',
  channel: 'EMAIL',
  audience: 'NEWSLETTER_SUBSCRIBERS',
  subject: 'News from {{app_name}}',
  mjml: VALID_MJML,
  ...over,
});

const subscribe = (emails: string[]) => NewsletterSubscriberModel.insertMany(emails.map((email) => ({ email })));

let seq = 0;
const seedUser = (email: string | undefined, status = 'ACTIVE') => {
  seq += 1;
  return UserModel.create({
    ...(email === undefined ? {} : { auth: { email } }),
    profile: { first_name: `U${seq}` },
    metadata: { status },
  });
};

let brandingSpy: jest.SpyInstance;
beforeEach(() => {
  brandingSpy = jest.spyOn(settingsService, 'getBranding').mockResolvedValue({ app_name: 'PetPals' } as never);
  mockSend.mockImplementation(async (opts: { bcc?: string[] }) => ({ accepted: opts.bcc ?? [], rejected: [] }) as never);
});
// Only the spy is restored: the module mocks above keep their implementations.
afterEach(() => brandingSpy.mockRestore());

describe('recipientsFor', () => {
  it('ALL_USERS is every ACTIVE account with an email, lower-cased', async () => {
    await seedUser('Active@X.com');
    await seedUser('blocked@x.com', 'SUSPENDED');
    await seedUser(undefined);

    expect(await recipientsFor('ALL_USERS')).toEqual(['active@x.com']);
  });

  it('NEWSLETTER_SUBSCRIBERS skips anyone who unsubscribed', async () => {
    await subscribe(['a@x.com', 'b@x.com']);
    await NewsletterSubscriberModel.updateOne({ email: 'b@x.com' }, { $set: { unsubscribed_at: new Date() } });

    expect(await recipientsFor('NEWSLETTER_SUBSCRIBERS')).toEqual(['a@x.com']);
  });

  it('AUDIENCE_LIST resolves the list at send time and still drops inactive members', async () => {
    const keep = await seedUser('keep@x.com');
    const gone = await seedUser('gone@x.com', 'INACTIVE');
    await seedUser('outsider@x.com');
    const listId = new Types.ObjectId();
    mockMembers.mockResolvedValue([keep._id, gone._id]);

    expect(await recipientsFor('AUDIENCE_LIST', listId)).toEqual(['keep@x.com']);
    expect(mockMembers).toHaveBeenCalledWith(String(listId));
  });
});

describe('create — validation', () => {
  it.each([
    [{ name: 'ab' }],
    [{ subject: '  ' }],
    [{ mjml: '<mjml></mjml>' }],
    [{ audience: 'EVERYONE' }],
    [{ channel: 'SMS' }],
  ])('refuses %p as BAD_USER_INPUT without saving', async (over) => {
    await expect(marketingService.create(input(over))).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(await MarketingCampaignModel.countDocuments({})).toBe(0);
  });

  it('needs the list for an AUDIENCE_LIST campaign and the reference for a card', async () => {
    await expect(marketingService.create(input({ audience: 'AUDIENCE_LIST' }))).rejects.toThrow(
      'Pick the audience list to send to'
    );
    await expect(marketingService.create(input({ card_type: 'POD' }))).rejects.toThrow('Card selection is required');
  });

  it('refuses an unparsable schedule', async () => {
    await expect(marketingService.create(input({ scheduled_at: 'next tuesday' }))).rejects.toThrow('Schedule date is invalid');
  });
});

describe('create + send', () => {
  it('sends at once when there is no schedule: SENT, counts, delivery and a clean stored render', async () => {
    await subscribe(['a@x.com', 'b@x.com', 'c@x.com']);
    mockSend.mockResolvedValueOnce({ accepted: ['a@x.com', 'b@x.com'], rejected: ['c@x.com'] } as never);

    const sent = await marketingService.create(input(), new Types.ObjectId().toHexString());

    expect(sent).toMatchObject({
      status: 'SENT',
      recipient_count: 3,
      error: null,
      scheduled_at: null,
      delivery: { accepted: 2, rejected: 1, rejected_addresses: ['c@x.com'] },
    });
    expect(sent.sent_at).not.toBeNull();
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0][0];
    expect(call).toMatchObject({
      bcc: ['a@x.com', 'b@x.com', 'c@x.com'],
      subject: 'News from PetPals',
      category: 'marketing',
      source_detail: 'October drop (batch 1/1)',
    });
    expect(call.to).toBeTruthy();
    // The stored render is the un-instrumented one an admin can view safely.
    expect(sent.rendered_html).toContain('Hello from PetPals');
  });

  it('a schedule already in the past, or send_now, sends immediately', async () => {
    await subscribe(['a@x.com']);
    const past = await marketingService.create(input({ scheduled_at: new Date(Date.now() - 60_000).toISOString() }));
    const now = await marketingService.create(
      input({ name: 'Second', send_now: true, scheduled_at: new Date(Date.now() + 3_600_000).toISOString() })
    );
    expect(past.status).toBe('SENT');
    expect(now).toMatchObject({ status: 'SENT', scheduled_at: null });
  });

  it('bcc-batches recipients 50 at a time and sums the handover across batches', async () => {
    await subscribe(Array.from({ length: 120 }, (_v, i) => `r${i}@x.com`));
    mockSend.mockImplementation(async (opts: { bcc?: string[] }) => {
      const bcc = opts.bcc ?? [];
      return { accepted: bcc.slice(1), rejected: bcc.slice(0, 1) } as never;
    });

    const sent = await marketingService.create(input());

    expect(mockSend.mock.calls.map((c) => c[0].bcc?.length)).toEqual([50, 50, 20]);
    expect(mockSend.mock.calls.map((c) => c[0].source_detail)).toEqual([
      'October drop (batch 1/3)',
      'October drop (batch 2/3)',
      'October drop (batch 3/3)',
    ]);
    expect(sent.recipient_count).toBe(120);
    expect(sent.delivery).toMatchObject({ accepted: 117, rejected: 3 });
    expect(sent.delivery?.rejected_addresses).toHaveLength(3);
  });

  it('an audience with nobody in it is stored FAILED with the reason, and nothing is mailed', async () => {
    const failed = await marketingService.create(input());
    expect(failed).toMatchObject({ status: 'FAILED', error: 'No recipients found for selected audience', sent_at: null });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('an SMTP failure is stored FAILED with its message', async () => {
    await subscribe(['a@x.com']);
    mockSend.mockRejectedValueOnce(new Error('SMTP auth failed'));
    const failed = await marketingService.create(input());
    expect(failed).toMatchObject({ status: 'FAILED', error: 'SMTP auth failed' });
    expect((await MarketingCampaignModel.findOne({ campaign_id: failed.campaign_id }).lean())?.status).toBe('FAILED');
  });

  it('a future schedule stores SCHEDULED without sending', async () => {
    await subscribe(['a@x.com']);
    const at = new Date(Date.now() + 2 * 3_600_000);
    const scheduled = await marketingService.create(input({ scheduled_at: at.toISOString() }));
    expect(scheduled).toMatchObject({ status: 'SCHEDULED', scheduled_at: at.toISOString(), recipient_count: 0 });
    expect(mockSend).not.toHaveBeenCalled();
    // Do not leave the live timer behind for later suites.
    await marketingService.remove(scheduled.campaign_id);
  });
});

describe('send', () => {
  const seed = (status: string) =>
    MarketingCampaignModel.create({
      campaign_id: `c-${status}-${++seq}`,
      name: 'Seeded',
      channel: 'EMAIL',
      audience: 'NEWSLETTER_SUBSCRIBERS',
      subject: 'Hi',
      mjml: VALID_MJML,
      status,
    });

  it('never re-sends a campaign that is SENT or SENDING', async () => {
    await subscribe(['a@x.com']);
    for (const status of ['SENT', 'SENDING']) {
      const doc = await seed(status);
      expect((await marketingService.send(doc.campaign_id)).status).toBe(status);
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('retries a FAILED campaign, clearing the old error', async () => {
    await subscribe(['a@x.com']);
    const doc = await seed('FAILED');
    await MarketingCampaignModel.updateOne({ _id: doc._id }, { $set: { error: 'old failure' } });

    const sent = await marketingService.send(doc.campaign_id);
    expect(sent).toMatchObject({ status: 'SENT', error: null, recipient_count: 1 });
  });

  it('refuses an unknown campaign', async () => {
    await expect(marketingService.send('missing')).rejects.toThrow('Campaign not found');
  });
});

describe('renderPreview', () => {
  it('fills the campaign variables into the subject and body and lists what the MJML uses', async () => {
    const preview = await marketingService.renderPreview({ subject: 'Hi from {{app_name}}', mjml: VALID_MJML });
    expect(preview.subject).toBe('Hi from PetPals');
    expect(preview.html).toContain('Hello from PetPals');
    expect(preview.errors).toEqual([]);
    expect(preview.detected_variables).toEqual(['app_name']);
  });

  it('reports the first missing field on its own', async () => {
    await expect(marketingService.renderPreview({ subject: '', mjml: '' })).rejects.toThrow();
    await expect(marketingService.renderPreview({ subject: 'Has subject' })).rejects.toThrow();
  });

  it('falls back to "Duncit" when branding cannot be read', async () => {
    jest.spyOn(settingsService, 'getBranding').mockRejectedValue(new Error('settings down'));
    const preview = await marketingService.renderPreview({ subject: '{{app_name}} news', mjml: VALID_MJML });
    expect(preview.subject).toBe('Duncit news');
  });
});

describe('previewCards', () => {
  it('lists active clubs by name with a stripped description, first image and mWeb link', async () => {
    await ClubModel.create({
      club_id: 'zebra-runners',
      club_name: 'Zebra Runners',
      club_description: '<p>Run   <b>fast</b></p>',
      club_feature_images_and_videos: [
        { url: 'https://img/v.mp4', type: 'VIDEO' },
        { url: 'https://img/z.png', type: 'IMAGE' },
      ],
      is_active: true,
    });
    await ClubModel.create({ club_id: 'alpha-hikers', club_name: 'Alpha Hikers', is_active: true });
    await ClubModel.create({ club_id: 'closed-club', club_name: 'Closed', is_active: false });

    const cards = await marketingService.previewCards('CLUB');

    expect(cards.map((c) => c.title)).toEqual(['Alpha Hikers', 'Zebra Runners']);
    expect(cards[1]).toMatchObject({
      type: 'CLUB',
      description: 'Run fast',
      image_url: 'https://img/z.png',
      cta_url: 'https://m.duncit.test/club/zebra-runners',
      meta: 'zebra-runners',
    });
    expect(cards[0].image_url).toBeNull();
  });

  it('links a pod card through its club slug, and leaves it unlinked when the club is gone', async () => {
    const club = await ClubModel.create({ club_id: 'pod-club', club_name: 'Pod Club', is_active: true });
    const base = {
      pod_hosts_id: [new Types.ObjectId()],
      pod_date_time: new Date(Date.now() + 86_400_000),
      pod_type: 'FREE',
      is_active: true,
    };
    await PodModel.create({ ...base, pod_id: 'mk-pod-1', pod_title: 'Linked', club_id: club._id, pod_description: 'x'.repeat(300) });
    await PodModel.create({ ...base, pod_id: 'mk-pod-2', pod_title: 'Orphan', club_id: new Types.ObjectId(), pod_description: 'Short' });

    const cards = await marketingService.previewCards('POD');
    const linked = cards.find((c) => c.title === 'Linked');
    const orphan = cards.find((c) => c.title === 'Orphan');

    expect(linked?.cta_url).toBe('https://m.duncit.test/club/pod-club/pod/mk-pod-1');
    expect(linked?.description).toHaveLength(220);
    expect(linked?.description.endsWith('…')).toBe(true);
    expect(orphan?.cta_url).toBeNull();
  });
});
