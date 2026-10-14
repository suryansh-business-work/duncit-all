import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { auth } from '@duncit/auth-tokens';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

const CHIPS: readonly { key: string; icon: ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { key: 'mweb.login.chipLocalEvents', icon: 'event-note' },
  { key: 'mweb.login.chipMeetPeople', icon: 'groups' },
  { key: 'mweb.login.chipNearbyPods', icon: 'place' },
];

/**
 * What Duncit is, in three words each, under the landing heading. Labels, not
 * controls. mWeb twin: pages/login-page/LoginFeatureChips.tsx.
 */
export function LoginFeatureChips() {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  return (
    <XStack testID="login-feature-chips" flexWrap="wrap" gap={8}>
      {CHIPS.map(({ key, icon }) => (
        <XStack
          key={key}
          alignItems="center"
          gap={6}
          paddingHorizontal={12}
          paddingVertical={6}
          borderRadius={auth.hero.chipRadius}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
        >
          <MaterialIcons name={icon} size={16} color={accent} />
          <Text fontSize={13} fontWeight="600" color="$color">
            {t(key)}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}
