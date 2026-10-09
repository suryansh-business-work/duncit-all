import { ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack, YStack } from 'tamagui';
import { ALL_FULFILMENT_STATUSES, statusLabel } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { ChoiceChip } from './ChoiceChip';

interface Props {
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (status: string) => void;
}

/** The order search and the status chips — "All", then every status in the
 * seller's working order. RN twin of mWeb's BrandOrdersFilters. */
export function BrandOrdersFilters({ search, status, onSearch, onStatus }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  return (
    <YStack gap={12}>
      <XStack
        alignItems="center"
        gap={8}
        borderWidth={1}
        borderColor="$inputBorder"
        borderRadius={12}
        paddingHorizontal={12}
      >
        <MaterialIcons name="search" size={18} color={muted} />
        <Input
          testID="brand-orders-search"
          flex={1}
          borderWidth={0}
          backgroundColor="transparent"
          value={search}
          onChangeText={onSearch}
          placeholder={t('mweb.brandOrders.searchLabel')}
          aria-label={t('mweb.brandOrders.searchLabel')}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </XStack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        aria-label={t('mweb.brandOrders.statusFilterLabel')}
      >
        <XStack gap={8}>
          <ChoiceChip
            testID="brand-orders-status-all"
            label={t('mweb.brandOrders.statusAll')}
            active={!status}
            onPress={() => onStatus('')}
          />
          {ALL_FULFILMENT_STATUSES.map((value) => (
            <ChoiceChip
              key={value}
              testID={`brand-orders-status-${value}`}
              label={statusLabel(value, t)}
              active={status === value}
              onPress={() => onStatus(value)}
            />
          ))}
        </XStack>
      </ScrollView>
    </YStack>
  );
}
