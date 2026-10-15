/**
 * Publishing a public page against a real database: whose venue or host page
 * a caller may publish, what the page is described by (name, place, picture),
 * its numbers before and after the first publish, and the printable poster and
 * table label. The share-link services and the PDF renderers are the seams.
 */
jest.mock('@modules/crm/marketing/shortLink.service', () => ({
  shortLinkService: { share: jest.fn(), existingShare: jest.fn() },
}));
jest.mock('@modules/crm/marketing/shortLinkClick.service', () => ({ shortLinkClickService: { stats: jest.fn() } }));
jest.mock('@modules/crm/marketing/shortLinkJourney.service', () => ({ shortLinkJourneyService: { funnel: jest.fn() } }));
jest.mock('../../publicPage.poster', () => ({ renderPublicPagePoster: jest.fn() }));
jest.mock('../../publicPage.tableLabel', () => ({
  renderVenueTableLabel: jest.fn(),
  renderVenueTableStickers: jest.fn(),
}));

import type { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { shortLinkService } from '@modules/crm/marketing/shortLink.service';
import { shortLinkClickService } from '@modules/crm/marketing/shortLinkClick.service';
import { shortLinkJourneyService } from '@modules/crm/marketing/shortLinkJourney.service';
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { publicPageService } from '../../publicPage.service';
import { renderPublicPagePoster } from '../../publicPage.poster';
import { renderVenueTableLabel } from '../../publicPage.tableLabel';

const share = jest.mocked(shortLinkService.share);
const existingShare = jest.mocked(shortLinkService.existingShare);
const stats = jest.mocked(shortLinkClickService.stats);
const funnel = jest.mocked(shortLinkJourneyService.funnel);
const poster = jest.mocked(renderPublicPagePoster);
const label = jest.mocked(renderVenueTableLabel);

const LINK = { id: 'link-1', url: 'https://duncit.test/s/abc', code: 'abc' };
const ownerId = new Types.ObjectId().toHexString();
const owner = { id: ownerId, roles: [] as string[] };
const copy = { headline: 'Come play', footer: 'Scan to join' };

async function seedVenue(over: Record<string, unknown> = {}) {
  const venue = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Cafe Uno',
    locality: 'Baner',
    city: 'Pune',
    cover_image_url: 'https://img.duncit.test/cover.jpg',
    ...over,
  });
  return String(venue._id);
}

/** A host account written raw, so a legacy row without a profile can be stored. */
async function seedAccount(fields: Record<string, unknown>) {
  const _id = new Types.ObjectId();
  await UserModel.collection.insertOne({ _id, ...fields });
  return { id: _id.toHexString(), roles: [] as string[] };
}

async function refusal(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const refused = error as GraphQLError;
    return { code: refused.extensions?.code, message: refused.message };
  }
  throw new Error('Expected the call to be refused');
}

beforeEach(() => {
  share.mockResolvedValue(LINK as Awaited<ReturnType<typeof shortLinkService.share>>);
  existingShare.mockResolvedValue(null);
  stats.mockResolvedValue({ clicks: 4 } as never);
  funnel.mockResolvedValue({ signups: 1 } as never);
  poster.mockResolvedValue(Buffer.from('poster-pdf'));
  label.mockResolvedValue(Buffer.from('label-pdf'));
});

