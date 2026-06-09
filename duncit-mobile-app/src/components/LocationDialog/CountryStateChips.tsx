import { useMemo, useState } from 'react';
import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, ScrollView, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { countryFlagUrl, type CountryNode } from '@/utils/location-tree';

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
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
  flag?: string;
}) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-selected={active}
      onPress={onPress}
      alignItems="center"
      gap={6}
      height={36}
      paddingHorizontal={12}
      borderRadius={999}
      borderColor={active ? '$primary' : '$borderColor'}
      borderWidth={active ? 1.5 : 1}
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.8 }}
    >
      {flag ? (
        <Image source={{ uri: flag }} style={{ width: 22, height: 16, borderRadius: 2 }} />
      ) : null}
      <Text fontSize={13} fontWeight="800" color={active ? '$primary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

export function CountryStateChips({ tree, country, state, onCountry, onState }: Props) {
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
    <YStack gap={8}>
      <Text fontSize={11} fontWeight="900" color="$muted" letterSpacing={0.6}>
        COUNTRY
      </Text>
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

      <Text fontSize={11} fontWeight="900" color="$muted" letterSpacing={0.6}>
        STATE
      </Text>
      {showStateSearch ? (
        <XStack
          alignItems="center"
          gap={6}
          height={38}
          paddingHorizontal={10}
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
        >
          <MaterialIcons name="search" size={16} color={muted} />
          <Input
            testID="state-search"
            flex={1}
            unstyled
            value={query}
            onChangeText={setQuery}
            placeholder="Search state"
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
  );
}
