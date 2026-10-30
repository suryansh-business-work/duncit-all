import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { useLogout } from '@/hooks/useLogout';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useMe } from '@/hooks/useMe';
import { usePublicPolicies } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeStore } from '@/stores/theme.store';
import { useAutoPodCounts } from '@/hooks/useAutoPodCounts';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { STUDIO_LABEL, availableModes, resolveMode, studioSwitchRoute } from '@/utils/studio-mode';
import { StudioSwitchDialog } from '@/components/StudioSwitchDialog';
import { isTabRoute } from '@/navigation/tabs';
import type { MenuRoute, MenuStackRoute, RootStackParamList } from '@/navigation/types';
import { SidebarFooter } from './SidebarFooter';
import { SidebarRefreshBar } from './SidebarRefreshBar';
import { SidebarSections } from './SidebarSections';
import { SidebarSkeleton } from './SidebarSkeleton';
import { SidebarUserContent } from './SidebarUserContent';
import { useMenuFlags } from './useMenuFlags';
import { useChatUnreadTotal } from '@/hooks/useChatUnreadTotal';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

/**
 * Body of the account menu screen (/menu) — the RN twin of mWeb's <MenuPanel/>.
 * Every role shares one card-based layout: the profile card, Quick Access,
 * the Studio and Duncit Coin cards, then five collapsible section cards (the
 * role switch and dark mode sit in Account, the policies in Support) and logout. It is a pushed screen rather than a drawer, so hardware Back and a
 * cold deep link behave like any other route; the ✕ returns to where the user
 * came from.
 */
export function Sidebar({ onClose }: Readonly<{ onClose: () => void }>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { color: ink } = useThemeColors();
  const { t } = useTranslation();

  // The identity, the completion record, the coin card and the policies all
  // come from the one user info request — opening the menu asks for nothing.
  const { data, isLoading } = useMe();
  const { data: policiesData, isLoading: policiesLoading } = usePublicPolicies();
  const me = data?.me;
  // Rendering `me` as undefined would paint a stranger's menu for a beat — an
  // anonymous "User" avatar at 0% profile completion. mWeb skeletons the same
  // block; the header ✕ stays either way, so there is always a way back out.
  const pending = isLoading && !me;
  // On a warm store the answer is already there, so a pull to refresh shows as
  // the thin bar rather than flashing a skeleton over content that is correct.
  const refreshing = !pending && (isLoading || policiesLoading);
  const roles = me?.roles ?? [];
  const flags = useMenuFlags();
  // Unread lines across the member's pod and club rooms: the Chats tile's badge.
  const unreadChats = useChatUnreadTotal();
  const showProducts = flags.products === true;
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
  // Read once for a partner and re-read when the dialog opens, so the switch
  // itself never waits on the network to decide where to land.
  const autoPods = useAutoPodCounts(roles);

  const openSwitch = () => {
    autoPods.reload();
    setSwitchOpen(true);
  };

  // MenuStackRoute is a union of param-less screens; RN v7's distributive
  // `push` overload can't accept a union arg directly, so the action is
  // dispatched instead (safe — none of these screens take required params).
  const push = (screen: MenuStackRoute) => navigation.dispatch(StackActions.push(screen));
  // A page opened from the menu is PUSHED over it, so Back returns to the menu
  // (as on mWeb's /menu). `push`, not `navigate`: navigate would rewind to a
  // copy of the route already lower in the stack instead of opening it here.
  const go = (route: MenuRoute) => {
    // A tab lives under Home, BELOW the menu, so the menu leaves first. The Shop
    // group still offers the Cart, and the cart is a TAB now — a bare navigate
    // would bubble up past a destination that lives one level down.
    if (isTabRoute(route)) {
      onClose();
      navigation.navigate('Home', { screen: route });
      return;
    }
    push(route);
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
            tabIndex={0}
            hitSlop={2}
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
              account={me}
              roles={roles}
              mode={effectiveMode}
              flags={flags}
              badgeCounts={{ chats: unreadChats }}
              onNavigate={go}
            />
          )}

          <SidebarSections
            flags={flags}
            onNavigate={go}
            canSwitch={canSwitch}
            modeLabel={STUDIO_LABEL[effectiveMode]}
            onSwitch={openSwitch}
            dark={scheme === 'dark'}
            onToggleTheme={toggleTheme}
            policies={policiesData?.publicPolicies ?? []}
            policiesLoading={policiesLoading}
            onSelectPolicy={(slug) => navigation.push('Policy', { slug })}
          />
        </RefreshScrollView>

        <SidebarFooter
          onLogout={() => {
            onClose();
            fireAndForget(logout());
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
          // Jump straight to the selected role's Studio screen — or to its
          // Auto Pod queue when offers are waiting on that role.
          navigation.navigate(studioSwitchRoute(next, autoPods.counts));
        }}
      />
    </YStack>
  );
}
