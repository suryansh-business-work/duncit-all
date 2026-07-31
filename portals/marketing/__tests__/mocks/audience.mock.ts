import type { MockedResponse } from '@apollo/client/testing';
import type { AudienceFilterOptions } from '@duncit/gql-types';
import { AUDIENCE_FILTER_OPTIONS } from '../../src/pages/target-audience-page/queries';
import type { AudienceRow } from '../../src/pages/target-audience-page/helpers';

/**
 * Target Audience mocks. Rows reach the (mocked) `@duncit/table` as props, so
 * they are typed against the app-level `AudienceRow` projection; the filter
 * options flow through `MockedProvider` and are typed against the generated
 * `AudienceFilterOptions` with `__typename`, matching production.
 */
export const makeAudienceRow = (over: Partial<AudienceRow> = {}): AudienceRow => ({
  id: 'u1',
  full_name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  age: 29,
  city: 'Pune',
  state: 'Maharashtra',
  zone: 'Kothrud',
  pincode: '411038',
  country: 'India',
  locale: 'en-IN',
  status: 'ACTIVE',
  roles: ['USER', 'HOST'],
  email_verified: true,
  phone_verified: true,
  whatsapp_reachable: true,
  push_platforms: ['ANDROID'],
  last_login_provider: 'GOOGLE',
  last_login_at: '2026-05-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

/** Everything nullable actually null — the Google-signup shape. */
export const makeSparseAudienceRow = (): AudienceRow =>
  makeAudienceRow({
    id: 'u2',
    full_name: '',
    email: null,
    phone: null,
    age: null,
    city: null,
    state: null,
    zone: null,
    pincode: null,
    country: null,
    locale: null,
    status: null,
    roles: [],
    email_verified: false,
    phone_verified: false,
    whatsapp_reachable: false,
    push_platforms: [],
    last_login_provider: null,
    last_login_at: null,
    created_at: null,
  });

const filterOptions: AudienceFilterOptions = {
  __typename: 'AudienceFilterOptions',
  interests: [{ __typename: 'AudienceInterestOption', id: 'c1', name: 'Live Music' }],
  roles: ['HOST', 'USER'],
};

export const audienceFilterOptionsMock: MockedResponse = {
  request: { query: AUDIENCE_FILTER_OPTIONS },
  result: { data: { audienceFilterOptions: filterOptions } },
};

/** The first-paint state: no options resolved yet. */
export const audienceFilterOptionsEmptyMock: MockedResponse = {
  request: { query: AUDIENCE_FILTER_OPTIONS },
  result: {
    data: {
      audienceFilterOptions: {
        __typename: 'AudienceFilterOptions',
        interests: [],
        roles: [],
      },
    },
  },
};
