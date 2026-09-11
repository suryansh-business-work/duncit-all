import { useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { SectionLabel } from './SectionLabel';

interface Zone {
  zone_name: string;
  pincode?: string | null;
  active_club_count?: number | null;
}

/** Compact per-locality club count for the area rows, e.g. "3 clubs" / "No clubs yet". */
const zoneClubLabel = (count?: number | null) => {
  if (count === null || count === undefined || count <= 0) return 'No clubs yet';
  return `${count} club${count === 1 ? '' : 's'}`;
};

interface Props {
  locationName: string;
  zones: Zone[];
  draftZone: string;
  onZone: (zone: string) => void;
}

/** One row of the grouped list: a hairline above every row but the first,
 * inset 16, and a soft green wash on the chosen one. */
function Row({
  testID,
  label,
  sub,
  active,
  divided,
  onPress,
  icon,
}: Readonly<{
  testID: string;
  label: string;
  sub: string;
  active: boolean;
  divided: boolean;
  onPress: () => void;
  icon: keyof typeof MaterialIcons.glyphMap;
}>) {
  const { primary, muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={active}
      onPress={onPress}
      alignItems="center"
      gap={12}
      minHeight={56}
      paddingHorizontal={16}
      paddingVertical={10}
      backgroundColor={active ? '$primarySoft' : 'transparent'}
      pressStyle={PRESS_STYLE.row}
    >
      {divided ? (
        <YStack
          position="absolute"
          top={0}
          left={16}
          right={0}
          height={1}
          backgroundColor="$borderColor"
        />
      ) : null}
      <MaterialIcons name={icon} size={20} color={active ? primary : muted} />
      <YStack flex={1}>
        <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
          {label}
        </Text>
        <Text fontSize={12} color="$muted">
          {sub}
        </Text>
      </YStack>
      {active ? <MaterialIcons name="check-circle" size={20} color={primary} /> : null}
    </XStack>
  );
}

export function AreaList({ locationName, zones, draftZone, onZone }: Readonly<Props>) {
  const { t } = useTranslation();
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
      <SectionLabel>AREA IN {locationName.toUpperCase()}</SectionLabel>
      {zones.length === 0 ? (
        <Text fontSize={13} color="$muted">
          This city has no areas configured.
        </Text>
      ) : (
        <>
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
              testID="area-search"
              aria-label={t('mweb.location.searchAreaOrPinCode')}
              flex={1}
              unstyled
              value={query}
              onChangeText={setQuery}
              placeholder={t('mweb.location.searchAreaOrPinCode')}
              placeholderTextColor="$muted"
              fontSize={13}
              color="$color"
            />
          </XStack>
          <SurfaceCard padding={0} overflow="hidden">
            <Row
              testID="area-all"
              label={t('mweb.common.allAreas')}
              sub={`${zones.length} localities`}
              active={!draftZone}
              divided={false}
              onPress={() => onZone('')}
              icon="layers"
            />
            {filtered.map((z) => (
              <Row
                key={z.zone_name}
                testID={`area-${z.zone_name}`}
                label={z.zone_name}
                sub={[zoneClubLabel(z.active_club_count), z.pincode ? `PIN ${z.pincode}` : null]
                  .filter(Boolean)
                  .join(' · ')}
                active={draftZone === z.zone_name}
                divided
                onPress={() => onZone(z.zone_name)}
                icon="place"
              />
            ))}
          </SurfaceCard>
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
