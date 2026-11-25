import { useState } from 'react';
import { Image, ScrollView } from 'react-native';
import { useNavigation, useNavigationState, type NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack, useTheme } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { CRM_NAV, navPath, type NavItem } from '@/navigation/crmNav';
import type { AppStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/stores/auth.store';
import { NavTree } from './NavTree';
import { activeNavKey, goTo, type RouteLike } from './menuRoutes';

const LOGO = require('../../../assets/duncit-logo.png');

/**
 * The side menu: the CRM portal's sidebar on the phone, every group and page
 * in the portal's order — except the portal's "CRM Mobile App" download pages,
 * which have no place inside the app itself. It slides in from the left over the screen; tapping
 * the dimmed edge or the close button puts it away.
 */
export function MenuScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const user = useAuthStore((s) => s.user);
  // The screen the menu opened over is the route just below it.
  const below = useNavigationState(
    (state) => state.routes[state.index - 1] as RouteLike | undefined,
  );
  const activeKey = activeNavKey(below);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(activeKey ? (navPath(CRM_NAV, activeKey) ?? []) : []),
  );
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const tree = {
    activeKey,
    expanded,
    onToggle: toggle,
    onPick: (item: NavItem) => goTo(navigation, item),
  };
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  return (
    <XStack flex={1}>
      <YStack
        width="84%"
        maxWidth={340}
        backgroundColor="$surface"
        borderRightWidth={1}
        borderColor="$borderColor"
      >
        <SafeAreaView style={{ flex: 1 }}>
          <XStack alignItems="center" gap="$3" padding="$4">
            <Image
              source={LOGO}
              style={{ width: 36, height: 36 }}
              resizeMode="contain"
              accessible={false}
            />
            <YStack flex={1}>
              <Text fontSize="$6" fontWeight="800">
                {t('crmApp.login.title')}
              </Text>
              {name || user?.email ? (
                <Text color="$muted" fontSize="$2" numberOfLines={1}>
                  {name || user?.email}
                </Text>
              ) : null}
            </YStack>
            <XStack
              role="button"
              aria-label={t('crmApp.menu.close')}
              onPress={() => navigation.goBack()}
              padding="$2"
              hitSlop={8}
              testID="menu-close"
            >
              <MaterialIcons name="close" size={24} color={theme.color?.val} />
            </XStack>
          </XStack>
          <Separator />
          <ScrollView contentContainerStyle={{ padding: 8 }} testID="menu-list">
            <NavTree items={CRM_NAV} {...tree} />
          </ScrollView>
        </SafeAreaView>
      </YStack>
      <YStack
        flex={1}
        role="button"
        aria-label={t('crmApp.menu.close')}
        onPress={() => navigation.goBack()}
        backgroundColor="$scrim"
        testID="menu-scrim"
      />
    </XStack>
  );
}
