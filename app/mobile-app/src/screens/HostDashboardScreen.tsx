import type { ComponentProps } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { DetailSkeleton } from '@/components/Skeleton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { StatTile } from '@/components/studio/StatTile';
import { EarningsSummaryTiles } from '@/components/earnings/EarningsSummaryTiles';
import { HostInsightsSection } from '@/components/host-manage/host-insights';
import { useHostDashboard, type HostDashboardStats } from '@/hooks/useHostDashboard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
type QuickRoute = 'CreatePod' | 'HostManage' | 'Verification' | 'Wallet';

const quick = (t: Translate): { label: string; icon: IconName; route: QuickRoute }[] => [
  { label: t('mweb.common.createPod'), icon: 'add', route: 'CreatePod' },
  { label: t('mweb.common.yourPods'), icon: 'dashboard', route: 'HostManage' },
  { label: t('mweb.common.verification'), icon: 'verified-user', route: 'Verification' },
  { label: t('mweb.common.wallet'), icon: 'account-balance-wallet', route: 'Wallet' },
];

const BAND_COLOR: Record<string, string> = {
  GREEN: semantic.success,
  YELLOW: semantic.warning,
  RED: semantic.error,
};

/** The 40px disc a dashboard icon sits in — accent glyph on the soft fill. */
function IconDisc({ icon }: Readonly<{ icon: IconName }>) {
  const { accent } = useThemeColors();
  return (
    <YStack
      width={40}
      height={40}
      borderRadius={999}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$soft"
    >
      <MaterialIcons name={icon} size={20} color={accent} />
    </YStack>
  );
}

/** One quick-action tile — two to a row. */
function QuickAction({
  label,
  icon,
  onPress,
}: Readonly<{ label: string; icon: IconName; onPress: () => void }>) {
  return (
    <XStack
      testID={`host-action-${label.replace(/\s+/g, '-').toLowerCase()}`}
      role="button"
      aria-label={label}
      onPress={onPress}
      flex={1}
      minWidth={140}
      alignItems="center"
      gap={12}
      padding={14}
      borderRadius={24}
      borderWidth={1}
      borderColor="$cardBorder"
      backgroundColor="$surface"
      pressStyle={PRESS_STYLE.surface}
    >
      <IconDisc icon={icon} />
      <Text flex={1} fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
        {label}
      </Text>
    </XStack>
  );
}

const statTiles = (stats: HostDashboardStats, t: Translate) => [
  { label: t('mweb.hostDashboard.pods'), value: stats.total },
  { label: t('mweb.common.upcoming'), value: stats.upcoming },
  { label: t('mweb.common.paid'), value: stats.paid },
];

/** Host Dashboard — earnings, pod stats, quick actions and profile/verification
 * health. RN twin of mWeb's HostDashboardPage (B2-#5). */
export function HostDashboardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { muted } = useThemeColors();
  const { me, wallet, earnings, health, stats, pods, isLoading } = useHostDashboard();

  if (isLoading && !me) {
    return (
      <StackScreen header title={t('mweb.hostDashboard.dashboard')} testID="host-dashboard-screen">
        <DetailSkeleton testID="host-dashboard-loading" />
      </StackScreen>
    );
  }

  const currency = wallet?.currency_symbol ?? '₹';

  return (
    <StackScreen header title={t('mweb.hostDashboard.dashboard')} testID="host-dashboard-screen">
      <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}>
        <YStack gap={12}>
          <SurfaceCard flexDirection="row" alignItems="center" gap={12} testID="host-earnings">
            <IconDisc icon="payments" />
            <YStack flex={1}>
              <Text fontSize={12} fontWeight="600" color="$muted">
                AVAILABLE BALANCE
              </Text>
              <Text fontSize={28} fontWeight="700" color="$color" numberOfLines={1}>
                {currency}
                {(wallet?.balance ?? 0).toFixed(2)}
              </Text>
            </YStack>
          </SurfaceCard>

          {earnings ? <EarningsSummaryTiles summary={earnings} /> : null}
        </YStack>

        <XStack gap={12}>
          {statTiles(stats, t).map((tile) => (
            <StatTile key={tile.label} value={tile.value} label={tile.label} size="lg" />
          ))}
        </XStack>

        <XStack flexWrap="wrap" gap={12}>
          {quick(t).map((action) => (
            <QuickAction
              key={action.label}
              label={action.label}
              icon={action.icon}
              onPress={() => navigation.navigate(action.route)}
            />
          ))}
        </XStack>

        <HostInsightsSection pods={pods} currency={currency} />

        {health ? (
          <XStack
            testID="host-health"
            role="button"
            aria-label={t('mweb.hostDashboard.viewProfileHealth')}
            onPress={() => navigation.navigate('AccountHealth')}
            alignItems="center"
            gap={12}
            padding={16}
            borderRadius={24}
            borderWidth={1}
            borderColor="$cardBorder"
            backgroundColor="$surface"
            pressStyle={PRESS_STYLE.surface}
          >
            <YStack
              width={48}
              height={48}
              borderRadius={999}
              alignItems="center"
              justifyContent="center"
              backgroundColor={BAND_COLOR[health.band]}
            >
              <Text fontSize={16} fontWeight="700" color="$onPrimary">
                {health.total_score}
              </Text>
            </YStack>
            <Text flex={1} fontSize={16} fontWeight="600" color="$color">
              {t('mweb.hostDashboard.profileHealth')}
            </Text>
            <MaterialIcons name="chevron-right" size={22} color={muted} />
          </XStack>
        ) : null}
      </RefreshScrollView>
    </StackScreen>
  );
}
