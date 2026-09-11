import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { useAccount } from '@/hooks/useAccount';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { PRODUCT_VISIBILITY_FLAG } from '@/hooks/useProductVisibility';
import { useLogout } from '@/hooks/useLogout';
import { useMe } from '@/hooks/useMe';
import { usePublicPolicies } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeStore } from '@/stores/theme.store';
import { useAutoPodCountsStore } from '@/stores/auto-pod-counts.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { STUDIO_LABEL, availableModes, resolveMode, studioSwitchRoute } from '@/utils/studio-mode';
import { StudioSwitchDialog } from '@/components/StudioSwitchDialog';
import { isTabRoute } from '@/navigation/tabs';
import type { MenuRoute, MenuStackRoute, RootStackParamList } from '@/navigation/types';
import { SidebarFooter } from './SidebarFooter';
import { SidebarRefreshBar } from './SidebarRefreshBar';
import { SidebarSettings } from './SidebarSettings';
import { SidebarSkeleton } from './SidebarSkeleton';
import { SidebarUserContent } from './SidebarUserContent';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

/**
 * Body of the account menu screen (/menu) — the RN twin of mWeb's <MenuPanel/>.
 * Every role shares one card-based profile layout (identity, quick grid,
 * referral, Manage Account) with the role switch, dark-mode toggle, policies and
 * logout. It is a pushed screen rather than a drawer, so hardware Back and a
 * cold deep link behave like any other route; the ✕ returns to where the user
 * came from.
 */
export function Sidebar({ onClose }: Readonly<{ onClose: () => void }>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { color: ink } = useThemeColors();
  const { t } = useTranslation();

  const { data, isLoading } = useMe();
  const { me: account, isLoading: accountLoading } = useAccount();
  const { data: policiesData, isLoading: policiesLoading } = usePublicPolicies();
  const me = data?.me;
  // Rendering `me` as undefined would paint a stranger's menu for a beat — an
  // anonymous "User" avatar at 0% profile completion. mWeb skeletons the same
  // block; the header ✕ stays either way, so there is always a way back out.
  const pending = isLoading && !me;
  // On a warm store the answer is already there, so the account record — which
  // is re-read on every open — shows as the thin bar rather than flashing a
  // skeleton over content that is already correct.
  const refreshing = !pending && (isLoading || accountLoading || policiesLoading);
  const roles = me?.roles ?? [];
  const showPodPlans = useFeatureFlag('pod_plans_section');
  const showLeaderboard = useFeatureFlag('leaderboard');
  const showMembership = useFeatureFlag('membership');
  const showGiftCards = useFeatureFlag('gift_cards');
  const showTourGuide = useFeatureFlag('tour_guide');
  const showAutoPods = useFeatureFlag('auto_pods');
  const showProducts = useFeatureFlag(PRODUCT_VISIBILITY_FLAG);
  const studioMode = useStudioModeStore((s) => s.mode);
  const setStudioMode = useStudioModeStore((s) => s.setMode);
  // Products off drops the E-commerce studio from the switcher AND from a
  // persisted mode, so nobody is left sitting in a studio whose screens are gated.
  const studioAccess = { products: showProducts };
  const effectiveMode = resolveMode(studioMode, roles, studioAccess);
  const canSwitch = availableModes(roles, studioAccess).length > 1;
  const logout = useLogout();
  const scheme = useThemeStore((s) => s.scheme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [switchOpen, setSwitchOpen] = useState(false);
  const autoPodCounts = useAutoPodCountsStore((s) => s.data);
  const fetchAutoPodCounts = useAutoPodCountsStore((s) => s.fetch);

  // Primed on mount and re-read when the dialog opens, so the switch itself
  // never waits on the network to decide where to land.
  useEffect(() => {
    fetchAutoPodCounts().catch(() => undefined);
  }, [fetchAutoPodCounts]);

  const openSwitch = () => {
    fetchAutoPodCounts(true).catch(() => undefined);
    setSwitchOpen(true);
  };

  // MenuStackRoute is a union of param-less screens; RN v7's distributive
  // `navigate` overload can't accept a union arg directly, so reshape the method
  // to a single-arg signature (safe — none of these screens take required params).
  const navigate: (screen: MenuStackRoute) => void = navigation.navigate;
  // Leave the menu BEFORE navigating: `navigate` rewinds to a route already in
  // the stack rather than pushing, so a menu left underneath would swallow the
  // destination (Switch role -> "User" targets Home, and every header avatar
  // targets Menu itself). mWeb replaces its /menu entry for the same reason.
  const go = (route: MenuRoute) => {
    onClose();
    // The Shop group still offers the Cart, and the cart is a TAB now — a bare
    // navigate would bubble up past a destination that lives one level down.
    if (isTabRoute(route)) {
      navigation.navigate('Home', { screen: route });
      return;
    }
    navigate(route);
  };

  return (
    <YStack flex={1} testID="sidebar-panel">
      <AppBackground />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <XStack justifyContent="flex-end" paddingHorizontal={16} paddingVertical={8}>
          <XStack
            testID="sidebar-close"
            role="button"
            aria-label={t('mweb.home.closeMenu')}
            onPress={onClose}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            borderWidth={1}
            borderColor="$cardBorder"
            backgroundColor="$surface"
            pressStyle={PRESS_STYLE.control}
          >
            <MaterialIcons name="close" size={20} color={ink} />
          </XStack>
        </XStack>

        <SidebarRefreshBar active={refreshing} />

        <RefreshScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
        >
          {pending ? (
            <SidebarSkeleton />
          ) : (
            <SidebarUserContent
              me={me}
              account={account}
              accountLoading={accountLoading}
              roles={roles}
              mode={effectiveMode}
              showPodPlans={showPodPlans}
              showLeaderboard={showLeaderboard}
              showMembership={showMembership}
              showGiftCards={showGiftCards}
              showTourGuide={showTourGuide}
              showAutoPods={showAutoPods}
              showProducts={showProducts}
              onNavigate={go}
            />
          )}

          <SidebarSettings
            canSwitch={canSwitch}
            modeLabel={STUDIO_LABEL[effectiveMode]}
            onSwitch={openSwitch}
            dark={scheme === 'dark'}
            onToggleTheme={toggleTheme}
            policies={policiesData?.publicPolicies ?? []}
            policiesLoading={policiesLoading}
            onSelectPolicy={(slug) => {
              onClose();
              navigation.navigate('Policy', { slug });
            }}
          />
        </RefreshScrollView>

        <SidebarFooter
          onLogout={() => {
            onClose();
            logout();
          }}
        />
      </SafeAreaView>
      <StudioSwitchDialog
        open={switchOpen}
        roles={roles}
        showProducts={showProducts}
        current={effectiveMode}
        onClose={() => setSwitchOpen(false)}
        onSelect={(next) => {
          setStudioMode(next);
          setSwitchOpen(false);
          onClose();
          // Jump straight to the selected role's dashboard (B3-2) — or to its
          // Auto Pod queue when offers are waiting on that role.
          navigation.navigate(studioSwitchRoute(next, autoPodCounts));
        }}
      />
    </YStack>
  );
}
