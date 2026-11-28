import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { SelectChip } from '@/components/mobile/SelectChip';
import {
  SERVICE_SORT_FIELDS,
  nextServiceSort,
  type ServiceSort,
} from '@/features/services-offered/serviceOffered';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  sort: ServiceSort;
  onChange: (next: ServiceSort) => void;
}

/**
 * The table's sortable column headings as chips: tap one to sort by it, tap
 * the sorted one again to flip its direction (shown by its arrow).
 */
export function ServiceSortBar({ sort, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const label = t('crmApp.servicesOffered.sortBy');
  return (
    <YStack gap="$2">
      <Text color="$muted" fontSize="$2" fontWeight="600">
        {label}
      </Text>
      <XStack flexWrap="wrap" gap="$2" role="group" aria-label={label}>
        {SERVICE_SORT_FIELDS.map(({ field, labelKey }) => {
          const name = t(labelKey);
          const active = sort.by === field;
          const ascending = sort.dir === 'asc';
          let a11y = name;
          if (active) {
            a11y = ascending
              ? t('crmApp.servicesOffered.sortedAscending', { vars: { field: name } })
              : t('crmApp.servicesOffered.sortedDescending', { vars: { field: name } });
          }
          return (
            <SelectChip
              key={field}
              label={name}
              accessibilityLabel={a11y}
              onPress={() => onChange(nextServiceSort(sort, field))}
              selected={active}
              icon={
                active ? (
                  <MaterialIcons
                    name={ascending ? 'arrow-upward' : 'arrow-downward'}
                    size={16}
                    color={theme.onPrimary?.val}
                  />
                ) : undefined
              }
              testID={`service-sort-${field}`}
            />
          );
        })}
      </XStack>
    </YStack>
  );
}
