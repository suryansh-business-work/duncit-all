import { useState } from 'react';
import { TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { TicketAttachments } from '@/components/support/TicketAttachments';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  /** Locked (reply hidden) once the ticket is resolved/closed (B7). */
  locked: boolean;
  busy: boolean;
  /** Resolves true when the reply was sent — only then are inputs cleared. */
  onSend: (text: string, attachments: string[]) => Promise<boolean>;
}

const RESOLVED_NOTE = 'This conversation has been marked as resolved.';

/** Ticket reply row with file attachments, or the locked "resolved" note (B7). */
export function TicketComposer({ locked, busy, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted, onPrimary, color: ink } = useThemeColors();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  if (locked) {
    return (
      <Text
        testID="ticket-resolved-note"
        fontSize={12}
        color="$muted"
        textAlign="center"
        padding={8}
      >
        {RESOLVED_NOTE}
      </Text>
    );
  }

  const submit = async () => {
    if (busy || (!text.trim() && attachments.length === 0)) return;
    const sent = await onSend(text.trim(), attachments);
    if (sent) {
      setText('');
      setAttachments([]);
    }
  };

  return (
    <YStack gap={8} padding={12}>
      <TicketAttachments attachments={attachments} onChange={setAttachments} />
      <XStack gap={8} alignItems="center">
        <XStack
          flex={1}
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius={22}
          paddingHorizontal={14}
          alignItems="center"
          minHeight={42}
        >
          <TextInput
            testID="ticket-reply-input"
            value={text}
            onChangeText={setText}
            placeholder={t('mweb.common.writeAReply')}
            placeholderTextColor={muted}
            style={{ flex: 1, color: ink, paddingVertical: 8 }}
            multiline
          />
        </XStack>
        <XStack
          testID="ticket-reply-send"
          role="button"
          aria-label={t('mweb.ticketDetails.sendReply')}
          onPress={() => void submit()}
          width={42}
          height={42}
          alignItems="center"
          justifyContent="center"
          borderRadius={21}
          backgroundColor="$primary"
          opacity={busy ? 0.6 : 1}
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons name="send" size={18} color={onPrimary} />
        </XStack>
      </XStack>
    </YStack>
  );
}
