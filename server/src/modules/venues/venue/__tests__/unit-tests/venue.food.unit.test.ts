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

/** A dish as the venue already stores it. */
const storedDish = (id = new Types.ObjectId()) => ({ ...dish(), _id: id, is_available: true }) as unknown as IVenueFoodItem;

describe('a dish: the checks every menu row passes', () => {
  it('refuses a row without a name, including an empty row, and a name, description or section that is too long', async () => {
    const cases: Array<[unknown, string]> = [
      [null, 'Every menu item needs a name'],
      [dish({ name: '   ' }), 'Every menu item needs a name'],
      [dish({ name: 'N'.repeat(81) }), 'Menu item names must be 80 characters or fewer'],
      [dish({ description: 'd'.repeat(501) }), 'Keep the description of "Paneer Tikka" under 500 characters'],
      [dish({ category: 'c'.repeat(41) }), 'Keep the menu section of "Paneer Tikka" under 40 characters'],
    ];
    for (const [row, message] of cases) {
      await expect(patch({ food_menu: [row] })).rejects.toThrow(message);
    }
    expect(await firstDish({ description: 'd'.repeat(500), category: 'c'.repeat(40) })).toMatchObject({
      description: 'd'.repeat(500),
      category: 'c'.repeat(40),
    });
  });

  it('refuses a price under 1, over the cap or not a number, and rounds a good one to paise', async () => {
    for (const price of [0, 0.99, 100_001, 'abc']) {
      await expect(patch({ food_menu: [dish({ price })] })).rejects.toThrow('Enter a price between 1 and 100000 for "Paneer Tikka"');
    }
    expect((await firstDish({ price: '99.999' })).price).toBe(100);
  });

  it('keeps at most five photos, trimmed and without repeats', async () => {
    const photo = (n: number) => `https://ik.imagekit.io/duncit/dish-${n}.jpg`;
    expect((await firstDish({ images: [` ${photo(1)} `, photo(1), '', photo(2)] })).images).toEqual([photo(1), photo(2)]);
    await expect(patch({ food_menu: [dish({ images: [1, 2, 3, 4, 5, 6].map(photo) })] })).rejects.toThrow(
      '"Paneer Tikka" can have at most 5 photos'
    );
  });

  it('defaults the food type and spice level, and refuses ones it does not know', async () => {
    expect(await firstDish({ diet: '', spice_level: null, is_available: false })).toMatchObject({
      diet: 'VEG',
      spice_level: 'NONE',
      is_available: false,
    });
    await expect(patch({ food_menu: [dish({ diet: 'PESCATARIAN' })] })).rejects.toThrow('Choose a valid food type');
    await expect(patch({ food_menu: [dish({ spice_level: 'VOLCANIC' })] })).rejects.toThrow('Choose a valid spice level');
  });

  it('keeps the id of a dish the venue already lists, and gives anything else a new one', async () => {
    const known = new Types.ObjectId();
    const foreign = new Types.ObjectId().toHexString();
    const result = await patch(
      { food_menu: [dish({ id: known.toHexString() }), dish({ id: foreign })] },
      state({ food_menu: [storedDish(known)] })
    );
    if (!('food_menu' in result)) throw new Error('expected a food patch');
    expect(result.food_menu[0]._id.toHexString()).toBe(known.toHexString());
    expect(result.food_menu[1]._id.toHexString()).not.toBe(foreign);
  });

  it('refuses the same dish sent twice, and a menu over the item limit', async () => {
    const known = new Types.ObjectId();
    await expect(
      patch({ food_menu: [dish({ id: known.toHexString() }), dish({ id: known.toHexString() })] }, state({ food_menu: [storedDish(known)] }))
    ).rejects.toThrow('The same menu item was sent twice');
    await expect(patch({ food_menu: Array.from({ length: 201 }, () => dish()) })).rejects.toThrow('A menu can list at most 200 items');
  });
});

