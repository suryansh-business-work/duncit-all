/**
 * The venue's food write, without a database: the dish's videos and its
 * struck-through MRP, the FSSAI and liquor licences, the per-table QR list, and
 * what of all that a signed-out visitor may see. No case here links a Razorpay
 * account, so nothing reads the database.
 */
import { Types } from 'mongoose';
import {
  VENUE_FOOD_LICENCE_NUMBER_MAX,
  VENUE_FOOD_TABLE_LABEL_MAX,
  VENUE_FOOD_TABLE_LIMIT,
  VENUE_FOOD_VIDEO_LIMIT,
  VENUE_VIDEO_LIMIT,
} from '../../venue.constants';
import {
  buildVenueFoodPatch,
  normalizeVenueVideos,
  redactVenueFoodForPublic,
  toVenueFoodPub,
  venueFoodConfig,
  type VenueFoodInput,
  type VenueFoodState,
} from '../../venue.food';
import type { IVenueFoodItem } from '../../venue.model';

const FSSAI = '12345678901234';
const CLIP = 'https://ik.imagekit.io/duncit/prod/venues/clip.mp4';
const YOUTUBE = 'https://youtu.be/dQw4w9WgXcQ';

const state = (over: Partial<VenueFoodState> = {}): VenueFoodState => ({ owner_user_id: new Types.ObjectId(), ...over });
const patch = (input: VenueFoodInput, current: VenueFoodState = state()) => buildVenueFoodPatch(input, current);
const dish = (over: Record<string, unknown> = {}) => ({ name: 'Paneer Tikka', price: 240, ...over });

async function firstDish(over: Record<string, unknown>) {
  const result = await patch({ food_menu: [dish(over)] });
  if (!('food_menu' in result)) throw new Error('expected a food patch');
  return result.food_menu[0];
}

describe('a dish: videos, original price and how the saving reads', () => {
  it('defaults a dish without the new fields to no videos, no MRP and a percent saving', async () => {
    expect(await firstDish({})).toMatchObject({ videos: [], original_price: null, saving_display: 'PERCENT' });
  });

  it('keeps videos and an MRP above the price, rounded to paise', async () => {
    expect(await firstDish({ videos: [YOUTUBE, CLIP], original_price: 299.999, saving_display: 'AMOUNT' })).toMatchObject({
      videos: [YOUTUBE, CLIP],
      original_price: 300,
      saving_display: 'AMOUNT',
    });
  });

  it('reads a blank or zero MRP as "no strikethrough"', async () => {
    for (const original_price of [null, '', 0, '0']) {
      expect((await firstDish({ original_price })).original_price).toBeNull();
    }
  });

  it('refuses an MRP equal to or below the price — the saving would be a mark-up', async () => {
    for (const original_price of [240, 239.99, 100]) {
      await expect(patch({ food_menu: [dish({ original_price })] })).rejects.toThrow(
        'The original price of "Paneer Tikka" must be more than its price'
      );
    }
    expect((await firstDish({ original_price: 240.01 })).original_price).toBe(240.01);
  });

  it('refuses an MRP that is not a number or is over the price cap', async () => {
    for (const original_price of ['abc', 100_001]) {
      await expect(patch({ food_menu: [dish({ original_price })] })).rejects.toThrow(/Enter an original price up to 100000/);
    }
    expect((await firstDish({ original_price: 100_000 })).original_price).toBe(100_000);
  });

  it('refuses a saving display it does not know', async () => {
    await expect(patch({ food_menu: [dish({ saving_display: 'FREE' })] })).rejects.toThrow('Choose a valid saving display');
  });

  it("holds a dish to its own video limit and names the dish in the refusal", async () => {
    const videos = Array.from({ length: VENUE_FOOD_VIDEO_LIMIT + 1 }, (_, index) => `${CLIP}?n=${index}`);
    await expect(patch({ food_menu: [dish({ videos })] })).rejects.toThrow(
      `"Paneer Tikka" can have at most ${VENUE_FOOD_VIDEO_LIMIT} videos`
    );
    await expect(patch({ food_menu: [dish({ videos: ['https://www.youtube.com/@cafe'] })] })).rejects.toThrow(
      /YouTube video link/
    );
  });
});

