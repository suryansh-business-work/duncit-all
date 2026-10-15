import { describe, expect, it } from 'vitest';
import {
  ADMIN_FOOD_MENU_QUERY,
  blankFoodDish,
  blankFoodLicences,
  blankFoodOrdering,
  canTakeFoodOrders,
  FOOD_MENU_CONFIG_QUERY,
  FOOD_RAZORPAY_CONNECTIONS_QUERY,
  foodDishToValues,
  foodGstinInput,
  foodLicencesToValues,
  foodMenuToValues,
  foodOrderingToValues,
  foodTablesToValues,
  isFoodMenuEditable,
  OWNER_FOOD_MENU_QUERY,
  razorpayConnectionsOf,
  toFoodMenuSaveInput,
  toVenueFoodInput,
  UPDATE_VENUE_FOOD_MENU_MUTATION,
  type FoodDishValues,
  type FoodMenuFormValues,
  type FoodMenuVenue,
  type FoodRazorpayConnection,
} from '../src/venue-food-menu';

const GSTIN = '22ABCDE1234F1Z5';

const dosa: FoodDishValues = {
  item_id: 'dish-1',
  name: '  Masala dosa ',
  description: ' Crisp ',
  category: ' Mains ',
  price: '120.5',
  images: ['https://cdn.example.test/dosa.jpg'],
  diet: 'VEG',
  spice_level: 'MILD',
  is_available: true,
  videos: ['https://youtu.be/dQw4w9WgXcQ'],
  original_price: '',
  saving_display: 'PERCENT',
};

const LICENCES = {
  fssai_number: '12345678901234',
  fssai_document_url: 'https://cdn.example.test/fssai.pdf',
  liquor_licence_number: 'LIQ-77',
  liquor_document_url: '',
};

const values = (over: Partial<FoodMenuFormValues> = {}): FoodMenuFormValues => ({
  offers_food: true,
  food_menu: [dosa],
  food_ordering: { ...blankFoodOrdering, enabled: true, razorpay_integration_id: 'rzp-1', discount_pct: '10' },
  food_licences: blankFoodLicences,
  food_tables: '',
  gstin: '',
  ...over,
});

const venue = (over: Partial<FoodMenuVenue> = {}): FoodMenuVenue => ({
  id: 'v1',
  venue_name: 'Blue Door Café',
  status: 'APPROVED',
  gstin: GSTIN,
  offers_food: true,
  food_menu: [
    {
      id: 'dish-1',
      name: 'Masala dosa',
      description: 'Crisp',
      category: 'Mains',
      price: 120,
      images: [],
      diet: 'VEG',
      spice_level: 'MILD',
      is_available: false,
    },
  ],
  food_ordering: {
    enabled: true,
    razorpay_integration_id: 'rzp-1',
    razorpay_linked: true,
    discount_pct: 5,
    tax_override: true,
    tax_mode: 'EXCLUSIVE',
    gst_pct: 5,
  },
  ...over,
});

describe('the menu documents', () => {
  it('each name its operation, close every brace they open and read the same venue fields', () => {
    const docs = [
      OWNER_FOOD_MENU_QUERY,
      ADMIN_FOOD_MENU_QUERY,
      FOOD_MENU_CONFIG_QUERY,
      UPDATE_VENUE_FOOD_MENU_MUTATION,
      FOOD_RAZORPAY_CONNECTIONS_QUERY,
    ];
    const names = docs.map((doc) => {
      expect(doc.split('{')).toHaveLength(doc.split('}').length);
      return /^\s*(?:query|mutation) (\w+)/.exec(doc)?.[1];
    });
    expect(names).toEqual([
      'OwnerVenueFoodMenu',
      'AdminVenueFoodMenu',
      'VenueFoodMenuConfig',
      'UpdateVenueFoodMenu',
      'FoodRazorpayConnections',
    ]);
    // The owner reads its own venue, the console any venue; both read the same selection the save returns.
    expect(OWNER_FOOD_MENU_QUERY).toContain('myVenue(venue_id: $venue_id)');
    expect(ADMIN_FOOD_MENU_QUERY).toContain('venue(venue_doc_id: $venue_id)');
    expect(UPDATE_VENUE_FOOD_MENU_MUTATION).toContain('updateApprovedVenue(venue_id: $venue_id, input: $input)');
    for (const doc of [OWNER_FOOD_MENU_QUERY, ADMIN_FOOD_MENU_QUERY, UPDATE_VENUE_FOOD_MENU_MUTATION]) {
      expect(doc).toContain('razorpay_linked');
      expect(doc).toContain('gstin');
    }
  });
});

