/**
 * The Discover read (`liteDiscover`) as the API answers it, shared by the
 * Discover and landing page tests. Every band defaults to empty, so a test
 * names exactly the bands it is about.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { LITE_DISCOVER, type LiteDiscover } from '../../../graphql/discover';
import { typed } from '../../test-utils';

export const discoverFixture = (over: Partial<LiteDiscover> = {}): LiteDiscover =>
  typed('LiteDiscover', {
    categories: [],
    cities: [],
    featured_calendars: [],
    popular_events: [],
    upcoming_events: [],
    featured_events: [],
    ...over,
  });

/** One answer to the Discover read for a city (null: everywhere). */
export const discoverMock = (discover: LiteDiscover, citySlug: string | null = null): MockedResponse => ({
  request: { query: LITE_DISCOVER, variables: { city_slug: citySlug } },
  result: { data: { liteDiscover: discover } },
});

/** The Discover read refused by the API with `message`. */
export const discoverErrorMock = (message: string, citySlug: string | null = null): MockedResponse => ({
  request: { query: LITE_DISCOVER, variables: { city_slug: citySlug } },
  result: { errors: [{ message }] },
});
