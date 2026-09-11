import { useMemo, useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Input, ScrollView, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { countryFlagUrl, type CountryNode } from '@/utils/location-tree';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { SectionLabel } from './SectionLabel';

interface Props {
  tree: CountryNode[];
  country: string;
  state: string;
  onCountry: (country: string) => void;
  onState: (state: string) => void;
}

function Chip({
  label,
  active,
  onPress,
  testID,
  flag,
}: Readonly<{
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
  flag?: string;
}>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={active}
      onPress={onPress}
      alignItems="center"
      gap={6}
      height={36}
      paddingHorizontal={14}
      borderRadius={999}
      borderWidth={1}
      borderColor={active ? '$primary' : '$cardBorder'}
      backgroundColor={active ? '$primary' : '$surface'}
      pressStyle={PRESS_STYLE.control}
    >
      {flag ? (
        <AppImage source={{ uri: flag }} style={{ width: 22, height: 16, borderRadius: 4 }} />
      ) : null}
      <Text fontSize={13} fontWeight="600" color={active ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

export function CountryStateChips({ tree, country, state, onCountry, onState }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const [query, setQuery] = useState('');
  const activeCountry = tree.find((c) => c.country === country) ?? tree[0];
  const states = useMemo(() => {
    const term = query.trim().toLowerCase();
    const all = activeCountry?.states ?? [];
    return term ? all.filter((s) => s.state.toLowerCase().includes(term)) : all;
  }, [activeCountry, query]);

  if (tree.length === 0) return null;
  // `activeCountry` is guaranteed here (tree is non-empty), so the `?? 0` is a
  // TS-narrowing fallback that can't be hit at runtime.
  /* istanbul ignore next */
  const showStateSearch = (activeCountry?.states.length ?? 0) > 6;

  return (
    <YStack gap={16}>
      <YStack gap={8}>
        <SectionLabel>COUNTRY</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap={8} paddingRight={8}>
            {tree.map((c) => (
              <Chip
                key={c.country}
                testID={`country-${c.country_code || c.country}`}
                label={c.country}
                flag={countryFlagUrl(c.country_code)}
                active={c.country === activeCountry?.country}
                onPress={() => onCountry(c.country)}
              />
            ))}
          </XStack>
        </ScrollView>
      </YStack>

      <YStack gap={8}>
        <SectionLabel>STATE</SectionLabel>
        {showStateSearch ? (
          <XStack
            alignItems="center"
            gap={8}
            height={44}
            paddingHorizontal={14}
            borderRadius={999}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
          >
            <MaterialIcons name="search" size={18} color={muted} />
            <Input
              testID="state-search"
              aria-label={t('mweb.common.searchState')}
              flex={1}
              unstyled
              value={query}
              onChangeText={setQuery}
              placeholder={t('mweb.common.searchState')}
              placeholderTextColor="$muted"
              fontSize={13}
              color="$color"
            />
          </XStack>
        ) : null}
        <XStack flexWrap="wrap" gap={8}>
          {states.map((s) => (
            <Chip
              key={s.state}
              testID={`state-${s.state_code || s.state}`}
              label={s.state}
              active={s.state === state}
              onPress={() => onState(s.state)}
            />
          ))}
          {states.length === 0 ? (
            <Text fontSize={13} color="$muted">
              No matching states.
            </Text>
          ) : null}
        </XStack>
      </YStack>
    </YStack>
  );
}
