/**
 * Share links: the destination is always looked up, never taken from the
 * caller. An unknown id, a venue that is not live, a user who is not a host or
 * a pod with no place must all mint nothing.
 */
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('@modules/pods/pod/pod.model', () => ({ PodModel: { findById: jest.fn() } }));
jest.mock('@modules/pods/pod/pod.place', () => ({ resolvePodPlace: jest.fn() }));
jest.mock('@modules/clubs/club/club.model', () => ({ ClubModel: { findById: jest.fn(), findOne: jest.fn() } }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn() } }));
jest.mock('@modules/engagement/post/post.model', () => ({ PostModel: { findById: jest.fn() } }));
jest.mock('@modules/pods/podIdea/podIdea.model', () => ({ PodIdeaModel: { findById: jest.fn() } }));
jest.mock('@modules/finance/giftcard/giftcard.model', () => ({ GiftCardModel: { exists: jest.fn() } }));
jest.mock('@modules/engagement/referral/referral.model', () => ({ ReferralCodeModel: { exists: jest.fn() } }));
jest.mock('@modules/venues/venue/venue.model', () => ({ VenueModel: { findById: jest.fn() } }));

import { Types } from 'mongoose';
import { getUrlConfigs } from '@config/url-configs';
import { PodModel } from '@modules/pods/pod/pod.model';
import { resolvePodPlace } from '@modules/pods/pod/pod.place';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { PostModel } from '@modules/engagement/post/post.model';
import { PodIdeaModel } from '@modules/pods/podIdea/podIdea.model';
import { GiftCardModel } from '@modules/finance/giftcard/giftcard.model';
import { ReferralCodeModel } from '@modules/engagement/referral/referral.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import {
  resolveShareDestination,
  shareCampaignById,
  shareCampaignFor,
  shareCampaigns,
  shareKey,
  SHARE_LINK_TARGETS,
} from '../../shortLink.share';

const m = (fn: unknown) => fn as jest.Mock;
const ID = new Types.ObjectId();
const OTHER = new Types.ObjectId();
/** A mongoose query ending in `.lean().exec()`, optionally preceded by `.select()`. */
const found = <T>(value: T) => {
  const q = { select: () => q, lean: () => q, exec: () => Promise.resolve(value) };
  return q;
};

beforeEach(() => {
  jest.clearAllMocks();
  m(getUrlConfigs).mockResolvedValue({ mwebUrl: 'https://duncit.test///' });
});

describe('campaigns', () => {
  it('files every target under a share_ campaign and lists each campaign once, by name', () => {
    const pod = shareCampaignFor('POD');
    expect(pod).toMatchObject({ name: 'Pod Shares', campaign_id: expect.stringMatching(/^share_/) });
    const list = shareCampaigns();
    expect(list).toHaveLength(new Set(SHARE_LINK_TARGETS.map((t) => shareCampaignFor(t).campaign_id)).size);
    expect(list.map((c) => c.name)).toEqual([...list.map((c) => c.name)].sort((a, b) => a.localeCompare(b)));
    expect(shareCampaignById(pod.campaign_id)).toEqual(pod);
    expect(shareCampaignById('share_unknown')).toBeNull();
  });

  it('keys a share case-insensitively so one thing never gets two links', () => {
    expect(shareKey('POD', '  ABC123 ')).toBe('POD:abc123');
  });
});

