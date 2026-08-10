import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  POD_PRODUCT_SORTS,
  podProductActiveFilterCount,
  type PodProductCriteria,
  type PodProductSort,
} from '@duncit/utils';

interface Props {
  criteria: PodProductCriteria;
  onChange: (next: PodProductCriteria) => void;
  onClear: () => void;
  brands: string[];
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}

/** A single filter chip. Hoisted to module scope (S6478). */
function FilterChip({ label, active, onPress, testID }: Readonly<ChipProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={active}
      onPress={onPress}
      paddingHorizontal={11}
      paddingVertical={6}
      borderRadius={999}
      borderWidth={1}
      borderColor={active ? '$primary' : '$borderColor'}
      backgroundColor={active ? '$primary' : 'transparent'}
      pressStyle={{ opacity: 0.8 }}
    >
      <Text fontSize={12} fontWeight="600" color={active ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

/** Search + brand + stock + sort for the native picker. The category cascade is
 * NOT here: the catalogue is already narrowed to the pod's Super → Category →
 * Sub, so a category filter over it could only ever empty the list. mWeb twin. */
export function ProductPickerFilters({ criteria, onChange, onClear, brands }: Readonly<Props>) {
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  const activeCount = podProductActiveFilterCount(criteria);
  const patch = (next: Partial<PodProductCriteria>) => onChange({ ...criteria, ...next });

  return (
    <YStack gap={10}>
      <XStack
        alignItems="center"
        gap={8}
        paddingHorizontal={12}
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
      >
        <MaterialIcons name="search" size={18} color={muted} />
        <Input
          testID="product-search"
          flex={1}
          value={criteria.search}
          onChangeText={(search) => patch({ search })}
          placeholder={t('podProduct.searchPlaceholder')}
          borderWidth={0}
          backgroundColor="transparent"
          fontSize={14}
        />
      </XStack>

      {brands.length > 0 ? (
        <XStack gap={6} flexWrap="wrap">
          <FilterChip
            testID="product-brand-all"
            label={t('podProduct.allBrands')}
            active={criteria.brand === ''}
            onPress={() => patch({ brand: '' })}
          />
          {brands.map((brand) => (
            <FilterChip
              key={brand}
              testID={`product-brand-${brand}`}
              label={brand}
              active={criteria.brand === brand}
              onPress={() => patch({ brand })}
            />
          ))}
        </XStack>
      ) : null}

      <XStack gap={6} flexWrap="wrap">
        {POD_PRODUCT_SORTS.map((option) => (
          <FilterChip
            key={option.value}
            testID={`product-sort-${option.value}`}
            label={t(option.labelKey)}
            active={criteria.sort === option.value}
            onPress={() => patch({ sort: option.value as PodProductSort })}
          />
        ))}
      </XStack>

      <XStack alignItems="center" gap={10} flexWrap="wrap">
        <XStack
          testID="product-in-stock"
          role="button"
          aria-label={t('podProduct.inStockOnly')}
          aria-pressed={criteria.inStockOnly}
          onPress={() => patch({ inStockOnly: !criteria.inStockOnly })}
          alignItems="center"
          gap={6}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons
            name={criteria.inStockOnly ? 'check-box' : 'check-box-outline-blank'}
            size={20}
            color={muted}
          />
          <Text fontSize={13} color="$color">
            {t('podProduct.inStockOnly')}
          </Text>
        </XStack>
        <XStack flex={1} />
        {activeCount > 0 ? (
          <XStack
            testID="product-clear-filters"
            role="button"
            aria-label={t('podProduct.clearFilters')}
            onPress={onClear}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text fontSize={12.5} fontWeight="700" color="$primary">
              {t('podProduct.clearFilters')}
            </Text>
          </XStack>
        ) : null}
      </XStack>
    </YStack>
  );
}
