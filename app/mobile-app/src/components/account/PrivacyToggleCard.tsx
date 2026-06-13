import { useState } from 'react';
import { Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

/** Account privacy toggle — a private profile hides posts and status from people
 * who don't follow you (Instagram-style). Name + avatar stay visible. */
export function PrivacyToggleCard({
  isPrivate,
  onChange,
}: Readonly<{ isPrivate: boolean; onChange: (next: boolean) => Promise<void> }>) {
  const { primary, color } = useThemeColors();
  const [busy, setBusy] = useState(false);

  const onValueChange = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      await onChange(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <XStack
      testID="privacy-card"
      paddingHorizontal={16}
      paddingVertical={14}
      borderRadius={18}
      alignItems="center"
      gap={12}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <MaterialIcons name="lock-outline" size={20} color={color} />
      <YStack flex={1}>
        <Text fontSize={14.5} fontWeight="900" color="$color">
          Private account
        </Text>
        <Text fontSize={12.5} fontWeight="700" color="$muted">
          When private, only followers see your posts and status.
        </Text>
      </YStack>
      <Switch
        testID="privacy-switch"
        aria-label="Toggle private account"
        value={isPrivate}
        disabled={busy}
        onValueChange={(next) => void onValueChange(next)}
        trackColor={{ true: primary }}
      />
    </XStack>
  );
}
