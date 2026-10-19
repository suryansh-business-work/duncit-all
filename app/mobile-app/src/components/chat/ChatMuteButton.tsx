import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';
import { CHAT_MUTE_DURATIONS, chatMuteCopy, type ChatMuteDuration } from '@duncit/utils';

import { PRESS_STYLE } from '@duncit/buttons-native';
import { ActionRow } from '@/components/host-manage/ActionRow';
import { RowGroup } from '@/components/host-manage/RowGroup';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';

interface Props {
  muted: boolean;
  /** ISO end of a timed mute; null while muted means Always. */
  mutedUntil: string | null;
  busy?: boolean;
  onChoose: (duration: ChatMuteDuration | null) => void;
}

/**
 * The bell at the top of a pod's, club's or support chat. The icon is the
 * muted state (bell vs bell-off); the sheet offers 8 hours, 1 week, Always and
 * Unmute. mWeb twin: components/chat-state/ChatMuteMenu.
 */
export function ChatMuteButton({ muted, mutedUntil, busy = false, onChoose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink } = useThemeColors();
  const copy = chatMuteCopy(t);
  const [open, setOpen] = useState(false);
  const until = mutedUntil
    ? t('mweb.chatRoom.mute.mutedUntil', { vars: { date: formatDateTime(mutedUntil) } })
    : null;

  const pick = (duration: ChatMuteDuration | null) => () => {
    setOpen(false);
    onChoose(duration);
  };

  return (
    <>
      <XStack
        testID="chat-mute-toggle"
        role="button"
        tabIndex={0}
        hitSlop={2}
        aria-label={muted ? [copy.mutedLabel, until].filter(Boolean).join('. ') : copy.menuLabel}
        aria-disabled={busy}
        onPress={busy ? undefined : () => setOpen(true)}
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
        borderRadius={20}
        backgroundColor="$surface"
        opacity={busy ? 0.5 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons
          name={muted ? 'notifications-off' : 'notifications-none'}
          size={22}
          color={ink}
        />
      </XStack>
      <DuncitDialog
        open={open}
        onClose={() => setOpen(false)}
        testID="chat-mute-sheet"
        title={muted ? (until ?? copy.mutedLabel) : copy.menuLabel}
        closeLabel={t('mweb.hostPodActions.close')}
      >
        <RowGroup>
          {CHAT_MUTE_DURATIONS.map((duration) => (
            <ActionRow
              key={duration}
              testID={`chat-mute-${duration}`}
              icon="notifications-off"
              label={copy.options[duration]}
              tint={ink}
              onPress={pick(duration)}
            />
          ))}
          {muted ? (
            <ActionRow
              testID="chat-mute-unmute"
              icon="notifications-active"
              label={copy.unmute}
              tint={ink}
              onPress={pick(null)}
            />
          ) : null}
        </RowGroup>
      </DuncitDialog>
    </>
  );
}
