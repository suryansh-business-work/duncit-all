import type { MockedResponse } from '@apollo/client/testing';
import { ADMIN_CATEGORIES, type AdminCategoryValue } from '@duncit/category';
import { ADMIN_LOCATIONS } from '@duncit/location';
import type { VenueRegistrationConfig } from '../queries';

/**
 * The two admin catalogues the venue form's shared pickers read — the category
 * tree and the location list — as `MockedProvider` answers. Test fixture, not
 * shipped code.
 *
 * Every field of each query's selection is present on purpose: Apollo refuses to
 * write a result that is missing one, and the cascade would then render empty.
 */
export const catalogueMocks: MockedResponse[] = [
  {
    request: { query: ADMIN_CATEGORIES },
    result: {
      data: {
        categories: [
          { __typename: 'Category', id: 'sup-1', name: 'Social', slug: 'social', level: 'SUPER', parent_id: null, min_pax: null },
          { __typename: 'Category', id: 'cat-1', name: 'Board Games', slug: 'board-games', level: 'CATEGORY', parent_id: 'sup-1', min_pax: null },
          { __typename: 'Category', id: 'sub-1', name: 'Catan Night', slug: 'catan-night', level: 'SUB', parent_id: 'cat-1', min_pax: 4 },
          { __typename: 'Category', id: 'sub-2', name: 'Chess', slug: 'chess', level: 'SUB', parent_id: 'cat-1', min_pax: null },
        ],
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
  {
    request: { query: ADMIN_LOCATIONS },
    result: {
      data: {
        locations: [
          {
            __typename: 'Location',
            id: 'loc-1',
            location_name: 'Bengaluru',
            country: 'India',
            country_code: 'IN',
            state: 'Karnataka',
            state_code: 'KA',
            city: 'Bengaluru',
            location_pincode: '560001',
            location_zones: [
              { __typename: 'LocationZone', zone_name: 'Indiranagar', zone_code: 'IND', pincode: '560038' },
            ],
          },
        ],
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
  },
];

export const CATAN: AdminCategoryValue = {
  super_id: 'sup-1',
  super_name: 'Social',
  category_id: 'cat-1',
  category_name: 'Board Games',
  sub_id: 'sub-1',
  sub_name: 'Catan Night',
};

export const CHESS: AdminCategoryValue = { ...CATAN, sub_id: 'sub-2', sub_name: 'Chess' };

/** Super and Category picked, Sub still to choose. */
export const HALF_PICKED: AdminCategoryValue = { ...CATAN, sub_id: '', sub_name: '' };

/** The option catalogues as `venueRegistrationConfig` serves them. */
export const registrationConfig = (
  over: Partial<VenueRegistrationConfig> = {},
): VenueRegistrationConfig => ({
  venue_types: ['Cafe', 'Turf'],
  doc_types: ['GST Certificate', 'PAN Card'],
  capacity_item_limit: 3,
  category_limit: 5,
  amenities: ['Wi-Fi', 'AC'],
  facilities: ['Parking'],
  security: ['CCTV'],
  food_diets: ['VEG', 'NON_VEG'],
  food_spice_levels: ['NONE', 'MILD'],
  food_menu_limit: 20,
  food_image_limit: 3,
  food_price_max: 5000,
  food_discount_max_pct: 90,
  food_video_limit: 2,
  food_table_limit: 50,
  venue_video_limit: 3,
  ...over,
});
