/**
 * Per-table QR stickers: one page per table the venue listed, each QR opening
 * the menu with its table filled in and counted against the venue's menu link.
 * The share link and its destination are the seams; the venue, who may print,
 * and the captions are real.
 */
jest.mock('@modules/crm/marketing/shortLink.service', () => ({ shortLinkService: { share: jest.fn() } }));
jest.mock('@modules/crm/marketing/shortLink.share', () => ({
  ...jest.requireActual<typeof import('@modules/crm/marketing/shortLink.share')>('@modules/crm/marketing/shortLink.share'),
  resolveShareDestination: jest.fn(),
}));
jest.mock('../../publicPage.tableLabel', () => {
  const actual = jest.requireActual<typeof import('../../publicPage.tableLabel')>('../../publicPage.tableLabel');
  return { ...actual, renderVenueTableStickers: jest.fn(actual.renderVenueTableStickers) };
});

import type { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { shortLinkService } from '@modules/crm/marketing/shortLink.service';
import { resolveShareDestination } from '@modules/crm/marketing/shortLink.share';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { publicPageResolvers } from '../../publicPage.resolver';
import { publicPageService } from '../../publicPage.service';
import { renderVenueTableStickers } from '../../publicPage.tableLabel';

const share = jest.mocked(shortLinkService.share);
const destination = jest.mocked(resolveShareDestination);
const stickers = jest.mocked(renderVenueTableStickers);

const MENU_URL = 'https://app.duncit.test/venue/abc?selectedtab=menu';
const ownerId = new Types.ObjectId().toHexString();
const owner = { id: ownerId, roles: [] as string[] };
const copy = { headline: 'Scan to order', tableHeading: 'Table' };
const pageCount = (base64: string) =>
  (Buffer.from(base64, 'base64').toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

async function seedVenue(over: Record<string, unknown> = {}) {
  const venue = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Cafe Uno',
    offers_food: true,
    food_tables: ['5', 'Patio', '12B'],
    ...over,
  });
  return String(venue._id);
}

/** What a refused call was refused with. */
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
  share.mockResolvedValue({ url: 'https://duncit.test/s/menu1', code: 'menu1' } as Awaited<ReturnType<typeof shortLinkService.share>>);
  destination.mockResolvedValue({ url: MENU_URL, label: 'Cafe Uno menu' });
});

describe('publicPageService.tableStickersPdfBase64', () => {
  it("prints a page per table, each QR carrying its table and the menu link's code", async () => {
    const venueId = await seedVenue();
    const pdf = await publicPageService.tableStickersPdfBase64(owner, venueId, copy);

    expect(pageCount(pdf)).toBe(3);
    expect(share).toHaveBeenCalledWith('VENUE_MENU', venueId, ownerId);
    expect(destination).toHaveBeenCalledWith('VENUE_MENU', venueId);
    expect(stickers).toHaveBeenCalledWith({
      url: 'https://duncit.test/s/menu1',
      headline: 'Scan to order',
      stickers: [
        { caption: 'Table 5', qrUrl: 'https://app.duncit.test/venue/abc?selectedtab=menu&table=5&dl=menu1' },
        { caption: 'Patio', qrUrl: 'https://app.duncit.test/venue/abc?selectedtab=menu&table=Patio&dl=menu1' },
        { caption: 'Table 12B', qrUrl: 'https://app.duncit.test/venue/abc?selectedtab=menu&table=12B&dl=menu1' },
      ],
    });
  });

  it('prints a bare table number when no heading is given, and bounds the headline and the heading', async () => {
    const venueId = await seedVenue({ food_tables: ['7'] });
    await publicPageService.tableStickersPdfBase64(owner, venueId, { headline: ` ${'H'.repeat(130)} `, tableHeading: '  ' });
    expect(stickers).toHaveBeenLastCalledWith(
      expect.objectContaining({ headline: 'H'.repeat(120), stickers: [expect.objectContaining({ caption: '7' })] })
    );

    await publicPageService.tableStickersPdfBase64(owner, venueId, { headline: 'Scan', tableHeading: 'T'.repeat(40) });
    expect(stickers.mock.lastCall?.[0].stickers[0].caption).toBe(`${'T'.repeat(30)} 7`);
  });

  it('refuses a blank headline before reading the venue', async () => {
    const venueId = await seedVenue();
    expect(await refusal(() => publicPageService.tableStickersPdfBase64(owner, venueId, { ...copy, headline: '  ' }))).toEqual({
      code: 'BAD_USER_INPUT',
      message: 'Label text is required',
    });
    expect(share).not.toHaveBeenCalled();
  });

  it("answers someone else's venue as a missing one, unless the caller holds the console's pass", async () => {
    const venueId = await seedVenue();
    const stranger = { id: new Types.ObjectId().toHexString(), roles: [] as string[] };
    expect(await refusal(() => publicPageService.tableStickersPdfBase64(stranger, venueId, copy))).toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(pageCount(await publicPageService.tableStickersPdfBase64(stranger, venueId, copy, true))).toBe(3);
  });

  it('asks the venue to turn food on, and to list its tables, first', async () => {
    const noFood = await seedVenue({ offers_food: false });
    expect(await refusal(() => publicPageService.tableStickersPdfBase64(owner, noFood, copy))).toEqual({
      code: 'FAILED_PRECONDITION',
      message: 'Turn on food at this venue first',
    });
    const noTables = await seedVenue({ food_tables: [] });
    expect(await refusal(() => publicPageService.tableStickersPdfBase64(owner, noTables, copy))).toEqual({
      code: 'FAILED_PRECONDITION',
      message: 'Add your tables first',
    });
    expect(share).not.toHaveBeenCalled();
  });

  it('refuses when the menu has nowhere to land', async () => {
    const venueId = await seedVenue();
    destination.mockResolvedValueOnce(null);
    expect(await refusal(() => publicPageService.tableStickersPdfBase64(owner, venueId, copy))).toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(stickers).not.toHaveBeenCalled();
  });
});

describe('myVenueTableStickersPdfBase64 resolver', () => {
  const { Query } = publicPageResolvers;
  const args = (venue_id: string) => ({ venue_id, headline: 'Scan to order', table_heading: 'Table' });

  it('asks a signed-out caller to sign in', () => {
    expect(() => Query.myVenueTableStickersPdfBase64(null, args(new Types.ObjectId().toHexString()), makeContext(null))).toThrow(
      'Not authenticated'
    );
  });

  it("prints the owner's stickers, and lets a Venues console editor print any venue's", async () => {
    const venueId = await seedVenue();
    expect(pageCount(await Query.myVenueTableStickersPdfBase64(null, args(venueId), makeContext({ id: ownerId })))).toBe(3);
    expect(
      pageCount(await Query.myVenueTableStickersPdfBase64(null, args(venueId), makeContext({ roles: ['ALL_VENUES_ACCESS'] })))
    ).toBe(3);
  });

  it("refuses another partner the venue — a host console's role is no pass here", async () => {
    const venueId = await seedVenue();
    for (const roles of [['USER'], ['ALL_HOSTS_ACCESS']]) {
      expect(
        await refusal(() => Query.myVenueTableStickersPdfBase64(null, args(venueId), makeContext({ roles })))
      ).toMatchObject({ code: 'NOT_FOUND' });
    }
  });
});
