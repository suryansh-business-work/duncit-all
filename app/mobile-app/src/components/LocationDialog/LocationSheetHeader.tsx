import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { HeaderRoundButton } from '@/components/AppHeader/HeaderRoundButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  title: string;
  onClose: () => void;
  onDetect: () => void;
  busy: boolean;
  detected: string;
  error: string;
}

/** The location sheet's fixed top: the title with a round close, then the
 * tonal "Use my location" pill and what it found. mWeb twin: the title of
 * app-header/LocationDialog + app-header/GpsLocationPicker. */
export function LocationSheetHeader({
  title,
  onClose,
  onDetect,
  busy,
  detected,
  error,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color, primary } = useThemeColors();

  return (
    <YStack paddingHorizontal={16} paddingTop={16} gap={12}>
      <XStack alignItems="center" justifyContent="space-between" gap={12}>
        <Text flex={1} fontSize={20} fontWeight="600" color="$color" numberOfLines={1}>
          {title}
        </Text>
        <HeaderRoundButton testID="location-close" label={t('mweb.common.close')} onPress={onClose}>
          <MaterialIcons name="close" size={20} color={color} />
        </HeaderRoundButton>
      </XStack>
      <XStack
        testID="location-gps"
        role="button"
        aria-label={t('mweb.location.useMyLocation')}
        onPress={onDetect}
        alignItems="center"
        justifyContent="center"
        gap={8}
        height={48}
        borderRadius={999}
        backgroundColor="$primarySoft"
        pressStyle={PRESS_STYLE.control}
      >
        {busy ? (
          <Spinner color="$primary" />
        ) : (
          <MaterialIcons name="my-location" size={18} color={primary} />
        )}
        <Text fontSize={14} fontWeight="600" color="$primary">
          {busy ? 'Locating…' : 'Use my location'}
        </Text>
      </XStack>
      {detected ? (
        <Text fontSize={12} color="$muted">
          Detected: {detected}
        </Text>
      ) : null}
      {error ? (
        <Text testID="location-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
