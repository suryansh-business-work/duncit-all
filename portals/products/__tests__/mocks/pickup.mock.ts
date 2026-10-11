import type { MockedResponse } from '@apollo/client/testing';
import type { BrandPickupLocation } from '@duncit/gql-types';
import {
  BRAND_PICKUP_LOCATIONS,
  DELETE_BRAND_PICKUP_LOCATION,
  REGISTER_BRAND_PICKUP_WITH_SHIPROCKET,
  SAVE_BRAND_PICKUP_LOCATION,
  SET_BRAND_PICKUP_LOCATION_ACTIVE,
  SET_DEFAULT_BRAND_PICKUP_LOCATION,
} from '../../src/pages/ecomm/queries';

/** Fully-typed `BrandPickupLocation`; the pickup-locations query selects a subset. */
export const makeBrandPickupLocation = (
  over: Partial<BrandPickupLocation> = {},
): BrandPickupLocation => ({
  __typename: 'BrandPickupLocation',
  id: 'l1',
  owner_kind: 'BRAND',
  brand_id: 'b1',
  nickname: 'Main WH',
  contact_name: 'Asha',
  phone: '9999',
  email: 'wh@acme.com',
  address_line1: '12 MG Rd',
  address_line2: '',
  city: 'Pune',
  state: 'MH',
  pincode: '411001',
  country: 'India',
  is_default: false,
  is_active: true,
  review_status: 'APPROVED',
  shiprocket_registered: false,
  shiprocket_pickup_id: '',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

export const brandPickupLocationsMock = (
  locations: BrandPickupLocation[] = [],
  over: { error?: boolean } = {},
): MockedResponse => ({
  request: { query: BRAND_PICKUP_LOCATIONS, variables: () => true },
  result: over.error
    ? { errors: [{ message: 'load failed' }] }
    : { data: { brandPickupLocations: locations } },
  maxUsageCount: 20,
});

export const saveBrandPickupMock = (id = 'l1'): MockedResponse => ({
  request: { query: SAVE_BRAND_PICKUP_LOCATION, variables: () => true },
  result: { data: { saveBrandPickupLocation: { __typename: 'BrandPickupLocation', id } } },
  maxUsageCount: 20,
});

export const deleteBrandPickupMock = (over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: DELETE_BRAND_PICKUP_LOCATION, variables: () => true },
  result: over.fail
    ? { errors: [{ message: 'delete failed' }] }
    : { data: { deleteBrandPickupLocation: true } },
  maxUsageCount: 20,
});

export const registerBrandPickupMock = (id = 'l1'): MockedResponse => ({
  request: { query: REGISTER_BRAND_PICKUP_WITH_SHIPROCKET, variables: () => true },
  result: {
    data: {
      registerBrandPickupWithShiprocket: {
        __typename: 'BrandPickupLocation',
        id,
        shiprocket_registered: true,
        shiprocket_pickup_id: 'SR-1',
      },
    },
  },
  maxUsageCount: 20,
});

export const setDefaultBrandPickupMock = (id = 'l1'): MockedResponse => ({
  request: { query: SET_DEFAULT_BRAND_PICKUP_LOCATION, variables: () => true },
  result: {
    data: {
      setDefaultBrandPickupLocation: {
        __typename: 'BrandPickupLocation',
        id,
        is_default: true,
      },
    },
  },
  maxUsageCount: 20,
});

/** Answers the Active switch for exactly this id and direction; `refusal` is the server's reason for turning it down. */
export const setBrandPickupActiveMock = (active: boolean, over: { id?: string; refusal?: string } = {}): MockedResponse => {
  const id = over.id ?? 'l1';
  return {
    request: { query: SET_BRAND_PICKUP_LOCATION_ACTIVE, variables: { id, active } },
    result: over.refusal
      ? { errors: [{ message: over.refusal }] }
      : { data: { setBrandPickupLocationActive: { __typename: 'BrandPickupLocation', id, is_active: active } } },
  };
};
