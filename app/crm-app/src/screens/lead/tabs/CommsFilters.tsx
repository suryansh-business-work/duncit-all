import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack, YStack, useTheme } from 'tamagui';
import type { CrmCommsFilter } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  filter: CrmCommsFilter;
  onFilter: (next: CrmCommsFilter) => void;
  /** All logs matching the search (the server's total), and the loaded emails and calls. */
  total: number;
  counts: { EMAIL: number; CALL: number };
  search: string;
  onSearch: (text: string) => void;
}

/** All / Email / Call with their counts, and the search over calls and emails — the portal log's toolbar. */
export function CommsFilters({
  filter,
  onFilter,
  total,
  counts,
  search,
  onSearch,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const chips: { value: CrmCommsFilter; label: string }[] = [
    { value: 'ALL', label: t('crm.comms.filterAll', { vars: { count: total } }) },
    { value: 'EMAIL', label: t('crm.comms.filterEmail', { vars: { count: counts.EMAIL } }) },
    { value: 'CALL', label: t('crm.comms.filterCall', { vars: { count: counts.CALL } }) },
  ];
  return (
    <YStack gap="$2">
      <XStack gap="$2" flexWrap="wrap" role="radiogroup">
        {chips.map((chip) => (
          <DuncitButton
            key={chip.value}
            label={chip.label}
            onPress={() => onFilter(chip.value)}
            variant={filter === chip.value ? 'solid' : 'outline'}
            size="sm"
            testID={`crm-comms-filter-${chip.value.toLowerCase()}`}
          />
        ))}
      </XStack>
      <XStack
        alignItems="center"
        gap="$2"
        borderWidth={1}
        borderColor="$inputBorder"
        borderRadius={RADII.sm}
        paddingLeft="$3"
      >
        <MaterialIcons
          name="search"
          size={20}
          color={theme.muted?.val}
          accessibilityElementsHidden
        />
        <Input
          flex={1}
          value={search}
          onChangeText={onSearch}
          placeholder={t('crm.call.searchLogs')}
          placeholderTextColor="$muted"
          aria-label={t('crm.call.searchLogs')}
          borderWidth={0}
          backgroundColor="transparent"
          testID="crm-comms-search"
        />
      </XStack>
    </YStack>
  );
}