describe('publish', () => {
  it("publishes the owner's approved venue and hands back its link with a QR", async () => {
    const venueId = await seedVenue();

    const page = await publicPageService.publish(owner, 'VENUE', venueId);

    expect(share).toHaveBeenCalledWith('VENUE_PAGE', venueId, ownerId);
    expect(page).toMatchObject({ url: LINK.url, code: LINK.code });
    expect(page.qr_data_url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('answers a malformed id and a missing venue as not found', async () => {
    for (const id of ['not-an-id', new Types.ObjectId().toHexString(), null]) {
      expect(await refusal(() => publicPageService.publish(owner, 'VENUE', id))).toEqual({
        code: 'NOT_FOUND',
        message: 'Venue not found',
      });
    }
    expect(share).not.toHaveBeenCalled();
  });

  it('refuses a venue that is not yet approved or has been switched off', async () => {
    for (const over of [{ status: 'SUBMITTED' }, { is_active: false }]) {
      const venueId = await seedVenue(over);
      expect(await refusal(() => publicPageService.publish(owner, 'VENUE', venueId))).toEqual({
        code: 'FAILED_PRECONDITION',
        message: 'A venue can be published once it is approved and active',
      });
    }
    expect(share).not.toHaveBeenCalled();
  });

  it("publishes a host's own page, whatever ref the caller sent", async () => {
    const host = await seedAccount({ metadata: { role_keys: ['USER', 'HOST'] }, profile: { first_name: 'Asha' } });

    await publicPageService.publish(host, 'HOST', new Types.ObjectId().toHexString());

    expect(share).toHaveBeenCalledWith('HOST_PAGE', host.id, host.id);
  });

  it('refuses a host page to an account that is not an approved host', async () => {
    const member = await seedAccount({ metadata: { role_keys: ['USER'] }, profile: { first_name: 'Ravi' } });
    const bare = await seedAccount({});
    for (const user of [member, bare, { id: new Types.ObjectId().toHexString(), roles: ['HOST'] }]) {
      expect(await refusal(() => publicPageService.publish(user, 'HOST'))).toEqual({
        code: 'FORBIDDEN',
        message: 'Only an approved host can publish a host page',
      });
    }
  });
});

describe('insights', () => {
  it('says the page is not published yet, without reading any numbers', async () => {
    const venueId = await seedVenue({ offers_food: true });

    expect(await publicPageService.insights(owner, 'VENUE', venueId, 30)).toEqual({
      published: false,
      offers_food: true,
      link: null,
      stats: null,
      funnel: null,
    });
    expect(existingShare).toHaveBeenCalledWith('VENUE_PAGE', venueId);
    expect(stats).not.toHaveBeenCalled();
  });

  it("reads a published page's clicks and journeys, never for a negative period", async () => {
    const venueId = await seedVenue();
    existingShare.mockResolvedValue(LINK as never);

    const result = await publicPageService.insights(owner, 'VENUE', venueId, -5);

    expect(stats).toHaveBeenCalledWith('link-1', 0);
    expect(funnel).toHaveBeenCalledWith('link-1');
    expect(result).toMatchObject({
      published: true,
      offers_food: false,
      link: { url: LINK.url, code: LINK.code },
      stats: { clicks: 4 },
      funnel: { signups: 1 },
    });
    expect(result.link?.qr_data_url.startsWith('data:image/png;base64,')).toBe(true);
  });
});

describe('posterPdfBase64', () => {
  it('prints the venue with its place and cover, words trimmed and bounded', async () => {
    const venueId = await seedVenue();

    const pdf = await publicPageService.posterPdfBase64(owner, 'VENUE', venueId, {
      headline: `  ${'H'.repeat(130)}  `,
      footer: ' Scan to join ',
    });

    expect(Buffer.from(pdf, 'base64').toString()).toBe('poster-pdf');
    expect(poster).toHaveBeenCalledWith({
      title: 'Cafe Uno',
      subtitle: 'Baner, Pune',
      image_url: 'https://img.duncit.test/cover.jpg',
      url: LINK.url,
      copy: { headline: 'H'.repeat(120), footer: 'Scan to join' },
    });
  });

  it('falls back to the first gallery picture, then to no picture and no place', async () => {
    const gallery = await seedVenue({ cover_image_url: '', gallery: ['https://img.duncit.test/g1.jpg'] });
    await publicPageService.posterPdfBase64(owner, 'VENUE', gallery, copy);
    expect(poster).toHaveBeenLastCalledWith(
      expect.objectContaining({ image_url: 'https://img.duncit.test/g1.jpg', subtitle: 'Baner, Pune' })
    );

    const plain = await seedVenue({ cover_image_url: '', locality: '  ', city: '' });
    await publicPageService.posterPdfBase64(owner, 'VENUE', plain, copy);
    expect(poster).toHaveBeenLastCalledWith(expect.objectContaining({ image_url: null, subtitle: null }));
  });

  it("prints a host page with the host's name, handle and city", async () => {
    const host = await seedAccount({
      metadata: { role_keys: ['HOST'] },
      profile: { first_name: 'Asha', last_name: 'Rao', username: 'asha', city: 'Pune', profile_photo: 'https://img.duncit.test/a.jpg' },
    });

    await publicPageService.posterPdfBase64(host, 'HOST', null, copy);

    expect(poster).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Asha Rao',
        subtitle: '@asha, Pune',
        image_url: 'https://img.duncit.test/a.jpg',
      })
    );
  });

  it('prints a legacy host account with no profile as a blank page rather than failing', async () => {
    const host = await seedAccount({ metadata: { role_keys: ['HOST'] } });

    await publicPageService.posterPdfBase64(host, 'HOST', null, copy);

    expect(poster).toHaveBeenCalledWith(expect.objectContaining({ title: '', subtitle: null, image_url: null }));
  });

  it('refuses blank poster words before reading anything', async () => {
    const venueId = await seedVenue();
    for (const words of [{ ...copy, headline: '   ' }, { ...copy, footer: '' }]) {
      expect(await refusal(() => publicPageService.posterPdfBase64(owner, 'VENUE', venueId, words))).toEqual({
        code: 'BAD_USER_INPUT',
        message: 'Poster text is required',
      });
    }
    expect(share).not.toHaveBeenCalled();
    expect(poster).not.toHaveBeenCalled();
  });
});

describe('tableLabelPdfBase64', () => {
  it("gives a venue that serves food the menu's own link", async () => {
    const venueId = await seedVenue({ offers_food: true });

    const pdf = await publicPageService.tableLabelPdfBase64(owner, venueId, ' Scan to order ');

    expect(Buffer.from(pdf, 'base64').toString()).toBe('label-pdf');
    expect(share).toHaveBeenCalledWith('VENUE_MENU', venueId, ownerId);
    expect(label).toHaveBeenCalledWith({ title: 'Cafe Uno', url: LINK.url, headline: 'Scan to order' });
  });

  it("gives any other venue the page link the poster carries", async () => {
    const venueId = await seedVenue();

    await publicPageService.tableLabelPdfBase64(owner, venueId, 'Scan us');

    expect(share).toHaveBeenCalledWith('VENUE_PAGE', venueId, ownerId);
  });

  it('refuses a blank label, and a stranger the venue', async () => {
    const venueId = await seedVenue();
    expect(await refusal(() => publicPageService.tableLabelPdfBase64(owner, venueId, '  '))).toEqual({
      code: 'BAD_USER_INPUT',
      message: 'Label text is required',
    });
    const stranger = { id: new Types.ObjectId().toHexString(), roles: [] as string[] };
    expect(await refusal(() => publicPageService.tableLabelPdfBase64(stranger, venueId, 'Scan'))).toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(label).not.toHaveBeenCalled();
  });
});
