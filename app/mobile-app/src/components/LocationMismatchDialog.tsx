import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import type { LocationPrompt } from '@/hooks/useLocationMismatch';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';
import type { LocationMismatch } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Which kind of screen the link opened — it changes only the opening sentence. */
export type LocationMismatchKind = 'POD' | 'CLUB' | 'VENUE';

type Props = LocationPrompt & { kind: LocationMismatchKind };

type LocationIcon = 'my-location' | 'place';

function introText(t: Translate, kind: LocationMismatchKind, found: LocationMismatch): string {
  const vars = { current: found.current, target: found.target };
  if (kind === 'POD') return t('mweb.locationMismatch.introPod', { vars });
  if (kind === 'CLUB') return t('mweb.locationMismatch.introClub', { vars });
  return t('mweb.locationMismatch.introVenue', { vars });
}

function LocationRow({
  icon,
  label,
  value,
}: Readonly<{ icon: LocationIcon; label: string; value: string }>) {
  const { primary } = useThemeColors();
  return (
    <XStack alignItems="center" gap={10}>
      <YStack
        width={36}
        height={36}
        borderRadius={10}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <MaterialIcons name={icon} size={18} color={primary} />
      </YStack>
      <YStack flex={1} minWidth={0}>
        <Text fontSize={12} color="$muted">
          {label}
        </Text>
        <Text fontSize={14} fontWeight="700" color="$color" numberOfLines={1}>
          {value}
        </Text>
      </YStack>
    </XStack>
  );
}

/**
 * Opens over a pod, club or venue that a link brought the viewer to when that
 * place is in a city other than the one their header is set to. It names both
 * places and offers the switch; "Continue" leaves the header alone. RN twin of
 * mWeb's LocationMismatchDialog (rule 27).
 */
export function LocationMismatchDialog({
  kind,
  mismatch,
  switchLocation,
  keepLocation,
}: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();
  if (!mismatch) return null;

  const keepLabel = t('mweb.locationMismatch.keepButton', {
    vars: { current: mismatch.currentCity },
  });
  const switchLabel = t('mweb.locationMismatch.switchButton', {
    vars: { target: mismatch.targetCity },
  });

  const footer = (
    <XStack gap={12}>
      <XStack
        testID="location-mismatch-keep"
        role="button"
        aria-label={keepLabel}
        onPress={keepLocation}
        flex={1}
        height={48}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
          {keepLabel}
        </Text>
      </XStack>
      <XStack
        testID="location-mismatch-switch"
        role="button"
        aria-label={switchLabel}
        onPress={switchLocation}
        flex={1}
        height={48}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        backgroundColor="$primary"
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="700" color={onPrimary} numberOfLines={1}>
          {switchLabel}
        </Text>
      </XStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open
      onClose={keepLocation}
      testID="location-mismatch-dialog"
      title={t('mweb.locationMismatch.title')}
      closeLabel={keepLabel}
      showCloseButton={false}
      footer={footer}
    >
      <YStack gap={14}>
        <Text fontSize={14} lineHeight={22} color="$color">
          {introText(t, kind, mismatch)}
        </Text>
        <LocationRow
          icon="my-location"
          label={t('mweb.locationMismatch.currentLocation')}
          value={mismatch.current}
        />
        <LocationRow
          icon="place"
          label={t('mweb.locationMismatch.linkLocation')}
          value={mismatch.target}
        />
        <Text fontSize={12.5} lineHeight={18} color="$muted">
          {t('mweb.locationMismatch.hint', { vars: { target: mismatch.targetCity } })}
        </Text>
      </YStack>
    </DuncitDialog>
  );
}
