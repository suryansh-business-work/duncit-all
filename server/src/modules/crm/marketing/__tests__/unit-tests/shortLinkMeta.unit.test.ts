/**
 * A short link's link-preview card.
 *
 * The promise being held: the card is the destination's as it is NOW — an
 * entity page from the database, anything else from its own tags — and a
 * marketer's override replaces it field by field, never as a frozen copy that
 * outlives a change of destination.
 */
jest.mock('@modules/platform/linkPreview/linkPreview.service', () => ({
  linkPreviewService: { resolve: jest.fn() },
}));
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getBranding: jest.fn() },
}));
jest.mock('@utils/open-graph', () => ({ fetchOpenGraph: jest.fn() }));

import { linkPreviewService } from '@modules/platform/linkPreview/linkPreview.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { fetchOpenGraph } from '@utils/open-graph';
import { cardForLink, destinationMeta } from '../../shortLink.preview';
import { metaOverrideFrom, NO_META_OVERRIDE } from '../../shortLink.meta';

const resolveEntity = linkPreviewService.resolve as jest.Mock;
const readPage = fetchOpenGraph as jest.Mock;

const POD_URL = 'https://mweb.duncit.com/club/pune-runners/pod/DUN-POD-4821';
const PARTNER_URL = 'https://partner.example.org/monsoon-offer';

beforeEach(() => {
  jest.clearAllMocks();
  (settingsService.getBranding as jest.Mock).mockResolvedValue({
    app_name: 'Duncit',
    primary_color: '#D92D2D',
    logo_url: 'https://ik.imagekit.io/duncit/logo.png',
  });
  resolveEntity.mockResolvedValue(null);
  readPage.mockResolvedValue({ title: null, description: null, image: null, site_name: null });
});

describe('destinationMeta', () => {
  it('describes an entity page from the database without fetching it', async () => {
    resolveEntity.mockResolvedValue({ title: 'Sunday 5K', description: 'Easy pace', image_url: null });
    const meta = await destinationMeta(POD_URL, { readPage: true });
    expect(resolveEntity).toHaveBeenCalledWith('POD', 'pune-runners', 'DUN-POD-4821');
    expect(readPage).not.toHaveBeenCalled();
    expect(meta?.title).toBe('Sunday 5K');
  });

  it('reads any other destination — ours or a partner’s — from its own tags', async () => {
    readPage.mockResolvedValue({
      title: 'Monsoon offer',
      description: '20% off for Duncit members',
      image: 'https://partner.example.org/hero.jpg',
      site_name: 'Partner Studio',
    });
    const meta = await destinationMeta(PARTNER_URL, { readPage: true });
    expect(readPage).toHaveBeenCalledWith(PARTNER_URL);
    expect(meta).toEqual({
      title: 'Monsoon offer',
      description: '20% off for Duncit members',
      image_url: 'https://partner.example.org/hero.jpg',
      site_name: 'Partner Studio',
    });
  });

  it('does not read the page when asked not to, or when it has no title', async () => {
    expect(await destinationMeta(PARTNER_URL, { readPage: false })).toBeNull();
    expect(readPage).not.toHaveBeenCalled();
    expect(await destinationMeta(PARTNER_URL, { readPage: true })).toBeNull();
  });
});

describe('cardForLink', () => {
  const partnerPage = {
    title: 'Monsoon offer',
    description: 'From the page',
    image: 'https://partner.example.org/hero.jpg',
    site_name: 'Partner Studio',
  };

  it('follows the destination when nothing is forced', async () => {
    readPage.mockResolvedValue(partnerPage);
    const card = await cardForLink({ destination_url: PARTNER_URL }, { readPage: true });
    expect(card).toMatchObject({ title: 'Monsoon offer', large_image: true, site_name: 'Partner Studio' });
  });

  it('ignores stored override text while the switch is off', async () => {
    readPage.mockResolvedValue(partnerPage);
    const card = await cardForLink(
      { destination_url: PARTNER_URL, meta_override_enabled: false, meta_title: 'Stale' },
      { readPage: true },
    );
    expect(card?.title).toBe('Monsoon offer');
  });

  it('replaces the destination field by field when forced; a blank field keeps the destination’s', async () => {
    readPage.mockResolvedValue(partnerPage);
    const card = await cardForLink(
      { destination_url: PARTNER_URL, meta_override_enabled: true, meta_title: 'Forced title' },
      { readPage: true },
    );
    expect(card).toMatchObject({
      title: 'Forced title',
      description: 'From the page',
      image_url: 'https://partner.example.org/hero.jpg',
    });
  });

  it('skips the destination entirely when every field is forced', async () => {
    const card = await cardForLink(
      {
        destination_url: PARTNER_URL,
        meta_override_enabled: true,
        meta_title: 'T',
        meta_description: 'D',
        meta_image_url: 'https://cdn.example.org/i.png',
      },
      { readPage: true },
    );
    expect(readPage).not.toHaveBeenCalled();
    expect(card).toMatchObject({ title: 'T', description: 'D', large_image: true, site_name: 'Duncit' });
  });

  it('stands the brand logo in for a missing image as a small card, and gives up with no title', async () => {
    readPage.mockResolvedValue({ ...partnerPage, image: null });
    const card = await cardForLink({ destination_url: PARTNER_URL }, { readPage: true });
    expect(card).toMatchObject({ image_url: 'https://ik.imagekit.io/duncit/logo.png', large_image: false });

    readPage.mockResolvedValue({ title: null, description: null, image: null, site_name: null });
    expect(await cardForLink({ destination_url: PARTNER_URL }, { readPage: true })).toBeNull();
  });
});

describe('metaOverrideFrom', () => {
  it('clears every field when the switch is off', () => {
    expect(metaOverrideFrom({ meta_override_enabled: false, meta_title: 'Old' })).toEqual(NO_META_OVERRIDE);
    expect(metaOverrideFrom({})).toEqual(NO_META_OVERRIDE);
  });

  it('trims, and stores blanks as null so they fall through to the destination', () => {
    expect(
      metaOverrideFrom({ meta_override_enabled: true, meta_title: '  Title ', meta_description: '  ' }),
    ).toEqual({ meta_override_enabled: true, meta_title: 'Title', meta_description: null, meta_image_url: null });
  });

  it('refuses a missing title, an over-long field and a non-public or non-https image', () => {
    expect(() => metaOverrideFrom({ meta_override_enabled: true })).toThrow('title');
    expect(() => metaOverrideFrom({ meta_override_enabled: true, meta_title: 'x'.repeat(121) })).toThrow('120');
    expect(() =>
      metaOverrideFrom({ meta_override_enabled: true, meta_title: 'T', meta_description: 'x'.repeat(301) }),
    ).toThrow('300');
    for (const image of ['http://cdn.example.org/i.png', 'https://127.0.0.1/i.png', 'not a url']) {
      expect(() =>
        metaOverrideFrom({ meta_override_enabled: true, meta_title: 'T', meta_image_url: image }),
      ).toThrow('https');
    }
  });
});