describe('form values from the stored venue', () => {
  it('opens a stored venue as it stands, the saved GST number included', () => {
    expect(foodMenuToValues(venue())).toEqual({
      offers_food: true,
      food_menu: [
        {
          item_id: 'dish-1',
          name: 'Masala dosa',
          description: 'Crisp',
          category: 'Mains',
          price: 120,
          images: [],
          diet: 'VEG',
          spice_level: 'MILD',
          is_available: false,
          videos: [],
          original_price: '',
          saving_display: 'PERCENT',
        },
      ],
      food_ordering: {
        enabled: true,
        razorpay_integration_id: 'rzp-1',
        razorpay_linked: true,
        discount_pct: 5,
        tax_override: true,
        tax_mode: 'EXCLUSIVE',
        gst_pct: 5,
      },
      food_licences: blankFoodLicences,
      food_tables: '',
      gstin: GSTIN,
    });
  });

  it('opens a venue that never set food up on the blank block', () => {
    const fresh = foodMenuToValues(venue({ gstin: null, offers_food: false, food_menu: [], food_ordering: null }));
    expect(fresh).toEqual({
      offers_food: false,
      food_menu: [],
      food_ordering: blankFoodOrdering,
      food_licences: blankFoodLicences,
      food_tables: '',
      gstin: '',
    });
    expect(foodOrderingToValues({ enabled: true, razorpay_linked: false, discount_pct: 0, tax_override: false })).toEqual(
      { ...blankFoodOrdering, enabled: true },
    );
  });

  it('reads a partial dish (a draft venue’s) as an available, blank row', () => {
    expect(foodDishToValues({ name: 'Chai' })).toEqual({
      item_id: '',
      name: 'Chai',
      description: '',
      category: '',
      price: '',
      images: [],
      diet: '',
      spice_level: '',
      is_available: true,
      videos: [],
      original_price: '',
      saving_display: 'PERCENT',
    });
    expect(foodDishToValues({}).name).toBe('');
  });

  it('starts a new dish on the catalogues’ first entries, or blank when there are none', () => {
    expect(blankFoodDish({ food_diets: ['VEG', 'EGG'], food_spice_levels: ['NONE', 'HOT'] })).toMatchObject({
      item_id: '',
      price: '',
      diet: 'VEG',
      spice_level: 'NONE',
      is_available: true,
      videos: [],
      original_price: '',
      saving_display: 'PERCENT',
    });
    expect(blankFoodDish({ food_diets: [], food_spice_levels: [] })).toMatchObject({ diet: '', spice_level: '' });
  });
});

describe('the gates', () => {
  it('opens ordering only with an account and an available dish', () => {
    expect(canTakeFoodOrders([{ is_available: true }], true)).toBe(true);
    expect(canTakeFoodOrders([{ is_available: true }], false)).toBe(false);
    expect(canTakeFoodOrders([{ is_available: false }], true)).toBe(false);
    expect(canTakeFoodOrders([], true)).toBe(false);
  });

  it('edits the menu on its own only once the venue is approved', () => {
    expect(isFoodMenuEditable({ status: 'APPROVED' })).toBe(true);
    expect(isFoodMenuEditable({ status: 'SUBMITTED' })).toBe(false);
  });

  it('offers only Razorpay connections for food payments', () => {
    const connection = (id: string, provider: string): FoodRazorpayConnection => ({
      id,
      provider,
      label: id,
      status: { connected: true },
    });
    expect(razorpayConnectionsOf([connection('a', 'RAZORPAY'), connection('b', 'SHIPROCKET')]).map((c) => c.id)).toEqual(['a']);
  });
});

