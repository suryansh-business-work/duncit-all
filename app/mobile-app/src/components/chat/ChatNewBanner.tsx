import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { chatNewToastLine } from '@duncit/utils';

import { PRESS_STYLE } from '@duncit/buttons-native';
import { useChatAlerts } from '@/hooks/useChatAlerts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { navigationRef } from '@/navigation/navigationRef';
import { useChatAlertsStore } from '@/stores/chat-alerts.store';

/** How long the banner stays up. */
const BANNER_MS = 5000;

/**
 * The in-app alert for a message in another room: the room's name and the
 * line, over every screen. Tapping it opens the room; it hides on its own.
 * Mounted once at the app root (inside the navigation container).
 */
export function ChatNewBanner() {
  useChatAlerts();
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const insets = useSafeAreaInsets();
  const banner = useChatAlertsStore((s) => s.banner);
  const dismiss = useChatAlertsStore((s) => s.dismiss);

  useEffect(() => {
    if (!banner) return undefined;
    // It appears without taking focus, so say it (WCAG 4.1.3).
    AccessibilityInfo.announceForAccessibility(
      `${t('mweb.chatRoom.alert.newMessageIn', { vars: { title: banner.title } })}. ${chatNewToastLine(banner, t)}`,
    );
    const timer = setTimeout(dismiss, BANNER_MS);
    return () => clearTimeout(timer);
  }, [banner, dismiss, t]);

  if (!banner) return null;

  const open = () => {
    dismiss();
    if (!navigationRef.isReady()) return;
    navigationRef.navigate(
      'ChatRoom',
      banner.room_kind === 'CLUB'
        ? { clubId: banner.room_id, title: banner.title }
        : { podId: banner.room_id, title: banner.title },
    );
  };

  return (
    <XStack
      testID="chat-new-banner"
      position="absolute"
      top={insets.top + 8}
      left={12}
      right={12}
      zIndex={1000}
      alignItems="center"
      gap={10}
      paddingHorizontal={14}
      paddingVertical={10}
      borderRadius={16}
      borderWidth={1}
      borderColor="$cardBorder"
      backgroundColor="$surface"
    >
      <YStack
        flex={1}
        role="button"
        tabIndex={0}
        aria-label={`${t('mweb.chatRoom.alert.open')}: ${banner.title}`}
        onPress={open}
        pressStyle={PRESS_STYLE.row}
      >
        <Text fontSize={14} fontWeight="700" color="$color" numberOfLines={1}>
          {banner.title}
        </Text>
        <Text fontSize={13} color="$muted" numberOfLines={2}>
          {chatNewToastLine(banner, t)}
        </Text>
      </YStack>
      <XStack
        testID="chat-new-banner-close"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.hostPodActions.close')}
        onPress={dismiss}
        width={36}
        height={36}
        alignItems="center"
        justifyContent="center"
        borderRadius={18}
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="close" size={20} color={muted} />
      </XStack>
    </XStack>
  );
}
