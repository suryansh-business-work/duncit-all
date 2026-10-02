import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface DeviceAddTileProps {
  busy: boolean;
  atLimit: boolean;
  label: string;
  hint: string;
  primary: string;
  muted: string;
  onPickDevice: () => void;
}

/** The phone tab: one dashed tile that hands off to the OS gallery. */
export function DeviceAddTile({
  busy,
  atLimit,
  label,
  hint,
  primary,
  muted,
  onPickDevice,
}: Readonly<DeviceAddTileProps>) {
  const { t } = useTranslation();
  return (
    <YStack
      testID="cover-device-add"
      tabIndex={0}
      role="button"
      aria-label={label}
      aria-disabled={busy || atLimit}
      onPress={busy || atLimit ? undefined : onPickDevice}
      alignItems="center"
      justifyContent="center"
      gap={8}
      paddingVertical={28}
      borderRadius={16}
      borderWidth={2}
      borderColor="$borderColor"
      borderStyle="dashed"
      backgroundColor="$soft"
      opacity={busy || atLimit ? 0.6 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name="add-photo-alternate" size={26} color={primary} />
      <Text fontSize={14} fontWeight="600" color="$color">
        {atLimit ? t('mweb.createPod.mediaAtMaximum') : label}
      </Text>
      <Text fontSize={12} color={muted}>
        {atLimit ? t('mweb.createPod.removeOneToAdd') : hint}
      </Text>
    </YStack>
  );
}