describe('the food input', () => {
  it('sends only the switch while the venue serves no food, so the server keeps the menu', () => {
    expect(toVenueFoodInput(values({ offers_food: false }), { sendAccount: true })).toEqual({ offers_food: false });
  });

  it('sends each dish trimmed, priced and under its own id, with the owner’s account when it is edited here', () => {
    expect(toVenueFoodInput(values(), { sendAccount: true })).toEqual({
      offers_food: true,
      food_menu: [
        {
          id: 'dish-1',
          name: 'Masala dosa',
          description: 'Crisp',
          category: 'Mains',
          price: 120.5,
          images: ['https://cdn.example.test/dosa.jpg'],
          diet: 'VEG',
          spice_level: 'MILD',
          is_available: true,
          videos: ['https://youtu.be/dQw4w9WgXcQ'],
          original_price: null,
          saving_display: 'PERCENT',
        },
      ],
      food_ordering: { enabled: true, razorpay_integration_id: 'rzp-1', discount_pct: 10, tax_override: false },
      food_licences: blankFoodLicences,
      food_tables: [],
    });
  });

  it('sends a new dish without an id, a blank enum as null and an unreadable number as 0', () => {
    const input = toVenueFoodInput(
      values({
        food_menu: [{ ...dosa, item_id: '', price: 'abc', diet: '', spice_level: '', videos: [], saving_display: '' }],
        food_ordering: { ...blankFoodOrdering, discount_pct: '' },
      }),
      { sendAccount: true },
    );
    expect(input.food_menu?.[0]).toEqual({
      name: 'Masala dosa',
      description: 'Crisp',
      category: 'Mains',
      price: 0,
      images: ['https://cdn.example.test/dosa.jpg'],
      diet: null,
      spice_level: null,
      is_available: true,
      videos: [],
      original_price: null,
      saving_display: null,
    });
    // An unlinked owner sends null, which the server reads as "unlink".
    expect(input.food_ordering).toEqual({ enabled: false, razorpay_integration_id: null, discount_pct: 0, tax_override: false });
  });

  it('never names the account on a surface that does not edit it, so the owner’s link stays', () => {
    expect(toVenueFoodInput(values(), { sendAccount: false }).food_ordering).toEqual({
      enabled: true,
      discount_pct: 10,
      tax_override: false,
    });
  });

  it('sends the venue’s own GST only while it overrides Finance’s default', () => {
    const ordering = { ...blankFoodOrdering, tax_override: true, tax_mode: 'INCLUSIVE', gst_pct: '18' };
    expect(toVenueFoodInput(values({ food_ordering: ordering }), { sendAccount: false }).food_ordering).toEqual({
      enabled: false,
      discount_pct: 0,
      tax_override: true,
      tax_mode: 'INCLUSIVE',
      gst_pct: 18,
    });
  });
});

describe('the GST number on the invoices', () => {
  it('lets an owner give it once, upper-cased, and never resends or changes a saved one', () => {
    expect(foodGstinInput(` ${GSTIN.toLowerCase()} `, '', 'owner')).toEqual({ gstin: GSTIN });
    expect(foodGstinInput(GSTIN, GSTIN, 'owner')).toEqual({});
    expect(foodGstinInput('27ABCDE1234F1Z5', GSTIN, 'owner')).toEqual({});
  });

  it('lets a console editor change it, and sends nothing when it did not move or was emptied', () => {
    expect(foodGstinInput('27ABCDE1234F1Z5', GSTIN, 'admin')).toEqual({ gstin: '27ABCDE1234F1Z5' });
    expect(foodGstinInput(GSTIN.toLowerCase(), ` ${GSTIN} `, 'admin')).toEqual({});
    expect(foodGstinInput('  ', GSTIN, 'admin')).toEqual({});
  });

  it('puts the food input and the GST number into one save, and leaves the number out while food is off', () => {
    const options = { sendAccount: false, mode: 'owner', savedGstin: '' } as const;
    expect(toFoodMenuSaveInput(values({ gstin: GSTIN }), options)).toMatchObject({ offers_food: true, gstin: GSTIN });
    expect(toFoodMenuSaveInput(values({ offers_food: false, gstin: GSTIN }), options)).toEqual({ offers_food: false });
  });
});

