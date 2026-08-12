import { useState } from 'react';
import { ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { useAccount } from '@/hooks/useAccount';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useLogout } from '@/hooks/useLogout';
import { useMe } from '@/hooks/useMe';
import { usePublicPolicies } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeStore } from '@/stores/theme.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { STUDIO_HOME_ROUTE, STUDIO_LABEL, availableModes, resolveMode } from '@/utils/studio-mode';
import { StudioSwitchDialog } from '@/components/StudioSwitchDialog';
import type { MenuRoute, RootStackParamList } from '@/navigation/types';
import { SidebarFooter } from './SidebarFooter';
import { SidebarPolicies } from './SidebarPolicies';
import { SidebarUserContent } from './SidebarUserContent';

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
  const { color: ink, primary } = useThemeColors();
  const { t } = useTranslation();

  const { data } = useMe();
  const { me: account } = useAccount();
  const { data: policiesData } = usePublicPolicies();
  const me = data?.me;
  const roles = me?.roles ?? [];
  const showPodPlans = useFeatureFlag('pod_plans_section');
  const showLeaderboard = useFeatureFlag('leaderboard');
  const showTourGuide = useFeatureFlag('tour_guide');
  const studioMode = useStudioModeStore((s) => s.mode);
  const setStudioMode = useStudioModeStore((s) => s.setMode);
  const effectiveMode = resolveMode(studioMode, roles);
  const canSwitch = availableModes(roles).length > 1;
  const logout = useLogout();
  const scheme = useThemeStore((s) => s.scheme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [switchOpen, setSwitchOpen] = useState(false);

  // MenuRoute is a union of param-less screens; RN v7's distributive `navigate`
  // overload can't accept a union arg directly, so reshape the method to a
  // single-arg signature (safe — none of these screens take required params).
  const navigate: (screen: MenuRoute) => void = navigation.navigate;
  // Leave the menu BEFORE navigating: `navigate` rewinds to a route already in
  // the stack rather than pushing, so a menu left underneath would swallow the
  // destination (Switch role -> "User" targets Home, and every header avatar
  // targets Menu itself). mWeb replaces its /menu entry for the same reason.
  const go = (route: MenuRoute) => {
    onClose();
    navigate(route);
  };

  return (
    <YStack flex={1} testID="sidebar-panel">
      <AppBackground />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <XStack
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal={16}
          paddingVertical={10}
        >
          <Text fontSize={12} fontWeight="600" textTransform="uppercase" color="$muted">
            {effectiveMode === 'USER' ? 'Profile' : STUDIO_LABEL[effectiveMode]}
          </Text>
          <XStack
            testID="sidebar-close"
            role="button"
            aria-label={t('mweb.home.closeMenu')}
            onPress={onClose}
            width={36}
            height={36}
            alignItems="center"
            justifyContent="center"
            borderRadius={18}
            backgroundColor="$surface"
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="close" size={18} color={ink} />
          </XStack>
        </XStack>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4 }}
        >
          {/* One unified card layout for every role — the studio-specific
              menu list was retired so all modes share this design. */}
          <SidebarUserContent
            me={me}
            account={account}
            roles={roles}
            mode={effectiveMode}
            showPodPlans={showPodPlans}
            showLeaderboard={showLeaderboard}
            showTourGuide={showTourGuide}
            onNavigate={go}
          />

          {canSwitch ? (
            <XStack
              testID="sidebar-switch-role"
              role="button"
              aria-label="Switch role"
              onPress={() => setSwitchOpen(true)}
              marginHorizontal={8}
              marginTop={4}
              marginBottom={15}
              alignItems="center"
              gap={12}
              borderRadius={10}
              paddingHorizontal={12}
              paddingVertical={10}
              backgroundColor="$surface"
              pressStyle={{ opacity: 0.7 }}
            >
              <MaterialIcons name="swap-horiz" size={20} color={primary} />
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="600" color="$color">
                  Switch role
                </Text>
                <Text fontSize={11.5} color="$muted">
                  {STUDIO_LABEL[effectiveMode]}
                </Text>
              </YStack>
            </XStack>
          ) : null}

          <Separator borderColor="$borderColor" />
          <XStack
            alignItems="center"
            justifyContent="space-between"
            minHeight={44}
            paddingHorizontal={16}
            paddingVertical={0}
          >
            <XStack alignItems="center" gap={12}>
              <MaterialIcons
                name={scheme === 'dark' ? 'dark-mode' : 'light-mode'}
                size={20}
                color={ink}
              />
              <Text fontSize={14.5} fontWeight="700" color="$color">
                Dark mode
              </Text>
            </XStack>
            <Switch
              testID="sidebar-theme-switch"
              aria-label="Toggle dark mode"
              value={scheme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ true: primary }}
            />
          </XStack>
          <Separator borderColor="$borderColor" />
          <SidebarPolicies
            policies={policiesData?.publicPolicies ?? []}
            onSelect={(slug) => {
              onClose();
              navigation.navigate('Policy', { slug });
            }}
          />
        </ScrollView>

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
        current={effectiveMode}
        onClose={() => setSwitchOpen(false)}
        onSelect={(next) => {
          setStudioMode(next);
          setSwitchOpen(false);
          onClose();
          // Jump straight to the selected role's dashboard (B3-2).
          navigation.navigate(STUDIO_HOME_ROUTE[next]);
        }}
      />
    </YStack>
  );
}