describe('resolveShareDestination', () => {
  it('addresses a pod by club slug and pod slug, or on its own when the club is gone', async () => {
    m(PodModel.findById).mockReturnValue(found({ _id: ID, pod_id: 'p-1', pod_title: 'Brunch', club_id: OTHER }));
    m(ClubModel.findById).mockReturnValue(found({ club_id: 'readers' }));
    expect(await resolveShareDestination('POD', ` ${ID} `)).toEqual({
      url: 'https://duncit.test/club/readers/pod/p-1',
      label: 'Pod · Brunch',
    });
    m(ClubModel.findById).mockReturnValue(found(null));
    expect((await resolveShareDestination('POD', String(ID)))?.url).toBe('https://duncit.test/pod/p-1');
    m(PodModel.findById).mockReturnValue(found({ _id: ID, pod_id: 'p-2', club_id: null }));
    expect((await resolveShareDestination('POD', String(ID)))?.url).toBe('https://duncit.test/pod/p-2');
  });

  it('never resolves a pod from anything but a document id', async () => {
    expect(await resolveShareDestination('POD', 'some-slug')).toBeNull();
    expect(PodModel.findById).not.toHaveBeenCalled();
    m(PodModel.findById).mockReturnValue(found(null));
    expect(await resolveShareDestination('POD', String(ID))).toBeNull();
  });

  it('builds a maps link from the pod place, and mints nothing without a place', async () => {
    m(PodModel.findById).mockReturnValue(found({ _id: ID, pod_title: 'Brunch' }));
    m(resolvePodPlace).mockResolvedValue({ label: 'Cafe Z', detail: 'MG Road' });
    const out = await resolveShareDestination('POD_LOCATION', String(ID));
    expect(out?.url).toBe('https://www.google.com/maps/search/?api=1&query=Cafe%20Z%2C%20MG%20Road');
    expect(out?.label).toBe('Location · Brunch');
    m(resolvePodPlace).mockResolvedValue({ label: '', detail: '' });
    expect(await resolveShareDestination('POD_LOCATION', String(ID))).toBeNull();
    m(PodModel.findById).mockReturnValue(found(null));
    expect(await resolveShareDestination('POD_LOCATION', String(ID))).toBeNull();
  });

  it('builds the feedback and media pages from the pod document id', async () => {
    m(PodModel.findById).mockReturnValue(found({ _id: ID, pod_title: '' }));
    expect(await resolveShareDestination('POD_FEEDBACK', String(ID))).toEqual({
      url: `https://duncit.test/pod/${ID}/feedback`,
      label: 'Pod rating · Duncit',
    });
    expect((await resolveShareDestination('POD_MEDIA', String(ID)))?.url).toBe(`https://duncit.test/pod/${ID}/media`);
    m(PodModel.findById).mockReturnValue(found(null));
    expect(await resolveShareDestination('POD_FEEDBACK', String(ID))).toBeNull();
    expect(await resolveShareDestination('POD_MEDIA', String(ID))).toBeNull();
  });

  it('resolves a club by document id, then by lower-cased slug, else nothing', async () => {
    m(ClubModel.findById).mockReturnValue(found({ club_id: 'readers', club_name: 'Readers' }));
    expect((await resolveShareDestination('CLUB', String(ID)))?.url).toBe('https://duncit.test/club/readers');
    m(ClubModel.findById).mockReturnValue(found(null));
    m(ClubModel.findOne).mockReturnValue(found({ club_id: 'readers', club_name: 'Readers' }));
    const out = await resolveShareDestination('CLUB', 'READERS');
    expect(m(ClubModel.findOne).mock.calls[0][0]).toEqual({ club_id: 'readers' });
    expect(out?.label).toBe('Club · Readers');
    m(ClubModel.findOne).mockReturnValue(found(null));
    expect(await resolveShareDestination('CLUB', 'nobody')).toBeNull();
  });

  it('prefers the @handle for a profile and falls back to the id', async () => {
    m(UserModel.findById).mockReturnValue(
      found({ _id: ID, profile: { first_name: 'Asha', last_name: 'Rao', username: 'asha' } })
    );
    expect(await resolveShareDestination('PROFILE', String(ID))).toEqual({
      url: 'https://duncit.test/u/asha',
      label: 'Profile · Asha Rao',
    });
    m(UserModel.findById).mockReturnValue(found({ _id: ID }));
    expect(await resolveShareDestination('PROFILE', String(ID))).toEqual({
      url: `https://duncit.test/u/${ID}`,
      label: 'Profile · Duncit',
    });
    m(UserModel.findById).mockReturnValue(found(null));
    expect(await resolveShareDestination('PROFILE', String(ID))).toBeNull();
  });

  it('shares a post with its caption clipped in the label, or its id when it has none', async () => {
    m(PostModel.findById).mockReturnValue(found({ _id: ID, caption: 'x'.repeat(300) }));
    const out = await resolveShareDestination('POST', String(ID));
    expect(out?.url).toBe(`https://duncit.test/post/${ID}`);
    expect(out!.label.length).toBeLessThanOrEqual(120);
    expect(out!.label.startsWith('Post · ')).toBe(true);
    m(PostModel.findById).mockReturnValue(found({ _id: ID }));
    expect((await resolveShareDestination('POST', String(ID)))?.label).toBe(`Post · ${ID}`);
    m(PostModel.findById).mockReturnValue(found(null));
    expect(await resolveShareDestination('POST', String(ID))).toBeNull();
  });

  it('shares a pod idea, and nothing for an unknown one', async () => {
    m(PodIdeaModel.findById).mockReturnValue(found({ _id: ID, title: 'Chess night' }));
    expect(await resolveShareDestination('POD_IDEA', String(ID))).toEqual({
      url: `https://duncit.test/pod-ideas?id=${ID}`,
      label: 'Pod idea · Chess night',
    });
    m(PodIdeaModel.findById).mockReturnValue(found(null));
    expect(await resolveShareDestination('POD_IDEA', String(ID))).toBeNull();
  });

  it('upper-cases and encodes gift-card and referral codes, only when they exist', async () => {
    m(GiftCardModel.exists).mockResolvedValue({ _id: ID });
    expect(await resolveShareDestination('GIFT_CARD', ' ab c1 ')).toEqual({
      url: 'https://duncit.test/gift-card/AB%20C1',
      label: 'Gift card · AB C1',
    });
    expect(m(GiftCardModel.exists).mock.calls[0][0]).toEqual({ code: 'AB C1' });
    m(GiftCardModel.exists).mockResolvedValue(null);
    expect(await resolveShareDestination('GIFT_CARD', 'ZZZ')).toBeNull();

    m(ReferralCodeModel.exists).mockResolvedValue({ _id: ID });
    expect((await resolveShareDestination('REFERRAL', 'abc'))?.url).toBe('https://duncit.test/register?ref=ABC');
    m(ReferralCodeModel.exists).mockResolvedValue(null);
    expect(await resolveShareDestination('REFERRAL', 'abc')).toBeNull();
  });

  it('mints a venue page only for a live, approved venue', async () => {
    m(VenueModel.findById).mockReturnValue(found({ _id: ID, venue_name: 'Cafe Z', status: 'APPROVED', is_active: true }));
    expect(await resolveShareDestination('VENUE_PAGE', String(ID))).toEqual({
      url: `https://duncit.test/venue/${ID}`,
      label: 'Venue page · Cafe Z',
    });
    m(VenueModel.findById).mockReturnValue(found({ _id: ID, status: 'APPROVED' }));
    expect(await resolveShareDestination('VENUE_PAGE', String(ID))).not.toBeNull();
    m(VenueModel.findById).mockReturnValue(found({ _id: ID, status: 'APPROVED', is_active: false }));
    expect(await resolveShareDestination('VENUE_PAGE', String(ID))).toBeNull();
    m(VenueModel.findById).mockReturnValue(found({ _id: ID, status: 'PENDING', is_active: true }));
    expect(await resolveShareDestination('VENUE_PAGE', String(ID))).toBeNull();
    m(VenueModel.findById).mockReturnValue(found(null));
    expect(await resolveShareDestination('VENUE_PAGE', String(ID))).toBeNull();
    expect(await resolveShareDestination('VENUE_PAGE', 'bad')).toBeNull();
  });

  it('mints a host page only for a user who holds the HOST role', async () => {
    m(UserModel.findById).mockReturnValue(
      found({ _id: ID, metadata: { role_keys: ['USER', 'HOST'] }, profile: { first_name: 'Ravi', username: 'ravi' } })
    );
    expect(await resolveShareDestination('HOST_PAGE', String(ID))).toEqual({
      url: 'https://duncit.test/hosts/ravi',
      label: 'Host page · Ravi',
    });
    m(UserModel.findById).mockReturnValue(found({ _id: ID, metadata: { role_keys: ['HOST'] } }));
    expect((await resolveShareDestination('HOST_PAGE', String(ID)))?.url).toBe(`https://duncit.test/hosts/${ID}`);
    m(UserModel.findById).mockReturnValue(found({ _id: ID, metadata: { role_keys: ['USER'] } }));
    expect(await resolveShareDestination('HOST_PAGE', String(ID))).toBeNull();
    m(UserModel.findById).mockReturnValue(found({ _id: ID }));
    expect(await resolveShareDestination('HOST_PAGE', String(ID))).toBeNull();
    expect(await resolveShareDestination('HOST_PAGE', 'bad')).toBeNull();
  });
});