describe('the dish extras: videos and the struck-through price', () => {
  it('opens a stored dish with its videos, original price and saving display', () => {
    expect(
      foodDishToValues({ name: 'Thali', videos: ['https://youtu.be/abc'], original_price: 300, saving_display: 'AMOUNT' }),
    ).toMatchObject({ videos: ['https://youtu.be/abc'], original_price: 300, saving_display: 'AMOUNT' });
    // A stored null original reads as a blank field, a null display as the percent.
    expect(foodDishToValues({ original_price: null, saving_display: null })).toMatchObject({
      original_price: '',
      saving_display: 'PERCENT',
    });
  });

  it('sends the original price as a number, and blank, 0 or unreadable as null (no strikethrough)', () => {
    const sent = (original_price: number | string) =>
      toVenueFoodInput(values({ food_menu: [{ ...dosa, original_price }] }), { sendAccount: false }).food_menu?.[0];
    expect(sent('150')).toMatchObject({ original_price: 150, price: 120.5 });
    expect(sent(180)).toMatchObject({ original_price: 180 });
    expect(sent('')).toMatchObject({ original_price: null });
    expect(sent(0)).toMatchObject({ original_price: null });
    expect(sent('abc')).toMatchObject({ original_price: null });
  });

  it('sends the saving display as chosen', () => {
    const input = toVenueFoodInput(values({ food_menu: [{ ...dosa, saving_display: 'AMOUNT' }] }), { sendAccount: false });
    expect(input.food_menu?.[0]).toMatchObject({ saving_display: 'AMOUNT' });
  });
});

describe('the licences and tables', () => {
  it('opens stored licences as they stand, and fills any the venue never gave with blanks', () => {
    expect(foodLicencesToValues(LICENCES)).toEqual(LICENCES);
    expect(foodLicencesToValues({ fssai_number: '12345678901234' })).toEqual({
      ...blankFoodLicences,
      fssai_number: '12345678901234',
    });
    expect(foodLicencesToValues(null)).toEqual(blankFoodLicences);
    expect(foodLicencesToValues(undefined)).toEqual(blankFoodLicences);
  });

  it('opens stored tables as the field text', () => {
    expect(foodTablesToValues(['1', '2', 'Patio'])).toBe('1, 2, Patio');
    expect(foodTablesToValues(null)).toBe('');
    expect(foodTablesToValues(undefined)).toBe('');
  });

  it('reads a stored venue’s licences and tables into the form', () => {
    const opened = foodMenuToValues(venue({ food_licences: LICENCES, food_tables: ['T1', 'T2'] }));
    expect(opened.food_licences).toEqual(LICENCES);
    expect(opened.food_tables).toBe('T1, T2');
  });

  it('sends the licence numbers trimmed, the documents untouched, and each table once', () => {
    const input = toVenueFoodInput(
      values({
        food_licences: { ...LICENCES, fssai_number: ' 12345678901234 ', liquor_licence_number: '  LIQ-77 ' },
        food_tables: '1, 2\nPatio, patio, ',
      }),
      { sendAccount: false },
    );
    expect(input.food_licences).toEqual(LICENCES);
    expect(input.food_tables).toEqual(['1', '2', 'Patio']);
  });

  it('sends neither while the venue serves no food', () => {
    expect(
      toVenueFoodInput(values({ offers_food: false, food_licences: LICENCES, food_tables: '1, 2' }), { sendAccount: true }),
    ).toEqual({ offers_food: false });
  });

  it('reads and returns the new fields in every menu document, and the new limits in the config', () => {
    const fields = ['videos', 'original_price', 'saving_display', 'food_licences', 'fssai_number', 'liquor_document_url', 'food_tables'];
    for (const doc of [OWNER_FOOD_MENU_QUERY, ADMIN_FOOD_MENU_QUERY, UPDATE_VENUE_FOOD_MENU_MUTATION]) {
      for (const field of fields) expect(doc).toContain(field);
    }
    expect(FOOD_MENU_CONFIG_QUERY).toContain('food_video_limit');
    expect(FOOD_MENU_CONFIG_QUERY).toContain('food_table_limit');
  });
});