describe("the venue's own videos", () => {
  it('allows the venue limit and refuses one more', () => {
    const videos = Array.from({ length: VENUE_VIDEO_LIMIT + 1 }, (_, index) => `${CLIP}?n=${index}`);
    expect(normalizeVenueVideos(videos.slice(0, VENUE_VIDEO_LIMIT))).toHaveLength(VENUE_VIDEO_LIMIT);
    expect(() => normalizeVenueVideos(videos)).toThrow(`The venue can have at most ${VENUE_VIDEO_LIMIT} videos`);
  });
});

describe('licences', () => {
  it('stores a 14-digit FSSAI number and the document links, trimmed', async () => {
    const result = await patch({
      food_licences: {
        fssai_number: ` ${FSSAI} `,
        fssai_document_url: 'https://ik.imagekit.io/duncit/fssai.pdf',
        liquor_licence_number: 'MH/L-1/2026/123',
        liquor_document_url: 'https://ik.imagekit.io/duncit/liquor.pdf',
      },
    });
    expect(result).toMatchObject({
      food_licences: {
        fssai_number: FSSAI,
        fssai_document_url: 'https://ik.imagekit.io/duncit/fssai.pdf',
        liquor_licence_number: 'MH/L-1/2026/123',
        liquor_document_url: 'https://ik.imagekit.io/duncit/liquor.pdf',
      },
    });
  });

  it('refuses an FSSAI number that is not exactly 14 digits', async () => {
    for (const fssai_number of ['1234567890123', '123456789012345', '1234567890123X']) {
      await expect(patch({ food_licences: { fssai_number } })).rejects.toThrow('The FSSAI number must be 14 digits');
    }
  });

  it('holds the liquor licence number to its length, exactly the cap allowed', async () => {
    const atCap = 'L'.repeat(VENUE_FOOD_LICENCE_NUMBER_MAX);
    await expect(patch({ food_licences: { liquor_licence_number: atCap } })).resolves.toMatchObject({
      food_licences: { liquor_licence_number: atCap },
    });
    await expect(patch({ food_licences: { liquor_licence_number: `${atCap}L` } })).rejects.toThrow(
      /liquor licence number under 40 characters/
    );
  });

  it('refuses a document link that is not a web address', async () => {
    await expect(patch({ food_licences: { fssai_document_url: 'file:///fssai.pdf' } })).rejects.toThrow(
      'Upload the FSSAI licence again'
    );
  });

  it('keeps a key left out or null, and clears one sent blank', async () => {
    const current = state({
      food_licences: { fssai_number: FSSAI, fssai_document_url: '', liquor_licence_number: 'LIQ-1', liquor_document_url: '' },
    });
    expect(await patch({ food_licences: { fssai_number: null, liquor_licence_number: '' } }, current)).toMatchObject({
      food_licences: { fssai_number: FSSAI, liquor_licence_number: '' },
    });
  });

  it('carries the stored licences through a write that does not name them, filling a legacy venue with blanks', async () => {
    const current = state({ food_licences: { fssai_number: FSSAI } });
    expect(await patch({ offers_food: true }, current)).toMatchObject({
      food_licences: { fssai_number: FSSAI, fssai_document_url: '', liquor_licence_number: '', liquor_document_url: '' },
    });
  });
});

