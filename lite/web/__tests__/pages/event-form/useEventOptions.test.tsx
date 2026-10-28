import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LITE_MY_CALENDARS } from '../../../graphql/calendars';
import { LITE_CATEGORIES, LITE_CITIES } from '../../../graphql/discover';
import { useEventOptions } from '../../../pages/event-form/useEventOptions';
import { calendarFixture, categoryFixture, cityFixture, meFixture, renderHookWithProviders } from '../../test-utils';

describe('useEventOptions', () => {
  it('turns cities, categories and the host’s calendars into select options', async () => {
    const { result } = renderHookWithProviders(() => useEventOptions(), {
      me: meFixture(),
      mocks: [
        { request: { query: LITE_CITIES }, result: { data: { liteCities: [cityFixture(), cityFixture({ id: 'city-2', name: 'Mumbai', slug: 'mumbai' })] } } },
        { request: { query: LITE_CATEGORIES }, result: { data: { liteCategories: [categoryFixture({ id: 'cat-7', name: 'Food & drink', slug: 'food' })] } } },
        { request: { query: LITE_MY_CALENDARS }, result: { data: { liteMyCalendars: [calendarFixture({ id: 'cal-3', name: 'Supper Club' })] } } },
      ],
    });

    expect(result.current).toEqual({ cities: [], categories: [], calendars: [] });
    await waitFor(() => expect(result.current.calendars).toHaveLength(1));
    expect(result.current).toEqual({
      cities: [
        { value: 'delhi', label: 'Delhi' },
        { value: 'mumbai', label: 'Mumbai' },
      ],
      categories: [{ value: 'cat-7', label: 'Food & drink' }],
      calendars: [{ value: 'cal-3', label: 'Supper Club' }],
    });
  });

  it('leaves a list empty when its read fails, without holding back the others', async () => {
    const { result } = renderHookWithProviders(() => useEventOptions(), {
      mocks: [
        { request: { query: LITE_CITIES }, error: new Error('cities unavailable') },
        { request: { query: LITE_CATEGORIES }, result: { data: { liteCategories: [categoryFixture()] } } },
        { request: { query: LITE_MY_CALENDARS }, result: { errors: [{ message: 'Sign in to see your calendars' }] } },
      ],
    });
    await waitFor(() => expect(result.current.categories).toEqual([{ value: 'cat-1', label: 'Music' }]));
    expect(result.current.cities).toEqual([]);
    expect(result.current.calendars).toEqual([]);
  });
});
