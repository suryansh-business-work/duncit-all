import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  /** What the visitor has to do first to post in the room. */
  lockedHint: string;
  /** A club visitor joins the room by following the club; absent for a pod. */
  onJoinClub?: () => Promise<void>;
  /** Re-reads the preview once the visitor has joined. */
  onJoined: () => Promise<unknown>;
}

/** The visitor's side of a chat preview: join the club's room, or a pod's room shown locked. */
export function ChatPreviewJoin({ lockedHint, onJoinClub, onJoined }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary, muted } = useThemeColors();
  return (
    <YStack gap={8}>
      {onJoinClub ? (
        <DuncitButton
          testID="chat-preview-join"
          label={t('mweb.chat.joinRoom')}
          fullWidth
          accessibilityHint={lockedHint}
          icon={<MaterialIcons name="lock-outline" size={18} color={onPrimary} />}
          onPress={() =>
            fireAndForget(
              (async () => {
                await onJoinClub();
                await onJoined();
              })(),
            )
          }
        />
      ) : (
        // A pod is joined by booking, which this card cannot do — the room
        // reads as locked, not as a button that does nothing.
        <XStack
          testID="chat-preview-locked"
          aria-disabled
          accessible
          accessibilityLabel={`${t('mweb.chat.joinRoom')}. ${lockedHint}`}
          alignItems="center"
          justifyContent="center"
          gap={8}
          height={48}
          borderRadius={999}
          borderWidth={1}
          borderColor="$cardBorder"
        >
          <MaterialIcons name="lock-outline" size={18} color={muted} />
          <Text fontSize={15} fontWeight="600" color="$muted">
            {t('mweb.chat.joinRoom')}
          </Text>
        </XStack>
      )}
      <Text fontSize={13} color="$muted" textAlign="center" testID="chat-preview-locked-hint">
        {lockedHint}
      </Text>
    </YStack>
  );
}
