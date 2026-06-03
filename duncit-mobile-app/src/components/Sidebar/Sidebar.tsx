import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack } from 'tamagui';

import { useLogout } from '@/hooks/useLogout';
import { useMe } from '@/hooks/useMe';
import { useMenuItems } from '@/hooks/useMenuItems';
import { usePublicPolicies } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { MenuRoute, RootStackParamList } from '@/navigation/types';
import { SidebarFooter } from './SidebarFooter';
import { SidebarMenuItem } from './SidebarMenuItem';
import { SidebarPolicies } from './SidebarPolicies';
import { SidebarUserSummary } from './SidebarUserSummary';

/**
 * Account drawer — the RN twin of mWeb's right-anchored <ProfileDrawer/>. Slides
 * in from the right with user summary, role-based menu, policies, and logout.
 */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * 0.84, 360);
  const { background, color: ink } = useThemeColors();

  const { data } = useMe();
  const { data: policiesData } = usePublicPolicies();
  const me = data?.me;
  const { baseItems, hostItem, venueItem, supportItems } = useMenuItems(me?.roles ?? []);
  const logout = useLogout();

  const [mounted, setMounted] = useState(open);
  const tx = useRef(new Animated.Value(panelWidth)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(tx, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(tx, { toValue: panelWidth, duration: 200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // Animate only on `open` flips; `mounted`/`panelWidth` are derived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const go = (route: MenuRoute) => {
    onClose();
    navigation.navigate(route);
  };

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, opacity: fade, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable testID="sidebar-backdrop" style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View
        testID="sidebar-panel"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: panelWidth,
          backgroundColor: background,
          transform: [{ translateX: tx }],
        }}
      >
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={16}
            paddingVertical={12}
          >
            <Text fontSize={12} fontWeight="800" textTransform="uppercase" color="$muted">
              Account
            </Text>
            <XStack
              testID="sidebar-close"
              accessibilityRole="button"
              accessibilityLabel="Close menu"
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

          <SidebarUserSummary me={me} onPress={() => go('Profile')} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4 }}
          >
            {baseItems.map((it) => (
              <SidebarMenuItem key={it.label} item={it} onPress={() => go(it.route)} />
            ))}
            <SidebarMenuItem item={hostItem} onPress={() => go(hostItem.route)} />
            <SidebarMenuItem item={venueItem} onPress={() => go(venueItem.route)} />
            <Separator marginVertical={6} borderColor="$borderColor" />
            {supportItems.map((it) => (
              <SidebarMenuItem key={it.label} item={it} onPress={() => go(it.route)} />
            ))}
            <Separator marginVertical={6} borderColor="$borderColor" />
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
              void logout();
            }}
          />
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}
