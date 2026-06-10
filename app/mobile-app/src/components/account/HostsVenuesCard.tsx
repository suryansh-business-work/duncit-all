import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

function ActionRow({
  icon,
  label,
  onPress,
  testID,
}: Readonly<{
  icon: IconName;
  label: string;
  onPress: () => void;
  testID: string;
}>) {
  const { primary, muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={12}
      paddingVertical={12}
      pressStyle={{ opacity: 0.8 }}
    >
      <MaterialIcons name={icon} size={20} color={primary} />
      <Text flex={1} fontSize={14.5} fontWeight="800" color="$color">
        {label}
      </Text>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}

export interface HostsVenuesCardProps {
  isHost: boolean;
  isVenue: boolean;
  onDiscover?: () => void;
  onHost: () => void;
  onVenue: () => void;
  onPodHistory: () => void;
}

/** Hosts & Venues shortcuts — RN twin of mWeb's <HostsVenuesCard/>. The header
 * opens the discovery list; role-aware host/venue links + Pod History below. */
export function HostsVenuesCard({
  isHost,
  isVenue,
  onDiscover,
  onHost,
  onVenue,
  onPodHistory,
}: Readonly<HostsVenuesCardProps>) {
  return (
    <YStack
      testID="account-hosts-venues"
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      paddingHorizontal={16}
      paddingVertical={6}
    >
      <YStack
        testID="account-hosts-venues-discover"
        role={onDiscover ? 'button' : undefined}
        aria-label={onDiscover ? 'Discover hosts and venues' : undefined}
        onPress={onDiscover}
        paddingVertical={10}
        gap={2}
        pressStyle={onDiscover ? { opacity: 0.85 } : undefined}
      >
        <Text fontSize={16} fontWeight="900" color="$color">
          Hosts &amp; Venues
        </Text>
        <Text fontSize={13} color="$muted">
          Discover Duncit hosts &amp; venues — and start your onboarding here.
        </Text>
      </YStack>
      <ActionRow
        testID="hv-host"
        icon={isHost ? 'dashboard' : 'group-add'}
        label={isHost ? 'Hosts Management' : 'Become a Host'}
        onPress={onHost}
      />
      <ActionRow
        testID="hv-venue"
        icon={isVenue ? 'store' : 'add-business'}
        label={isVenue ? 'Venue Management' : 'Register Venue'}
        onPress={onVenue}
      />
      <ActionRow
        testID="hv-pod-history"
        icon="history"
        label="Pod History"
        onPress={onPodHistory}
      />
    </YStack>
  );
}
