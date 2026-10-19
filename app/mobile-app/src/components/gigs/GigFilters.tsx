import { useEffect, useState } from 'react';
import { Input, YStack } from 'tamagui';
import {
  GIG_FILTER_SETTLE_MS,
  settledGigFilter,
  type GigCategory,
  type GigJobFilter,
} from '@duncit/utils';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { FIELD_HEIGHT, FIELD_RADIUS } from '@/components/Field';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTranslation } from '@/hooks/useTranslation';

const ALL = '';

interface Props {
  categories: readonly GigCategory[];
  value: GigJobFilter;
  onChange: (next: GigJobFilter) => void;
}

/** Search, city and category. Typed boxes settle before they query. mWeb twin: GigFilters. */
export function GigFilters({ categories, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState(value.search ?? '');
  const [city, setCity] = useState(value.city ?? '');
  const settledSearch = useDebouncedValue(search, GIG_FILTER_SETTLE_MS);
  const settledCity = useDebouncedValue(city, GIG_FILTER_SETTLE_MS);

  useEffect(() => {
    const next = settledGigFilter(value, settledSearch, settledCity);
    if (next) onChange(next);
  }, [settledSearch, settledCity, value, onChange]);

  const options = [
    { value: ALL, label: t('gigJobs.board.allCategories') },
    ...categories.map((category) => ({ value: category.id, label: category.title })),
  ];

  return (
    <YStack gap={10}>
      <Input
        testID="gig-filter-search"
        value={search}
        onChangeText={setSearch}
        placeholder={t('gigJobs.board.search')}
        aria-label={t('gigJobs.board.search')}
        height={FIELD_HEIGHT}
        borderRadius={FIELD_RADIUS}
      />
      <Input
        testID="gig-filter-city"
        value={city}
        onChangeText={setCity}
        placeholder={t('gigJobs.board.city')}
        aria-label={t('gigJobs.board.city')}
        height={FIELD_HEIGHT}
        borderRadius={FIELD_RADIUS}
      />
      <ChipSelectField
        testID="gig-filter-category"
        label={t('gigJobs.board.category')}
        options={options}
        value={value.category_id ?? ALL}
        onChange={(next) => onChange({ ...value, category_id: next || null })}
      />
    </YStack>
  );
}
