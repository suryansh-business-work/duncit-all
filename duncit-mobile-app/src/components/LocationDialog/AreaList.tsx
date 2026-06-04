import { useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Zone {
  zone_name: string;
  pincode?: string | null;
}

interface Props {
  locationName: string;
  zones: Zone[];
  draftZone: string;
  onZone: (zone: string) => void;
}

function Row({
  testID,
  label,
  sub,
  active,
  onPress,
  icon,
}: {
  testID: string;
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
  icon: keyof typeof MaterialIcons.glyphMap;
}) {
  const { primary, muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-selected={active}
      onPress={onPress}
      alignItems="center"
      gap={10}
      padding={10}
      borderRadius={12}
      borderWidth={active ? 1.5 : 1}
      borderColor={active ? '$primary' : '$borderColor'}
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name={icon} size={18} color={active ? primary : muted} />
      <YStack flex={1}>
        <Text fontSize={13.5} fontWeight="700" color="$color" numberOfLines={1}>
          {label}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {sub}
        </Text>
      </YStack>
      {active ? <MaterialIcons name="check-circle" size={18} color={primary} /> : null}
    </XStack>
  );
}

export function AreaList({ locationName, zones, draftZone, onZone }: Props) {
  const { muted } = useThemeColors();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return zones;
    return zones.filter((z) =>
      [z.zone_name, z.pincode].some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [query, zones]);

  return (
    <YStack gap={8}>
      <Text fontSize={11} fontWeight="900" color="$muted" letterSpacing={0.6}>
        AREA IN {locationName.toUpperCase()}
      </Text>
      {zones.length === 0 ? (
        <Text fontSize={13} color="$muted">
          This city has no areas configured.
        </Text>
      ) : (
        <>
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
              testID="area-search"
              flex={1}
              unstyled
              value={query}
              onChangeText={setQuery}
              placeholder="Search area or PIN code"
              placeholderTextColor="$muted"
              fontSize={13}
              color="$color"
            />
          </XStack>
          <Row
            testID="area-all"
            label="All areas"
            sub={`${zones.length} localities`}
            active={!draftZone}
            onPress={() => onZone('')}
            icon="layers"
          />
          {filtered.map((z) => (
            <Row
              key={z.zone_name}
              testID={`area-${z.zone_name}`}
              label={z.zone_name}
              sub={z.pincode ? `PIN ${z.pincode}` : 'Locality'}
              active={draftZone === z.zone_name}
              onPress={() => onZone(z.zone_name)}
              icon="place"
            />
          ))}
          {filtered.length === 0 ? (
            <Text fontSize={13} color="$muted">
              No matching areas.
            </Text>
          ) : null}
        </>
      )}
    </YStack>
  );
}
