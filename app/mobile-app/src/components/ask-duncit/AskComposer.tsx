import { useState } from 'react';
import { TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { voiceErrorKey, type AskDuncitAttachmentView } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AskIconButton } from './AskIconButton';
import { useAskAttachments } from './useAskAttachments';

type VoiceError = 'PERMISSION' | 'UNSUPPORTED' | 'FAILED';

interface Props {
  streaming: boolean;
  sending: boolean;
  maxChars: number;
  maxAttachments: number;
  voiceEnabled: boolean;
  recording: boolean;
  transcribing: boolean;
  onSend: (text: string, attachments: AskDuncitAttachmentView[]) => void;
  onStop: () => void;
  onRecordStart: () => Promise<VoiceError | null>;
  onRecordStop: () => Promise<string | null>;
}

/** The message box — the twin of mWeb's Composer: text, files, voice, send / stop. */
export function AskComposer(props: Readonly<Props>) {
  const { streaming, sending, maxChars, maxAttachments, voiceEnabled, recording, transcribing } =
    props;
  const { t } = useTranslation();
  const { muted, color: ink } = useThemeColors();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const files = useAskAttachments(maxAttachments, setError);
  const busy = sending || files.uploading || transcribing;
  const tooLong = text.length > maxChars;

  const send = () => {
    const body = text.trim();
    if ((!body && !files.items.length) || busy || tooLong || streaming) return;
    props.onSend(body, files.items);
    setText('');
    files.clear();
  };

  const toggleMic = async () => {
    if (!recording) {
      const refused = await props.onRecordStart();
      if (refused) setError(t(voiceErrorKey(refused)));
      return;
    }
    const heard = await props.onRecordStop();
    if (heard) setText((prev) => (prev ? `${prev} ${heard}` : heard));
    else setError(t('askDuncit.voice.error.FAILED'));
  };

  return (
    <YStack paddingHorizontal={12} paddingBottom={12} gap={6} testID="ask-duncit-composer">
      {error ? (
        <Text fontSize={12} color="$danger" role="alert" onPress={() => setError(null)}>
          {error}
        </Text>
      ) : null}
      {files.items.length > 0 && (
        <XStack flexWrap="wrap" gap={6}>
          {files.items.map((file) => (
            <XStack
              key={file.url}
              alignItems="center"
              gap={4}
              backgroundColor="$soft"
              borderRadius={999}
              paddingLeft={8}
              paddingRight={2}
            >
              <MaterialIcons name="insert-drive-file" size={14} color={muted} />
              <Text fontSize={12} color="$color" numberOfLines={1} maxWidth={140}>
                {file.name}
              </Text>
              <AskIconButton
                icon="close"
                size={14}
                label={t('mweb.common.removeAttachment')}
                onPress={() => files.remove(file.url)}
              />
            </XStack>
          ))}
        </XStack>
      )}
      <XStack alignItems="flex-end" gap={4}>
        {maxAttachments > 0 && (
          <AskIconButton
            icon="attach-file"
            label={t('askDuncit.composer.attach')}
            busy={files.uploading}
            disabled={busy || files.items.length >= maxAttachments}
            onPress={() => {
              files.pick().catch(() => undefined);
            }}
          />
        )}
        <YStack
          flex={1}
          borderWidth={1}
          borderColor={tooLong ? '$danger' : '$inputBorder'}
          borderRadius={20}
          paddingHorizontal={14}
          paddingVertical={8}
        >
          <TextInput
            testID="ask-duncit-input"
            accessibilityLabel={t('askDuncit.composer.label')}
            value={text}
            onChangeText={setText}
            placeholder={t(
              recording ? 'askDuncit.voice.listening' : 'askDuncit.composer.placeholder',
            )}
            placeholderTextColor={muted}
            multiline
            style={{ maxHeight: 120, color: ink, fontSize: 15 }}
          />
        </YStack>
        {voiceEnabled && (
          <AskIconButton
            icon="mic-none"
            label={t(recording ? 'askDuncit.voice.stop' : 'askDuncit.voice.start')}
            active={recording}
            busy={transcribing}
            onPress={() => {
              toggleMic().catch(() => undefined);
            }}
          />
        )}
        {streaming ? (
          <AskIconButton
            testID="ask-duncit-stop"
            icon="stop"
            filled
            label={t('askDuncit.composer.stop')}
            onPress={props.onStop}
          />
        ) : (
          <AskIconButton
            testID="ask-duncit-send"
            icon="send"
            filled
            busy={sending}
            disabled={busy || tooLong || (!text.trim() && !files.items.length)}
            label={t('askDuncit.composer.send')}
            onPress={send}
          />
        )}
      </XStack>
      {tooLong && (
        <Text fontSize={12} color="$danger">
          {t('askDuncit.composer.tooLong')}
        </Text>
      )}
    </YStack>
  );
}