describe('food ordering: discount, GST and when it may be switched on', () => {
  it('takes a whole discount from 0 to 90, keeps the stored one when none is sent, and refuses anything else', async () => {
    expect(await patch({ food_ordering: { discount_pct: 90 } })).toMatchObject({ food_ordering: { discount_pct: 90 } });
    expect(await patch({ food_ordering: { discount_pct: null } }, state({ food_ordering: { discount_pct: 15 } }))).toMatchObject({
      food_ordering: { discount_pct: 15 },
    });
    for (const discount_pct of [91, -1, 2.5]) {
      await expect(patch({ food_ordering: { discount_pct } })).rejects.toThrow('The discount must be a whole number from 0 to 90');
    }
  });

  it("stores the venue's own GST when sent, keeps what is stored when not, and refuses an invalid one", async () => {
    expect(await patch({ food_ordering: { tax_override: true, tax_mode: 'INCLUSIVE', gst_pct: 12 } })).toMatchObject({
      food_ordering: { tax_override: true, tax_mode: 'INCLUSIVE', gst_pct: 12 },
    });
    const stored = state({ food_ordering: { tax_override: true, tax_mode: 'INCLUSIVE', gst_pct: 18 } });
    expect(await patch({ food_ordering: { discount_pct: 5 } }, stored)).toMatchObject({
      food_ordering: { tax_override: true, tax_mode: 'INCLUSIVE', gst_pct: 18 },
    });
    // A venue saved before food GST existed reads the shipped default.
    expect(await patch({ food_ordering: { discount_pct: 5 } })).toMatchObject({
      food_ordering: { tax_override: false, tax_mode: 'EXCLUSIVE', gst_pct: 5 },
    });
    await expect(patch({ food_ordering: { tax_mode: 'BOTH' } })).rejects.toThrow('Choose whether prices include GST or have it added');
    await expect(patch({ food_ordering: { gst_pct: 29 } })).rejects.toThrow('GST must be a whole number from 0 to 28');
  });

  it('refuses a Razorpay account id that is not an id, before reading anything', async () => {
    await expect(patch({ food_ordering: { razorpay_integration_id: 'not-an-id' } })).rejects.toThrow('Choose a valid Razorpay account');
  });

  it('unlinks the account when a blank one is sent, and keeps the stored one when none is sent', async () => {
    const linked = new Types.ObjectId();
    const current = state({ food_ordering: { razorpay_integration_id: linked } });
    expect(await patch({ food_ordering: { razorpay_integration_id: '' } }, current)).toMatchObject({
      food_ordering: { razorpay_integration_id: null },
    });
    const kept = await patch({ food_ordering: { discount_pct: 5 } }, current);
    if (!('food_ordering' in kept)) throw new Error('expected a food patch');
    expect(kept.food_ordering.razorpay_integration_id?.toHexString()).toBe(linked.toHexString());
  });

  it('refuses switching ordering on without an available dish, or without an account to be paid on', async () => {
    await expect(patch({ food_ordering: { enabled: true } }, state({ offers_food: true }))).rejects.toThrow(
      'Add at least one available menu item before taking food orders'
    );
    await expect(patch({ food_ordering: { enabled: true } }, state({ offers_food: true, food_menu: [storedDish()] }))).rejects.toThrow(
      'Connect a Razorpay account before taking food orders'
    );
  });

  it('switches ordering off, rather than refusing, for a venue that stops serving food', async () => {
    const linked = new Types.ObjectId();
    const current = state({ offers_food: true, food_ordering: { enabled: true, razorpay_integration_id: linked } });
    expect(await patch({ offers_food: false, food_ordering: { enabled: true } }, current)).toMatchObject({
      offers_food: false,
      food_ordering: { enabled: false },
    });
  });
});

describe('what the venue shows: legacy and empty records', () => {
  it('reads a bare dish with every optional field at its default', () => {
    const bare = { _id: new Types.ObjectId(), name: 'Chai', price: 30 } as unknown as IVenueFoodItem;
    expect(toVenueFoodPub({ offers_food: true, food_menu: [bare] }).food_menu[0]).toEqual({
      id: bare._id.toHexString(),
      name: 'Chai',
      description: '',
      category: '',
      price: 30,
      images: [],
      diet: 'VEG',
      spice_level: 'NONE',
      is_available: true,
      videos: [],
      original_price: null,
      saving_display: 'PERCENT',
    });
  });

  it('reads a venue with no food fields at all as serving nothing and taking no orders', () => {
    expect(toVenueFoodPub({})).toMatchObject({
      offers_food: false,
      food_menu: [],
      food_ordering: {
        enabled: false,
        razorpay_integration_id: null,
        razorpay_linked: false,
        discount_pct: 0,
        tax_override: false,
        tax_mode: null,
        gst_pct: null,
      },
    });
  });

  it('shows a linked account to the owner, and never to a visitor', () => {
    const linked = new Types.ObjectId();
    const pub = toVenueFoodPub({ offers_food: true, food_ordering: { enabled: true, razorpay_integration_id: linked } });
    expect(pub.food_ordering).toMatchObject({ razorpay_integration_id: linked.toHexString(), razorpay_linked: true });
    expect(redactVenueFoodForPublic(pub).food_ordering).toMatchObject({ enabled: true, razorpay_integration_id: null, razorpay_linked: true });
  });
});
