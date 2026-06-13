import type { ComponentProps } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { DetailSkeleton } from '@/components/Skeleton';
import { useHostDashboard, type HostDashboardStats } from '@/hooks/useHostDashboard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
type QuickRoute = 'CreatePod' | 'HostManage' | 'Verification' | 'Wallet';

const QUICK: { label: string; icon: IconName; route: QuickRoute }[] = [
  { label: 'Create pod', icon: 'add', route: 'CreatePod' },
  { label: 'Your Pods', icon: 'dashboard', route: 'HostManage' },
  { label: 'Verification', icon: 'verified-user', route: 'Verification' },
  { label: 'Wallet', icon: 'account-balance-wallet', route: 'Wallet' },
];

const BAND_COLOR: Record<string, string> = {
  GREEN: '#43a047',
  YELLOW: '#fb8c00',
  RED: '#e53935',
};

/** One dashboard stat tile. */
function StatCard({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <YStack
      flex={1}
      padding={12}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={20} fontWeight="900" color="$color">
        {value}
      </Text>
      <Text fontSize={12} fontWeight="700" color="$muted">
        {label}
      </Text>
    </YStack>
  );
}

/** One quick-action button. */
function QuickAction({
  label,
  icon,
  onPress,
}: Readonly<{ label: string; icon: IconName; onPress: () => void }>) {
  const { primary } = useThemeColors();
  return (
    <YStack
      testID={`host-action-${label.replace(/\s+/g, '-').toLowerCase()}`}
      role="button"
      aria-label={label}
      onPress={onPress}
      flex={1}
      minWidth={140}
      gap={6}
      padding={14}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name={icon} size={22} color={primary} />
      <Text fontSize={13} fontWeight="900" color="$color">
        {label}
      </Text>
    </YStack>
  );
}

const statTiles = (stats: HostDashboardStats) => [
  { label: 'Pods', value: stats.total },
  { label: 'Upcoming', value: stats.upcoming },
  { label: 'Paid', value: stats.paid },
];

/** Host Dashboard — earnings, pod stats, quick actions and profile/verification
 * health. RN twin of mWeb's HostDashboardPage (B2-#5). */
export function HostDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { me, wallet, health, stats, isLoading } = useHostDashboard();

  if (isLoading && !me) {
    return (
      <StackScreen header title="Dashboard" testID="host-dashboard-screen">
        <DetailSkeleton testID="host-dashboard-loading" />
      </StackScreen>
    );
  }

  const currency = wallet?.currency_symbol ?? '₹';

  return (
    <StackScreen header title="Dashboard" testID="host-dashboard-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <YStack
          padding={18}
          borderRadius={20}
          backgroundColor="$primary"
          gap={4}
          testID="host-earnings"
        >
          <Text fontSize={12} fontWeight="900" color="$onPrimary" opacity={0.9}>
            AVAILABLE BALANCE
          </Text>
          <Text fontSize={30} fontWeight="900" color="$onPrimary">
            {currency}
            {(wallet?.balance ?? 0).toFixed(2)}
          </Text>
          <Text fontSize={12} fontWeight="700" color="$onPrimary" opacity={0.85}>
            {me?.full_name ? `Welcome back, ${me.full_name}` : 'Earnings from your hosted pods'}
          </Text>
        </YStack>

        <XStack gap={10}>
          {statTiles(stats).map((tile) => (
            <StatCard key={tile.label} value={tile.value} label={tile.label} />
          ))}
        </XStack>

        <XStack flexWrap="wrap" gap={10}>
          {QUICK.map((action) => (
            <QuickAction
              key={action.label}
              label={action.label}
              icon={action.icon}
              onPress={() => navigation.navigate(action.route)}
            />
          ))}
        </XStack>

        {health ? (
          <XStack
            testID="host-health"
            role="button"
            aria-label="View profile health"
            onPress={() => navigation.navigate('AccountHealth')}
            alignItems="center"
            gap={12}
            padding={16}
            borderRadius={16}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
            pressStyle={{ opacity: 0.85 }}
          >
            <YStack
              width={44}
              height={44}
              borderRadius={22}
              alignItems="center"
              justifyContent="center"
              backgroundColor={BAND_COLOR[health.band]}
            >
              <Text fontSize={14} fontWeight="900" color="#ffffff">
                {health.total_score}
              </Text>
            </YStack>
            <YStack flex={1}>
              <Text fontSize={14.5} fontWeight="900" color="$color">
                Profile health
              </Text>
              <Text fontSize={12.5} color="$muted">
                Keep your profile + verification up to date to rank higher.
              </Text>
            </YStack>
            <MaterialIcons name="chevron-right" size={22} color="#9aa0a6" />
          </XStack>
        ) : null}
      </ScrollView>
    </StackScreen>
  );
}
