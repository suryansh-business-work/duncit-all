import { useState } from 'react';
import { Modal, ScrollView, Switch, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useAccount } from '@/hooks/useAccount';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useLogout } from '@/hooks/useLogout';
import { useMe } from '@/hooks/useMe';
import { useMenuItems } from '@/hooks/useMenuItems';
import { usePublicPolicies } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemeStore } from '@/stores/theme.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { STUDIO_HOME_ROUTE, STUDIO_LABEL, availableModes, resolveMode } from '@/utils/studio-mode';
import { StudioSwitchDialog } from '@/components/StudioSwitchDialog';
import type { MenuRoute, RootStackParamList } from '@/navigation/types';
import { SidebarFooter } from './SidebarFooter';
import { SidebarMenuItem } from './SidebarMenuItem';
import { SidebarPolicies } from './SidebarPolicies';
import { SidebarUserContent } from './SidebarUserContent';
import { SidebarUserSummary } from './SidebarUserSummary';

/**
 * Account drawer — the RN twin of mWeb's right-anchored <ProfileDrawer/>. USER
 * mode shows the card-based profile layout (identity, quick grid, referral,
 * Manage Account); each studio mode keeps its role-based menu list. Slides in
 * from the right with the shared role switch, dark-mode toggle, policies, logout.
 */
export function Sidebar({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Full-width, edge-to-edge panel — mirrors mWeb's '100vw' drawer.
  const { width: panelWidth } = useWindowDimensions();
  const { background, color: ink, primary } = useThemeColors();

  const { data } = useMe();
  const { me: account } = useAccount();
  const { data: policiesData } = usePublicPolicies();
  const me = data?.me;
  const roles = me?.roles ?? [];
  const showPodPlans = useFeatureFlag('pod_plans_section');
  const studioMode = useStudioModeStore((s) => s.mode);
  const setStudioMode = useStudioModeStore((s) => s.setMode);
  const effectiveMode = resolveMode(studioMode, roles);
  const canSwitch = availableModes(roles).length > 1;
  const { items } = useMenuItems(effectiveMode);
  const logout = useLogout();
  const scheme = useThemeStore((s) => s.scheme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [switchOpen, setSwitchOpen] = useState(false);

  const go = (route: MenuRoute) => {
    onClose();
    // MenuRoute is a union of param-less screens; RN's navigate overload can't
    // narrow a dynamic union arg, so cast (safe — none take required params).
    navigation.navigate(route as never);
  };

  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack
          testID="sidebar-backdrop"
          flex={1}
          backgroundColor="rgba(0,0,0,0.5)"
          onPress={onClose}
        />
        <YStack
          testID="sidebar-panel"
          position="absolute"
          top={0}
          bottom={0}
          right={0}
          width={panelWidth}
          backgroundColor={background}
        >
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal={16}
              paddingVertical={10}
            >
              <Text fontSize={12} fontWeight="800" textTransform="uppercase" color="$muted">
                {effectiveMode === 'USER' ? 'Profile' : STUDIO_LABEL[effectiveMode]}
              </Text>
              <XStack
                testID="sidebar-close"
                role="button"
                aria-label="Close menu"
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
              {effectiveMode === 'USER' ? (
                <SidebarUserContent
                  me={me}
                  account={account}
                  showPodPlans={showPodPlans}
                  onNavigate={go}
                />
              ) : (
                <YStack>
                  <SidebarUserSummary me={me} onPress={() => go('Profile')} />
                  {items.map((it) => (
                    <SidebarMenuItem key={it.label} item={it} onPress={() => go(it.route)} />
                  ))}
                </YStack>
              )}

              {canSwitch ? (
                <XStack
                  testID="sidebar-switch-role"
                  role="button"
                  aria-label="Switch role"
                  onPress={() => setSwitchOpen(true)}
                  marginHorizontal={8}
                  marginTop={4}
                  marginBottom={6}
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
                    <Text fontSize={14} fontWeight="800" color="$color">
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
                paddingVertical={4}
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
        </YStack>
      </ModalThemeScope>
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
          navigation.navigate(STUDIO_HOME_ROUTE[next] as never);
        }}
      />
    </Modal>
  );
}
