import { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, useWindowDimensions } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { RADAR_RINGS, radarPositions } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import type { ContactRow, ContactsViewer } from '@/hooks/useContacts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

const FACE = 44;
const SWEEP_MS = 6000;

/** One face on the radar: the photo, or the initial on the brand colour. A
 * nearby face wears the brand ring; the others the page background. */
function RadarFace({
  photo,
  initial,
  nearby,
  ring,
}: Readonly<{ photo?: string | null; initial: string; nearby: boolean; ring: string }>) {
  if (photo) {
    return (
      <AppImage
        source={{ uri: photo }}
        style={{
          width: FACE,
          height: FACE,
          borderRadius: FACE / 2,
          borderWidth: 2,
          borderColor: ring,
        }}
      />
    );
  }
  return (
    <YStack
      width={FACE}
      height={FACE}
      borderRadius={FACE / 2}
      backgroundColor="$primary"
      alignItems="center"
      justifyContent="center"
      borderWidth={2}
      borderColor={nearby ? '$primary' : '$background'}
    >
      <Text fontSize={16} fontWeight="700" color="$onPrimary">
        {initial}
      </Text>
    </YStack>
  );
}

/**
 * The radar: the viewer in the middle, every matched contact on a ring around
 * them — the ones in the same city on the inner rings — and a slow sweep. Each
 * face opens that person's profile. Memoised: it sits in the list header,
 * which redraws on every keystroke in the search box. Twin of mWeb's
 * `ContactsRadar` (rule 27); the ring maths is `radarPositions` in
 * @duncit/utils, shared by both.
 */
export const ContactsRadar = memo(function ContactsRadar({
  contacts,
  viewer,
  onOpen,
}: Readonly<{ contacts: ContactRow[]; viewer: ContactsViewer; onOpen: (userId: string) => void }>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { primary, background } = useThemeColors();
  const size = Math.min(width - 32, 360);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SWEEP_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const points = useMemo(
    () =>
      radarPositions(contacts.map((row) => ({ id: row.profile.user_id, nearby: row.is_nearby }))),
    [contacts],
  );
  const plotted = contacts.filter((row) => points.has(row.profile.user_id));
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const viewerName = viewer.full_name || viewer.first_name || '';

  return (
    <YStack
      testID="contacts-radar"
      role="img"
      aria-label={t('mweb.contacts.radarLabel')}
      alignSelf="center"
      width={size}
      height={size}
      borderRadius={size / 2}
      overflow="hidden"
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
    >
      {RADAR_RINGS.map((ring) => (
        <YStack
          key={ring}
          position="absolute"
          left={(size * (1 - ring)) / 2}
          top={(size * (1 - ring)) / 2}
          width={size * ring}
          height={size * ring}
          borderRadius={(size * ring) / 2}
          borderWidth={1}
          borderStyle="dashed"
          borderColor="$borderColor"
          pointerEvents="none"
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: size, height: size, transform: [{ rotate }] }}
      >
        <YStack
          position="absolute"
          left={size / 2}
          top={0}
          width={size / 2}
          height={size / 2}
          borderTopRightRadius={size / 2}
          backgroundColor={primary}
          opacity={0.16}
        />
      </Animated.View>

      <YStack
        position="absolute"
        left={size / 2 - (FACE + 8) / 2}
        top={size / 2 - (FACE + 8) / 2 - 8}
        alignItems="center"
      >
        <YStack
          borderRadius={(FACE + 8) / 2}
          borderWidth={3}
          borderColor="$primary"
          overflow="hidden"
        >
          <RadarFace
            photo={viewer.profile_photo}
            initial={(viewerName[0] ?? '?').toUpperCase()}
            nearby={false}
            ring={background}
          />
        </YStack>
        <Text fontSize={11} fontWeight="700" color="$color">
          {t('mweb.contacts.you')}
        </Text>
      </YStack>

      {plotted.map((row) => {
        const point = points.get(row.profile.user_id)!;
        const name = row.profile.full_name || row.profile.first_name || row.contact_label;
        return (
          <XStack
            key={row.profile.user_id}
            testID={`contacts-radar-${row.profile.user_id}`}
            role="button"
            aria-label={t('mweb.podDetails.openProfileOf', { vars: { name } })}
            onPress={() => onOpen(row.profile.user_id)}
            position="absolute"
            left={point.x * size - FACE / 2}
            top={point.y * size - FACE / 2}
            pressStyle={PRESS_STYLE.control}
          >
            <RadarFace
              photo={row.profile.profile_photo}
              initial={(name[0] ?? '?').toUpperCase()}
              nearby={row.is_nearby}
              ring={row.is_nearby ? primary : background}
            />
          </XStack>
        );
      })}
    </YStack>
  );
});
