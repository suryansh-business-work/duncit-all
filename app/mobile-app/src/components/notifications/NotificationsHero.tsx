import { Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  total: number;
  enabled: boolean;
  onToggle: (next: boolean) => void;
}

/** The "Never Miss an Update" banner + the allow-notifications switch. */
export function NotificationsHero({ total, enabled, onToggle }: Readonly<Props>) {
  const { color, primary } = useThemeColors();
  return (
    <YStack gap={10} marginHorizontal={12} marginBottom={10}>
      <XStack
        padding={14}
        borderRadius={16}
        alignItems="center"
        gap={12}
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <MaterialIcons name="notifications-active" size={26} color={primary} />
        <YStack flex={1}>
          <Text fontSize={14} fontWeight="700" color="$color">
            Never Miss an Update
          </Text>
          <Text fontSize={12} color="$muted">
            Get real-time updates about your Pods, Clubs, Host activities, Chats, and Account—all in
            one place.
          </Text>
        </YStack>
        <XStack
          borderRadius={999}
          backgroundColor="$primary"
          paddingHorizontal={10}
          paddingVertical={3}
        >
          <Text fontSize={12} fontWeight="700" color="$onPrimary">
            {total}
          </Text>
        </XStack>
      </XStack>

      <XStack
        paddingHorizontal={14}
        paddingVertical={10}
        borderRadius={16}
        alignItems="center"
        gap={12}
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <MaterialIcons name="notifications" size={20} color={color} />
        <Text flex={1} fontSize={13.5} fontWeight="600" color="$color">
          Allow notifications
        </Text>
        <Switch
          testID="notifications-allow-switch"
          aria-label="Allow notifications"
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ true: primary }}
        />
      </XStack>
    </YStack>
  );
}