describe('tables', () => {
  it('trims, drops blanks and folds case-insensitive duplicates, keeping the first spelling and the order', async () => {
    expect(await patch({ food_tables: [' 1 ', 'Patio', '', 'patio', 2, '1', 'Bar 3'] })).toMatchObject({
      food_tables: ['1', 'Patio', 'Bar 3'],
    });
  });

  it('refuses a table name over the label cap', async () => {
    await expect(patch({ food_tables: ['T'.repeat(VENUE_FOOD_TABLE_LABEL_MAX)] })).resolves.toBeDefined();
    await expect(patch({ food_tables: ['T'.repeat(VENUE_FOOD_TABLE_LABEL_MAX + 1)] })).rejects.toThrow(
      `Keep each table name under ${VENUE_FOOD_TABLE_LABEL_MAX} characters`
    );
  });

  it('allows the table limit, counting after duplicates are folded, and refuses one more', async () => {
    const tables = Array.from({ length: VENUE_FOOD_TABLE_LIMIT }, (_, index) => String(index + 1));
    await expect(patch({ food_tables: [...tables, '1', '2'] })).resolves.toMatchObject({
      food_tables: expect.arrayContaining(['1', String(VENUE_FOOD_TABLE_LIMIT)]),
    });
    await expect(patch({ food_tables: [...tables, 'one more'] })).rejects.toThrow(
      `A venue can list at most ${VENUE_FOOD_TABLE_LIMIT} tables`
    );
  });

  it('keeps the stored tables when a write leaves them out, and a legacy venue reads none', async () => {
    expect(await patch({ offers_food: true }, state({ food_tables: ['1', '2'] }))).toMatchObject({ food_tables: ['1', '2'] });
    expect(await patch({ offers_food: true }, state({ food_tables: null }))).toMatchObject({ food_tables: [] });
  });

  it('writes nothing when the input names no food field at all', async () => {
    expect(await patch({ food_tables: null, food_licences: null })).toEqual({});
  });
});

describe('what the venue shows', () => {
  /** A dish as saved before videos and the MRP existed. */
  const legacy: IVenueFoodItem = {
    _id: new Types.ObjectId(),
    name: 'Paneer Tikka',
    description: '',
    category: '',
    price: 240,
    images: [],
    diet: 'VEG',
    spice_level: 'NONE',
    is_available: true,
  };
  const item: IVenueFoodItem = {
    ...legacy,
    videos: [YOUTUBE],
    original_price: 300,
    saving_display: 'AMOUNT',
  };
  const stored = {
    offers_food: true,
    food_menu: [item],
    food_licences: {
      fssai_number: FSSAI,
      fssai_document_url: 'https://ik.imagekit.io/duncit/fssai.pdf',
      liquor_licence_number: 'LIQ-1',
      liquor_document_url: 'https://ik.imagekit.io/duncit/liquor.pdf',
    },
    food_tables: ['1', 'Patio'],
  };

  it("gives the owner the dish's new fields, the licences and the tables", () => {
    const pub = toVenueFoodPub(stored);
    expect(pub.food_menu[0]).toMatchObject({ videos: [YOUTUBE], original_price: 300, saving_display: 'AMOUNT' });
    expect(pub.food_licences).toEqual(stored.food_licences);
    expect(pub.food_tables).toEqual(['1', 'Patio']);
  });

  it('reads a dish and a venue saved before these fields existed with their defaults', () => {
    const pub = toVenueFoodPub({ offers_food: true, food_menu: [legacy] });
    expect(pub.food_menu[0]).toMatchObject({ videos: [], original_price: null, saving_display: 'PERCENT' });
    expect(pub.food_licences).toEqual({ fssai_number: '', fssai_document_url: '', liquor_licence_number: '', liquor_document_url: '' });
    expect(pub.food_tables).toEqual([]);
  });

  it('shows a visitor the licence numbers a menu prints, never the documents or the table list', () => {
    const shown = redactVenueFoodForPublic(toVenueFoodPub(stored));
    expect(shown.food_licences).toEqual({
      fssai_number: FSSAI,
      fssai_document_url: '',
      liquor_licence_number: 'LIQ-1',
      liquor_document_url: '',
    });
    expect(shown.food_tables).toEqual([]);
  });

  it('shows a visitor no licence numbers at a venue that does not serve food', () => {
    const shown = redactVenueFoodForPublic(toVenueFoodPub({ ...stored, offers_food: false }));
    expect(shown.food_licences.fssai_number).toBe('');
    expect(shown.food_licences.liquor_licence_number).toBe('');
    expect(shown.food_menu).toEqual([]);
  });

  it('publishes the new limits in the food config', () => {
    expect(venueFoodConfig()).toMatchObject({
      food_video_limit: VENUE_FOOD_VIDEO_LIMIT,
      venue_video_limit: VENUE_VIDEO_LIMIT,
      food_table_limit: VENUE_FOOD_TABLE_LIMIT,
    });
  });
});
