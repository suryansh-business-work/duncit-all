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
import { LocationPickerField } from '@/components/LocationPickerField/LocationPickerField';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTranslation } from '@/hooks/useTranslation';

const ALL = '';

interface Props {
  categories: readonly GigCategory[];
  value: GigJobFilter;
  onChange: (next: GigJobFilter) => void;
}

/**
 * Search, city and category. The search settles before it queries; the city
 * is a pick from the admin Location list (the viewer's selected city until
 * they change it). mWeb twin: GigFilters.
 */
export function GigFilters({ categories, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState(value.search ?? '');
  const settledSearch = useDebouncedValue(search, GIG_FILTER_SETTLE_MS);

  useEffect(() => {
    const next = settledGigFilter(value, settledSearch);
    if (next) onChange(next);
  }, [settledSearch, value, onChange]);

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
      <LocationPickerField
        testID="gig-filter"
        locationId={value.location_id ?? ''}
        locality=""
        onChange={(locationId) => onChange({ ...value, location_id: locationId || null })}
        copy={{
          label: t('gigJobs.board.city'),
          placeholder: t('gigJobs.board.allCities'),
          change: t('gigJobs.form.changeCity'),
          cityAria: (city) => t('gigJobs.form.cityAria', { vars: { city } }),
          clear: t('gigJobs.board.allCities'),
        }}
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
