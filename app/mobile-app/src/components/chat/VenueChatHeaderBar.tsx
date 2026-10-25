import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { VenueChatCounterpart } from '@duncit/utils';

import { ChatRoomAvatar } from '@/components/chat/ChatRoomAvatar';
import { VenueChatContactRow } from '@/components/chat/VenueChatContactRow';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** Who the reader is talking to; null while the thread loads or when it is closed to them. */
  counterpart: VenueChatCounterpart | null;
  /** The reader is the venue: the face is the pod's, not a venue photo. */
  venueSide: boolean;
  onBack: () => void;
}

/** The venue thread's top bar: back, then who it is with — the venue for a
 * host, the pod for the venue — and how to reach them outside the chat.
 * mWeb twin: venue-chat-page/VenueChatHeader. */
export function VenueChatHeaderBar({ counterpart, venueSide, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink } = useThemeColors();
  const { formatDateTime } = useDateFormat();
  const when = counterpart?.when ? formatDateTime(counterpart.when) : '';
  const about = [counterpart?.podTitle, when].filter(Boolean).join(' · ');

  return (
    <XStack
      testID="venue-chat-header"
      alignItems="center"
      gap={12}
      paddingHorizontal={16}
      paddingVertical={8}
    >
      <XStack
        testID="venue-chat-back"
        role="button"
        tabIndex={0}
        hitSlop={2}
        aria-label={t('mweb.common.goBack')}
        onPress={onBack}
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
        borderRadius={20}
        backgroundColor="$surface"
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="arrow-back" size={22} color={ink} />
      </XStack>
      {counterpart ? (
        <ChatRoomAvatar
          coverUrl={counterpart.photo}
          fallbackIcon={venueSide ? 'event' : 'storefront'}
        />
      ) : null}
      <YStack flex={1} minWidth={0}>
        <Text
          testID="venue-chat-title"
          role="heading"
          fontSize={17}
          fontWeight="600"
          color="$color"
          numberOfLines={1}
        >
          {counterpart?.name ?? ''}
        </Text>
        {about ? (
          <Text fontSize={12} fontWeight="500" color="$muted" numberOfLines={1}>
            {about}
          </Text>
        ) : null}
        <VenueChatContactRow contact={counterpart?.contact ?? null} />
      </YStack>
    </XStack>
  );
}
