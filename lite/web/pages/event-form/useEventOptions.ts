import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import type { SelectOption } from '../../components/RhfSelect';
import { LITE_MY_CALENDARS } from '../../graphql/calendars';
import { LITE_CATEGORIES, LITE_CITIES } from '../../graphql/discover';

export interface EventOptions {
  cities: SelectOption[];
  categories: SelectOption[];
  calendars: SelectOption[];
}

/** The lists the form's selects are built from: cities, categories and the host's own calendars. */
export function useEventOptions(): EventOptions {
  const { data: cityData } = useQuery(LITE_CITIES);
  const { data: categoryData } = useQuery(LITE_CATEGORIES);
  const { data: calendarData } = useQuery(LITE_MY_CALENDARS);
  return useMemo(
    () => ({
      cities: (cityData?.liteCities ?? []).map((city) => ({ value: city.slug, label: city.name })),
      categories: (categoryData?.liteCategories ?? []).map((category) => ({ value: category.id, label: category.name })),
      calendars: (calendarData?.liteMyCalendars ?? []).map((calendar) => ({ value: calendar.id, label: calendar.name })),
    }),
    [cityData, categoryData, calendarData],
  );
}
